import { ethers } from 'ethers';

export interface EvmCommitConfig {
  rpcUrl: string;
  chainId?: number;
  privateKey: string;
  contractAddress?: string;
  toAddress?: string;
}

async function waitForFinalizedTransaction(input: {
  tx: ethers.TransactionResponse;
  confirmations: number;
  timeoutMs?: number;
}): Promise<{ txHash: string; receipt: ethers.TransactionReceipt }> {
  try {
    const receipt = await (input.tx as any).wait(input.confirmations, input.timeoutMs);
    if (!receipt) {
      throw new Error('Transaction not mined (no receipt)');
    }
    return { txHash: input.tx.hash, receipt };
  } catch (error: any) {
    // Ethers can throw on replacement; capture the replacement hash + receipt when available.
    if (error?.code === 'TRANSACTION_REPLACED' && error?.replacement) {
      const replacement = error.replacement as ethers.TransactionResponse;
      const receipt = (error.receipt as ethers.TransactionReceipt | undefined) ??
        (await (replacement as any).wait(input.confirmations, input.timeoutMs));
      if (!receipt) {
        throw new Error('Transaction replaced but no receipt');
      }
      return { txHash: replacement.hash, receipt };
    }
    throw error;
  }
}

export async function commitToEvm(input: {
  cfg: EvmCommitConfig;
  agentId: string;
  contentHashHex: string;
  cid: string;
  memoryId: string;
  waitForReceipt?: boolean;
  confirmations?: number;
  timeoutMs?: number;
}): Promise<{ txHash: string; to: string; chainId?: number }> {
  const rpcUrl = input.cfg.rpcUrl.trim();
  const privateKey = input.cfg.privateKey.trim();
  const contractAddress = input.cfg.contractAddress?.trim();

  if (!rpcUrl) {
    throw new Error('EVM_RPC_URL is required when MEMORY_COMMITMENTS_EVM_ENABLED=true');
  }
  if (!privateKey) {
    throw new Error('EVM_PRIVATE_KEY is required when MEMORY_COMMITMENTS_EVM_ENABLED=true');
  }

  const provider = input.cfg.chainId
    ? new ethers.JsonRpcProvider(rpcUrl, input.cfg.chainId)
    : new ethers.JsonRpcProvider(rpcUrl);

  const wallet = new ethers.Wallet(privateKey, provider);

  const confirmations = Math.max(1, Math.floor(input.confirmations ?? 1));
  const waitForReceipt = Boolean(input.waitForReceipt);
  const timeoutMs = input.timeoutMs;

  // Preferred mode: commit via registry contract
  if (contractAddress) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) {
      throw new Error('EVM_CONTRACT_ADDRESS must be a valid 0x-prefixed address');
    }

    if (!/^[0-9a-fA-F]{64}$/.test(input.contentHashHex)) {
      throw new Error('contentHashHex must be 32 bytes hex (64 chars)');
    }

    const abi = [
      'function commit(string agentId,string memoryId,bytes32 contentHash,string cid) external',
      'function getCommitment(string agentId,string memoryId) external view returns (tuple(bytes32 contentHash,bytes32 cidHash,address committer,uint64 blockNumber,uint64 timestamp))',
    ];

    const contract = new ethers.Contract(contractAddress, abi, wallet);
    const tx = await contract.commit(input.agentId, input.memoryId, `0x${input.contentHashHex}`, input.cid);

    if (waitForReceipt) {
      const finalized = await waitForFinalizedTransaction({ tx, confirmations, timeoutMs });
      if ((finalized.receipt as any).status === 0) {
        throw new Error(`EVM transaction reverted: ${finalized.txHash}`);
      }
      return { txHash: finalized.txHash, to: contractAddress, chainId: input.cfg.chainId };
    }

    return { txHash: tx.hash, to: contractAddress, chainId: input.cfg.chainId };
  }

  // Legacy mode: 0-value tx with utf8 data payload
  const to = (input.cfg.toAddress?.trim() || wallet.address).trim();

  const payload = `am1|${input.contentHashHex}|${input.cid}|${input.memoryId}`;
  const data = ethers.hexlify(ethers.toUtf8Bytes(payload));

  const tx = await wallet.sendTransaction({
    to,
    value: 0n,
    data,
  });

  if (waitForReceipt) {
    const finalized = await waitForFinalizedTransaction({ tx, confirmations, timeoutMs });
    if ((finalized.receipt as any).status === 0) {
      throw new Error(`EVM transaction reverted: ${finalized.txHash}`);
    }
    return { txHash: finalized.txHash, to, chainId: input.cfg.chainId };
  }

  return { txHash: tx.hash, to, chainId: input.cfg.chainId };
}

