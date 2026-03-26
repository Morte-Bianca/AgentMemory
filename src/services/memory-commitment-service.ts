import type { StoreAdapter } from '../storage';
import type { MemoryCommitmentRecord, MemoryRecord } from '../types';
import { config } from '../config';
import { createId } from './id';
import { stableStringify } from './commitments/stable-json';
import { decryptUtf8Aes256Gcm, encryptUtf8Aes256Gcm, sha256Hex } from './commitments/crypto';
import { PinataClient } from './commitments/pinata';
import { commitToEvm, verifyEvmCommit, verifyEvmContractCommit } from './commitments/evm';
import { commitToSolana, verifySolanaMemoCommit, verifySolanaProgramCommit } from './commitments/solana';
import { fetchJsonFromIpfsGateway } from './commitments/ipfs';

function nowIso(): string {
  return new Date().toISOString();
}

function truncateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 2000 ? `${message.slice(0, 2000)}…` : message;
}

function buildPlaintextPayload(memory: MemoryRecord): unknown {
  return {
    v: 1,
    memory: {
      id: memory.id,
      agentId: memory.agentId,
      sessionId: memory.sessionId,
      type: memory.type,
      content: memory.content,
      summary: memory.summary,
      tags: memory.tags,
      importance: memory.importance,
      source: memory.source,
      createdAt: memory.createdAt,
      metadata: memory.metadata,
    },
  };
}

export class MemoryCommitmentService {
  private readonly pinata: PinataClient | null;

  constructor(private readonly store: StoreAdapter) {
    if (!config.memoryCommitments.enabled) {
      this.pinata = null;
      return;
    }

    const pinataCfg = config.memoryCommitments.pinata;
    this.pinata = new PinataClient({
      jwt: pinataCfg.jwt,
      apiKey: pinataCfg.apiKey,
      apiSecret: pinataCfg.apiSecret,
      pinNamePrefix: pinataCfg.pinNamePrefix,
      pinGroupId: pinataCfg.pinGroupId,
    });
  }

  enqueue(memory: MemoryRecord): void {
    if (!config.memoryCommitments.enabled) {
      return;
    }

    const createdAt = nowIso();
    const plaintextPayload = buildPlaintextPayload(memory);
    const plaintextJson = stableStringify(plaintextPayload);
    const contentHash = sha256Hex(plaintextJson);

    let encrypted;
    let encryptedHash;
    try {
      const encryptedResult = encryptUtf8Aes256Gcm(plaintextJson, config.memoryCommitments.encryptionKeyBase64);
      encrypted = encryptedResult.encrypted;
      encryptedHash = encryptedResult.encryptedHashHex;
    } catch (error) {
      const record: MemoryCommitmentRecord = {
        id: createId('mcm'),
        agentId: memory.agentId,
        memoryId: memory.id,
        storageProvider: 'pinata',
        contentHash,
        encryptedHash: '0'.repeat(64),
        storageStatus: 'failed',
        evmStatus: config.memoryCommitments.evm.enabled ? 'failed' : 'disabled',
        solanaStatus: config.memoryCommitments.solana.enabled ? 'failed' : 'disabled',
        lastError: truncateError(error),
        createdAt,
        updatedAt: createdAt,
      };
      void this.store.putMemoryCommitment(record);
      return;
    }

    const record: MemoryCommitmentRecord = {
      id: createId('mcm'),
      agentId: memory.agentId,
      memoryId: memory.id,
      storageProvider: 'pinata',
      contentHash,
      encryptedHash,
      storageStatus: 'pending',
      evmStatus: config.memoryCommitments.evm.enabled ? 'pending' : 'disabled',
      evmChainId: config.memoryCommitments.evm.chainId,
      solanaStatus: config.memoryCommitments.solana.enabled ? 'pending' : 'disabled',
      createdAt,
      updatedAt: createdAt,
    };

    void this.store.putMemoryCommitment(record).then(() => {
      setImmediate(() => {
        void this.process({ memory, encrypted, record }).catch(() => {
          // errors are persisted per-step
        });
      });
    });
  }

  async get(memoryId: string): Promise<MemoryCommitmentRecord | null> {
    return this.store.getMemoryCommitment(memoryId);
  }

  async listByAgent(agentId: string, opts?: { limit?: number }): Promise<MemoryCommitmentRecord[]> {
    return this.store.listMemoryCommitmentsByAgent(agentId, opts);
  }

