import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { createHash } from 'node:crypto';
import bs58 from 'bs58';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

function sha256BytesUtf8(input: string): Buffer {
  return createHash('sha256').update(Buffer.from(input, 'utf8')).digest();
}

function hexTo32Bytes(hex: string): Buffer {
  const trimmed = hex.trim().toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{64}$/.test(trimmed)) {
    throw new Error('Expected 32-byte hex (64 chars)');
  }
  return Buffer.from(trimmed, 'hex');
}

function parseSecretKey(input: string): Uint8Array {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('SOLANA_SECRET_KEY is required when MEMORY_COMMITMENTS_SOLANA_ENABLED=true');
  }

  if (trimmed.startsWith('[')) {
    const arr = JSON.parse(trimmed) as number[];
    return Uint8Array.from(arr);
  }

  // base64 or base58 fallback
  const base64 = Uint8Array.from(Buffer.from(trimmed, 'base64'));
  if (base64.length === 64) {
    return base64;
  }

  try {
    const base58 = bs58.decode(trimmed);
    if (base58.length === 64) {
      return Uint8Array.from(base58);
    }
  } catch {
    // ignore
  }

  throw new Error('SOLANA_SECRET_KEY must be a JSON array, base64, or base58-encoded 64-byte secret key');
}

export async function commitToSolana(input: {
  rpcUrl: string;
  programId?: string;
  secretKey: string;
  agentId: string;
  contentHashHex: string;
  cid: string;
  memoryId: string;
}): Promise<{ signature: string }>
{
  const rpcUrl = input.rpcUrl.trim();
  if (!rpcUrl) {
    throw new Error('SOLANA_RPC_URL is required when MEMORY_COMMITMENTS_SOLANA_ENABLED=true');
  }

  const keypair = Keypair.fromSecretKey(parseSecretKey(input.secretKey));
  const connection = new Connection(rpcUrl, 'confirmed');

  // Preferred mode: commitment program (PDA account)
  const programIdRaw = input.programId?.trim();
  if (programIdRaw) {
    const programId = new PublicKey(programIdRaw);

    const agentHash = sha256BytesUtf8(input.agentId);
    const memoryHash = sha256BytesUtf8(input.memoryId);
    const contentHash = hexTo32Bytes(input.contentHashHex);
    const cidHash = sha256BytesUtf8(input.cid);

    const [pda] = PublicKey.findProgramAddressSync([
      Buffer.from('am1', 'utf8'),
      agentHash,
      memoryHash,
    ], programId);

    const data = Buffer.concat([
      Buffer.from('AMCM', 'utf8'),
      Buffer.from([1]),
      agentHash,
      memoryHash,
      contentHash,
      cidHash,
    ]);

    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: pda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(connection, tx, [keypair], { commitment: 'confirmed' });
    return { signature };
  }

  // Legacy mode: Memo program
  const memo = `am1|${input.contentHashHex}|${input.cid}|${input.memoryId}`;

  const ix = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [],
    data: Buffer.from(memo, 'utf8'),
  });

  const tx = new Transaction().add(ix);
  const signature = await sendAndConfirmTransaction(connection, tx, [keypair], { commitment: 'confirmed' });
  return { signature };
}

export async function verifySolanaProgramCommit(input: {
  rpcUrl: string;
  programId: string;
  agentId: string;
  memoryId: string;
  expectedContentHashHex: string;
  expectedCid: string;
}): Promise<{
  ok: boolean;
  pda?: string;
  observedContentHashHex?: string;
  observedCidHashHex?: string;
  observedCommitter?: string;
  error?: string;
}> {
  try {
    const rpcUrl = input.rpcUrl.trim();
    if (!rpcUrl) {
      return { ok: false, error: 'SOLANA_RPC_URL missing (cannot verify)' };
    }

    const connection = new Connection(rpcUrl, 'confirmed');
    const programId = new PublicKey(input.programId.trim());

    const agentHash = sha256BytesUtf8(input.agentId);
    const memoryHash = sha256BytesUtf8(input.memoryId);
    const [pda] = PublicKey.findProgramAddressSync([
      Buffer.from('am1', 'utf8'),
      agentHash,
      memoryHash,
    ], programId);

    const acc = await connection.getAccountInfo(pda, 'confirmed');
    if (!acc || !acc.data) {
      return { ok: false, pda: pda.toBase58(), error: 'Commitment account not found' };
    }
    if (acc.data.length < 113) {
      return { ok: false, pda: pda.toBase58(), error: 'Commitment account data too short' };
    }

    const v = acc.data[0];
    if (v !== 1) {
      return { ok: false, pda: pda.toBase58(), error: `Unexpected account version: ${v}` };
    }

    const observedContentHashHex = Buffer.from(acc.data.subarray(1, 33)).toString('hex');
    const observedCidHashHex = Buffer.from(acc.data.subarray(33, 65)).toString('hex');
    const observedCommitter = new PublicKey(acc.data.subarray(65, 97)).toBase58();

    const expectedContent = input.expectedContentHashHex.trim().toLowerCase().replace(/^0x/, '');
    const expectedCidHashHex = sha256BytesUtf8(input.expectedCid).toString('hex');

    const ok = observedContentHashHex === expectedContent && observedCidHashHex === expectedCidHashHex;
    return {
      ok,
      pda: pda.toBase58(),
      observedContentHashHex,
      observedCidHashHex,
      observedCommitter,
      ...(ok ? {} : { error: 'Program commitment mismatch' }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

function coerceMemoText(parsed: unknown): string | null {
  if (typeof parsed === 'string') {
    return parsed;
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.memo === 'string') {
    return obj.memo;
  }

  const info = obj.info;
  if (info && typeof info === 'object' && typeof (info as any).memo === 'string') {
    return (info as any).memo;
  }

  return null;
}

export async function verifySolanaMemoCommit(input: {
  rpcUrl: string;
  signature: string;
  expectedMemoUtf8: string;
}): Promise<{ ok: boolean; observedMemos: string[]; error?: string }> {
  try {
    const rpcUrl = input.rpcUrl.trim();
    if (!rpcUrl) {
      return { ok: false, observedMemos: [], error: 'SOLANA_RPC_URL missing (cannot verify)' };
    }

    const connection = new Connection(rpcUrl, 'confirmed');
    const tx = await connection.getParsedTransaction(input.signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return { ok: false, observedMemos: [], error: 'Transaction not found' };
    }

    const observedMemos: string[] = [];
    for (const ix of tx.transaction.message.instructions) {
      if ('program' in ix && (ix as any).program === 'spl-memo') {
        const memo = coerceMemoText((ix as any).parsed);
        if (memo) {
          observedMemos.push(memo);
        }
      }
    }

    const ok = observedMemos.includes(input.expectedMemoUtf8);
    return ok
      ? { ok: true, observedMemos }
      : { ok: false, observedMemos, error: observedMemos.length ? 'Memo mismatch' : 'No parsed memo found' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, observedMemos: [], error: message };
  }
}