export async function verifyEvmContractCommit(input: {
  cfg: Pick<EvmCommitConfig, 'rpcUrl' | 'chainId' | 'contractAddress'>;
  agentId: string;
  memoryId: string;
  expectedContentHashHex: string;
  expectedCid: string;
}): Promise<{
  ok: boolean;
  chainId?: number;
  contractAddress?: string;
  observedContentHashHex?: string;
  observedCidHashHex?: string;
  observedCommitter?: string;
  error?: string;
}> {
  try {
    const rpcUrl = input.cfg.rpcUrl.trim();
    const contractAddress = input.cfg.contractAddress?.trim() || '';
    if (!rpcUrl) {
      return { ok: false, error: 'EVM_RPC_URL missing (cannot verify)' };
    }
    if (!contractAddress) {
      return { ok: false, error: 'EVM_CONTRACT_ADDRESS missing (cannot verify contract commit)' };
    }

    const provider = input.cfg.chainId
      ? new ethers.JsonRpcProvider(rpcUrl, input.cfg.chainId)
      : new ethers.JsonRpcProvider(rpcUrl);

    const net = await provider.getNetwork();

    const abi = [
      'function getCommitment(string agentId,string memoryId) external view returns (tuple(bytes32 contentHash,bytes32 cidHash,address committer,uint64 blockNumber,uint64 timestamp))',
    ];

    const contract = new ethers.Contract(contractAddress, abi, provider);
    const observed = await contract.getCommitment(input.agentId, input.memoryId);

    const observedContentHashHex = String(observed?.contentHash || '').replace(/^0x/, '').toLowerCase();
    const observedCidHashHex = String(observed?.cidHash || '').replace(/^0x/, '').toLowerCase();
    const observedCommitter = typeof observed?.committer === 'string' ? observed.committer : undefined;

    if (!observedCommitter || /^0x0{40}$/i.test(observedCommitter)) {
      return {
        ok: false,
        chainId: Number(net.chainId),
        contractAddress,
        observedContentHashHex,
        observedCidHashHex,
        observedCommitter,
        error: 'No commitment found (committer is zero address)',
      };
    }

    const expectedContent = input.expectedContentHashHex.trim().toLowerCase();
    const expectedCidHash = ethers.sha256(ethers.toUtf8Bytes(input.expectedCid)).replace(/^0x/, '').toLowerCase();

    const ok = observedContentHashHex === expectedContent && observedCidHashHex === expectedCidHash;
    return {
      ok,
      chainId: Number(net.chainId),
      contractAddress,
      observedContentHashHex,
      observedCidHashHex,
      observedCommitter,
      ...(ok ? {} : { error: 'Contract commitment mismatch' }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

export async function verifyEvmCommit(input: {
  cfg: Pick<EvmCommitConfig, 'rpcUrl' | 'chainId'>;
  txHash: string;
  expectedTo?: string;
  expectedPayloadUtf8: string;
}): Promise<{
  ok: boolean;
  chainId?: number;
  observedTo?: string;
  observedPayloadUtf8?: string;
  error?: string;
}> {
  try {
    const rpcUrl = input.cfg.rpcUrl.trim();
    if (!rpcUrl) {
      return { ok: false, error: 'EVM_RPC_URL missing (cannot verify)' };
    }

    const provider = input.cfg.chainId
      ? new ethers.JsonRpcProvider(rpcUrl, input.cfg.chainId)
      : new ethers.JsonRpcProvider(rpcUrl);

    const [tx, net] = await Promise.all([provider.getTransaction(input.txHash), provider.getNetwork()]);
    if (!tx) {
      return { ok: false, chainId: Number(net.chainId), error: 'Transaction not found' };
    }

    const observedTo = tx.to ?? undefined;
    const expectedTo = input.expectedTo?.trim().toLowerCase();
    if (expectedTo && observedTo && observedTo.toLowerCase() !== expectedTo) {
      return {
        ok: false,
        chainId: Number(net.chainId),
        observedTo,
        error: `Recipient mismatch: expected ${input.expectedTo}, got ${observedTo}`,
      };
    }

    let observedPayloadUtf8: string | undefined;
    try {
      observedPayloadUtf8 = ethers.toUtf8String(tx.data);
    } catch {
      observedPayloadUtf8 = undefined;
    }

    const ok = observedPayloadUtf8 === input.expectedPayloadUtf8;
    return {
      ok,
      chainId: Number(net.chainId),
      observedTo,
      observedPayloadUtf8,
      ...(ok ? {} : { error: 'Data payload mismatch' }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}