  async backfillAgent(
    agentId: string,
    opts?: {
      limit?: number;
      includeFailed?: boolean;
      verify?: boolean;
      cursor?: { createdAt: string; id: string };
    },
  ): Promise<{
    agentId: string;
    requested: number;
    cursor?: { createdAt: string; id: string };
    nextCursor: { createdAt: string; id: string } | null;
    processed: number;
    skipped: number;
    results: Array<{
      memoryId: string;
      commitment: MemoryCommitmentRecord;
      verification?: Awaited<ReturnType<MemoryCommitmentService['verify']>>;
    }>;
  }> {
    if (!config.memoryCommitments.enabled) {
      throw new Error('Memory commitments are disabled');
    }
    if (!this.pinata) {
      throw new Error('Pinata is not configured');
    }

    const limit = Math.max(1, Math.min(opts?.limit ?? 2, 5));
    const includeFailed = opts?.includeFailed ?? true;
    const shouldVerify = opts?.verify ?? true;

    const cursor = opts?.cursor;

    const candidates = this.store.listCommitmentBackfillCandidates
      ? await this.store.listCommitmentBackfillCandidates(agentId, {
          limit,
          cursor,
          includeFailed,
          requireEvmTxHash: config.memoryCommitments.evm.enabled,
          requireSolanaSignature: config.memoryCommitments.solana.enabled,
        })
      : null;

    const agentMemories = candidates
      ? candidates.map((c) => c.memory)
      : (await this.store.read()).memories
          .filter((m) => m.agentId === agentId)
          .sort((a, b) => (a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt)))
          .filter((m) => {
            if (!cursor) {
              return true;
            }
            return m.createdAt > cursor.createdAt || (m.createdAt === cursor.createdAt && m.id > cursor.id);
          });

    const results: Array<{
      memoryId: string;
      commitment: MemoryCommitmentRecord;
      verification?: Awaited<ReturnType<MemoryCommitmentService['verify']>>;
    }> = [];

    let processed = 0;
    let skipped = 0;

    let lastSeen: { createdAt: string; id: string } | null = null;

    for (const memory of agentMemories) {
      if (processed >= limit) {
        break;
      }

      lastSeen = { createdAt: memory.createdAt, id: memory.id };

      const existing = candidates
        ? (candidates.find((c) => c.memory.id === memory.id)?.commitment ?? null)
        : await this.store.getMemoryCommitment(memory.id);
      const fullyDone =
        existing &&
        existing.agentId === agentId &&
        existing.storageStatus === 'uploaded' &&
        Boolean(existing.cid) &&
        (!config.memoryCommitments.evm.enabled || Boolean(existing.evmTxHash)) &&
        (!config.memoryCommitments.solana.enabled || Boolean(existing.solanaSignature));

      if (fullyDone) {
        skipped += 1;
        continue;
      }

      const failedAlready =
        existing &&
        (existing.storageStatus === 'failed' || existing.evmStatus === 'failed' || existing.solanaStatus === 'failed');

      if (existing && failedAlready && !includeFailed) {
        skipped += 1;
        continue;
      }

      const createdAt = existing?.createdAt ?? nowIso();
      const plaintextJson = stableStringify(buildPlaintextPayload(memory));
      const contentHash = sha256Hex(plaintextJson);

      const encryptedResult = encryptUtf8Aes256Gcm(plaintextJson, config.memoryCommitments.encryptionKeyBase64);
      const encrypted = encryptedResult.encrypted;

      const record: MemoryCommitmentRecord = {
        id: existing?.id ?? createId('mcm'),
        agentId: memory.agentId,
        memoryId: memory.id,
        storageProvider: 'pinata',
        contentHash,
        encryptedHash: encryptedResult.encryptedHashHex,
        cid: existing?.cid,
        storageStatus: existing?.storageStatus ?? 'pending',
        evmStatus: existing?.evmStatus ?? (config.memoryCommitments.evm.enabled ? 'pending' : 'disabled'),
        evmChainId: existing?.evmChainId ?? config.memoryCommitments.evm.chainId,
        evmTo: existing?.evmTo,
        evmTxHash: existing?.evmTxHash,
        solanaStatus: existing?.solanaStatus ?? (config.memoryCommitments.solana.enabled ? 'pending' : 'disabled'),
        solanaSignature: existing?.solanaSignature,
        lastError: undefined,
        createdAt,
        updatedAt: nowIso(),
      };

      await this.store.putMemoryCommitment(record);
      await this.process({ memory, encrypted, record, waitForEvmReceipt: shouldVerify });

      const commitment = await this.store.getMemoryCommitment(memory.id);
      if (!commitment) {
        // should never happen
        skipped += 1;
        continue;
      }

      const verification = shouldVerify ? await this.verify(agentId, memory.id) : undefined;
      results.push({ memoryId: memory.id, commitment, ...(verification ? { verification } : {}) });
      processed += 1;
    }

    return {
      agentId,
      requested: limit,
      ...(cursor ? { cursor } : {}),
      nextCursor: lastSeen,
      processed,
      skipped,
      results,
    };
  }

  async verify(agentId: string, memoryId: string): Promise<{
    commitment: MemoryCommitmentRecord;
    contentHash: { expected: string; actualFromDbMemory?: string; matches: boolean; error?: string };
    ipfs: {
      cid?: string;
      ok: boolean;
      pinnedContentHash?: string;
      pinnedEncryptedHash?: string;
      encryptedHashMatches: boolean;
      contentHashMatches: boolean;
      decryptOk: boolean;
      decryptedContentHash?: string;
      error?: string;
    };
    evm?: {
      ok: boolean;
      txHash?: string;
      observedTo?: string;
      observedPayloadUtf8?: string;
      observedContentHashHex?: string;
      observedCidHashHex?: string;
      observedCommitter?: string;
      error?: string;
    };
    solana?: {
      ok: boolean;
      signature?: string;
      observedMemos?: string[];
      pda?: string;
      observedContentHashHex?: string;
      observedCidHashHex?: string;
      observedCommitter?: string;
      error?: string;
    };
  }> {
    const commitment = await this.store.getMemoryCommitment(memoryId);
    if (!commitment || commitment.agentId !== agentId) {
      throw new Error('Commitment not found');
    }

    const memory = await this.store.getMemoryById(memoryId);
    let actualFromDbMemory: string | undefined;
    let matches = false;
    let contentHashError: string | undefined;

    try {
      if (!memory) {
        throw new Error('Memory not found (cannot recompute content hash)');
      }
      if (memory.agentId !== agentId) {
        throw new Error('Memory agent mismatch');
      }

      const plaintextJson = stableStringify(buildPlaintextPayload(memory));
      actualFromDbMemory = sha256Hex(plaintextJson);
      matches = actualFromDbMemory === commitment.contentHash;
    } catch (error) {
      contentHashError = truncateError(error);
    }

    // IPFS verification (CID content + encrypted hash)
    let ipfsOk = false;
    let pinnedContentHash: string | undefined;
    let pinnedEncryptedHash: string | undefined;
    let encryptedHashMatches = false;
    let contentHashMatches = false;
    let decryptOk = false;
    let decryptedContentHash: string | undefined;
    let ipfsError: string | undefined;

    if (commitment.cid) {
      try {
        const pinned = await fetchJsonFromIpfsGateway<any>({
          gatewayBaseUrl: config.memoryCommitments.ipfsGatewayBaseUrl,
          cid: commitment.cid,
        });

        pinnedContentHash = typeof pinned?.contentHash === 'string' ? pinned.contentHash : undefined;
        pinnedEncryptedHash = typeof pinned?.encryptedHash === 'string' ? pinned.encryptedHash : undefined;

        const enc = pinned?.encrypted;
        if (!enc || typeof enc !== 'object') {
          throw new Error('Pinned JSON missing encrypted blob');
        }

        const iv = Buffer.from(String((enc as any).ivB64 || ''), 'base64');
        const ciphertext = Buffer.from(String((enc as any).ciphertextB64 || ''), 'base64');
        const tag = Buffer.from(String((enc as any).tagB64 || ''), 'base64');
        if (iv.length === 0 || ciphertext.length === 0 || tag.length === 0) {
          throw new Error('Pinned encrypted blob fields invalid');
        }

        const computedEncryptedHash = sha256Hex(Buffer.concat([iv, ciphertext, tag]));
        encryptedHashMatches = computedEncryptedHash === commitment.encryptedHash;
        contentHashMatches = pinnedContentHash ? pinnedContentHash === commitment.contentHash : false;

        try {
          const decrypted = decryptUtf8Aes256Gcm(
            {
              v: 1,
              alg: 'AES-256-GCM',
              ivB64: String((enc as any).ivB64 || ''),
              ciphertextB64: String((enc as any).ciphertextB64 || ''),
              tagB64: String((enc as any).tagB64 || ''),
            },
            config.memoryCommitments.encryptionKeyBase64,
          );

          decryptedContentHash = sha256Hex(decrypted);
          decryptOk = Boolean(pinnedContentHash) && decryptedContentHash === pinnedContentHash;
        } catch {
          decryptOk = false;
        }

        ipfsOk = encryptedHashMatches && contentHashMatches && decryptOk;
      } catch (error) {
        ipfsError = truncateError(error);
      }
    } else {
      ipfsError = 'No CID recorded';
    }

    const expectedPayload = `am1|${commitment.contentHash}|${commitment.cid ?? ''}|${memoryId}`;

    const configuredEvmContract = config.memoryCommitments.evm.contractAddress?.trim();
    const recordEvmTo = commitment.evmTo?.trim();
    const shouldVerifyEvmViaContract = Boolean(
      configuredEvmContract && recordEvmTo && recordEvmTo.toLowerCase() === configuredEvmContract.toLowerCase(),
    );

    const evm = commitment.evmTxHash
      ? shouldVerifyEvmViaContract
        ? await (async () => {
            // Avoid false negatives right after submission: if receipt is missing, treat as pending.
            const rpcUrl = config.memoryCommitments.evm.rpcUrl.trim();
            if (rpcUrl) {
              const { ethers } = await import('ethers');
              const provider = config.memoryCommitments.evm.chainId
                ? new ethers.JsonRpcProvider(rpcUrl, config.memoryCommitments.evm.chainId)
                : new ethers.JsonRpcProvider(rpcUrl);
              const receipt = await provider.getTransactionReceipt(commitment.evmTxHash!);
              // If receipt is missing, it might still be pending OR tx could be replaced.
              // Contract verification is the source of truth, so we only surface "pending" if
              // the contract read also fails.
              if (!receipt) {
                const contractCheck = await verifyEvmContractCommit({
                  cfg: {
                    rpcUrl: config.memoryCommitments.evm.rpcUrl,
                    chainId: config.memoryCommitments.evm.chainId,
                    contractAddress: configuredEvmContract,
                  },
                  agentId,
                  memoryId,
                  expectedContentHashHex: commitment.contentHash,
                  expectedCid: commitment.cid ?? '',
                });

                return contractCheck.ok
                  ? contractCheck
                  : { ok: false, error: 'EVM transaction pending (receipt not found yet)' };
              }
              if ((receipt as any).status === 0) {
                return { ok: false, error: 'EVM transaction reverted' };
              }
            }

            return verifyEvmContractCommit({
              cfg: {
                rpcUrl: config.memoryCommitments.evm.rpcUrl,
                chainId: config.memoryCommitments.evm.chainId,
                contractAddress: configuredEvmContract,
              },
              agentId,
              memoryId,
              expectedContentHashHex: commitment.contentHash,
              expectedCid: commitment.cid ?? '',
            });
          })()
        : await verifyEvmCommit({
            cfg: { rpcUrl: config.memoryCommitments.evm.rpcUrl, chainId: config.memoryCommitments.evm.chainId },
            txHash: commitment.evmTxHash,
            expectedTo: commitment.evmTo,
            expectedPayloadUtf8: expectedPayload,
          })
      : undefined;

    const configuredSolanaProgram = config.memoryCommitments.solana.programId?.trim();
    const solana = commitment.solanaSignature
      ? configuredSolanaProgram
        ? await verifySolanaProgramCommit({
            rpcUrl: config.memoryCommitments.solana.rpcUrl,
            programId: configuredSolanaProgram,
            agentId,
            memoryId,
            expectedContentHashHex: commitment.contentHash,
            expectedCid: commitment.cid ?? '',
          })
        : await verifySolanaMemoCommit({
            rpcUrl: config.memoryCommitments.solana.rpcUrl,
            signature: commitment.solanaSignature,
            expectedMemoUtf8: expectedPayload,
          })
      : undefined;

    return {
      commitment,
      contentHash: {
        expected: commitment.contentHash,
        actualFromDbMemory,
        matches,
        ...(contentHashError ? { error: contentHashError } : {}),
      },
      ipfs: {
        cid: commitment.cid,
        ok: ipfsOk,
        pinnedContentHash,
        pinnedEncryptedHash,
        encryptedHashMatches,
        contentHashMatches,
        decryptOk,
        decryptedContentHash,
        ...(ipfsError ? { error: ipfsError } : {}),
      },
      ...(evm
        ? {
            evm: {
              ok: evm.ok,
              txHash: commitment.evmTxHash,
              // legacy verifier fields
              observedTo: (evm as any).observedTo,
              observedPayloadUtf8: (evm as any).observedPayloadUtf8,
              // contract verifier fields
              observedContentHashHex: (evm as any).observedContentHashHex,
              observedCidHashHex: (evm as any).observedCidHashHex,
              observedCommitter: (evm as any).observedCommitter,
              ...((evm as any).error ? { error: (evm as any).error } : {}),
            },
          }
        : {}),
      ...(solana
        ? {
            solana: {
              ok: solana.ok,
              signature: commitment.solanaSignature,
              // memo verifier fields
              observedMemos: (solana as any).observedMemos,
              // program verifier fields
              pda: (solana as any).pda,
              observedContentHashHex: (solana as any).observedContentHashHex,
              observedCidHashHex: (solana as any).observedCidHashHex,
              observedCommitter: (solana as any).observedCommitter,
              ...((solana as any).error ? { error: (solana as any).error } : {}),
            },
          }
        : {}),
    };
  }

  private async process(input: {
    memory: MemoryRecord;
    encrypted: unknown;
    record: MemoryCommitmentRecord;
    waitForEvmReceipt?: boolean;
  }) {
    const { memory } = input;
    let record = input.record;

    if (!this.pinata) {
      return;
    }

    // 1) Upload encrypted payload to IPFS via Pinata (resumable)
    if (record.cid && record.storageStatus === 'uploaded') {
      // no-op
    } else {
      try {
        const pin = await this.pinata.pinJson(
          {
            v: 1,
            encrypted: input.encrypted,
            meta: {
              memoryId: memory.id,
              agentId: memory.agentId,
              createdAt: memory.createdAt,
            },
            contentHash: record.contentHash,
            encryptedHash: record.encryptedHash,
          },
          { name: `memory:${memory.id}` },
        );

        record = {
          ...record,
          cid: pin.cid,
          storageStatus: 'uploaded',
          updatedAt: nowIso(),
          lastError: undefined,
        };
        await this.store.putMemoryCommitment(record);
      } catch (error) {
        record = {
          ...record,
          storageStatus: 'failed',
          updatedAt: nowIso(),
          lastError: truncateError(error),
        };
        await this.store.putMemoryCommitment(record);
        return;
      }
    }

    // 2) Commit to EVM (resumable)
    if (config.memoryCommitments.evm.enabled && !record.evmTxHash) {
      if (!record.cid) {
        record = {
          ...record,
          evmStatus: 'failed',
          updatedAt: nowIso(),
          lastError: 'Missing CID; cannot commit to EVM',
        };
        await this.store.putMemoryCommitment(record);
      } else {
        try {
          const evm = await commitToEvm({
            cfg: {
              rpcUrl: config.memoryCommitments.evm.rpcUrl,
              chainId: config.memoryCommitments.evm.chainId,
              privateKey: config.memoryCommitments.evm.privateKey,
              contractAddress: config.memoryCommitments.evm.contractAddress || undefined,
              toAddress: config.memoryCommitments.evm.toAddress || undefined,
            },
            agentId: memory.agentId,
            contentHashHex: record.contentHash,
            cid: record.cid,
            memoryId: memory.id,
            waitForReceipt: Boolean(input.waitForEvmReceipt),
            confirmations: 1,
            timeoutMs: 25_000,
          });

          record = {
            ...record,
            evmStatus: input.waitForEvmReceipt ? 'confirmed' : 'submitted',
            evmTxHash: evm.txHash,
            evmTo: evm.to,
            evmChainId: evm.chainId,
            updatedAt: nowIso(),
            lastError: undefined,
          };
          await this.store.putMemoryCommitment(record);
        } catch (error) {
          record = {
            ...record,
            evmStatus: 'failed',
            updatedAt: nowIso(),
            lastError: truncateError(error),
          };
          await this.store.putMemoryCommitment(record);
        }
      }
    }

    // 3) Commit to Solana (resumable)
    if (config.memoryCommitments.solana.enabled && !record.solanaSignature) {
      if (!record.cid) {
        record = {
          ...record,
          solanaStatus: 'failed',
          updatedAt: nowIso(),
          lastError: 'Missing CID; cannot commit to Solana',
        };
        await this.store.putMemoryCommitment(record);
      } else {
        try {
          const sol = await commitToSolana({
            rpcUrl: config.memoryCommitments.solana.rpcUrl,
            programId: config.memoryCommitments.solana.programId || undefined,
            secretKey: config.memoryCommitments.solana.secretKey,
            agentId: memory.agentId,
            contentHashHex: record.contentHash,
            cid: record.cid,
            memoryId: memory.id,
          });

          record = {
            ...record,
            solanaStatus: 'submitted',
            solanaSignature: sol.signature,
            updatedAt: nowIso(),
            lastError: undefined,
          };
          await this.store.putMemoryCommitment(record);
        } catch (error) {
          record = {
            ...record,
            solanaStatus: 'failed',
            updatedAt: nowIso(),
            lastError: truncateError(error),
          };
          await this.store.putMemoryCommitment(record);
        }
      }
    }
  }
}
