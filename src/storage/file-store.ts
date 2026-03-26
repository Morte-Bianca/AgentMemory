import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { McpSessionRecord, MemoryCommitmentRecord, StoreData } from '../types';
import type { CommitmentBackfillCandidate, StoreAdapter } from './types';

const EMPTY_STORE: StoreData = {
  users: [],
  agents: [],
  sessions: [],
  memories: [],
  memoryCommitments: [],
  dreamRuns: [],
  mcpSessions: [],
};

function normalizeStoreData(parsed: Partial<StoreData> | null | undefined): StoreData {
  return {
    users: parsed?.users ?? [],
    agents: parsed?.agents ?? [],
    sessions: parsed?.sessions ?? [],
    memories: parsed?.memories ?? [],
    memoryCommitments: parsed?.memoryCommitments ?? [],
    dreamRuns: parsed?.dreamRuns ?? [],
    mcpSessions: parsed?.mcpSessions ?? [],
  };
}

export class FileStore implements StoreAdapter {
  private cache: StoreData | null = null;

  constructor(private readonly filePath: string) {}

  async read(): Promise<StoreData> {
    if (this.cache) {
      return structuredClone(this.cache);
    }

    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = normalizeStoreData(JSON.parse(raw) as Partial<StoreData>);
      this.cache = parsed;
      return structuredClone(parsed);
    } catch {
      await this.write(EMPTY_STORE);
      return structuredClone(EMPTY_STORE);
    }
  }

  async write(next: StoreData): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    this.cache = structuredClone(next);
    await writeFile(this.filePath, JSON.stringify(next, null, 2), 'utf8');
  }

  async getMemoryById(memoryId: string) {
    const state = await this.read();
    return state.memories.find((memory) => memory.id === memoryId) ?? null;
  }

  async getMcpSession(id: string): Promise<McpSessionRecord | null> {
    const state = await this.read();
    return state.mcpSessions.find((session) => session.id === id) ?? null;
  }

  async putMcpSession(session: McpSessionRecord): Promise<void> {
    const state = await this.read();
    const nextSessions = state.mcpSessions.filter((item) => item.id !== session.id);
    nextSessions.push(session);
    state.mcpSessions = nextSessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    await this.write(state);
  }

  async deleteMcpSession(id: string): Promise<void> {
    const state = await this.read();
    state.mcpSessions = state.mcpSessions.filter((session) => session.id !== id);
    await this.write(state);
  }

  async deleteExpiredMcpSessions(olderThanIso: string): Promise<number> {
    const state = await this.read();
    const before = state.mcpSessions.length;
    state.mcpSessions = state.mcpSessions.filter((session) => session.updatedAt >= olderThanIso);
    const deleted = before - state.mcpSessions.length;
    if (deleted > 0) {
      await this.write(state);
    }
    return deleted;
  }

  async getMemoryCommitment(memoryId: string) {
    const state = await this.read();
    return state.memoryCommitments.find((record) => record.memoryId === memoryId) ?? null;
  }

  async putMemoryCommitment(record: MemoryCommitmentRecord): Promise<void> {
    const state = await this.read();
    const next = state.memoryCommitments.filter((item) => item.memoryId !== record.memoryId);
    next.push(record);
    state.memoryCommitments = next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    await this.write(state);
  }

  async listMemoryCommitmentsByAgent(agentId: string, opts?: { limit?: number }): Promise<MemoryCommitmentRecord[]> {
    const state = await this.read();
    const matches = state.memoryCommitments
      .filter((record) => record.agentId === agentId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return opts?.limit ? matches.slice(0, opts.limit) : matches;
  }

  async listCommitmentBackfillCandidates(
    agentId: string,
    opts: {
      limit: number;
      cursor?: { createdAt: string; id: string };
      includeFailed: boolean;
      requireEvmTxHash: boolean;
      requireSolanaSignature: boolean;
    },
  ): Promise<CommitmentBackfillCandidate[]> {
    const state = await this.read();
    const sorted = state.memories
      .filter((memory) => memory.agentId === agentId)
      .sort((a, b) => (a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt)));

    const after = opts.cursor;
    const includeFailed = opts.includeFailed;
    const requireEvmTxHash = opts.requireEvmTxHash;
    const requireSolanaSignature = opts.requireSolanaSignature;

    const results: CommitmentBackfillCandidate[] = [];
    for (const memory of sorted) {
      if (results.length >= opts.limit) {
        break;
      }

      if (after) {
        const isAfter =
          memory.createdAt > after.createdAt || (memory.createdAt === after.createdAt && memory.id > after.id);
        if (!isAfter) {
          continue;
        }
      }

      const commitment = state.memoryCommitments.find((record) => record.memoryId === memory.id) ?? null;
      const fullyDone =
        commitment &&
        commitment.agentId === agentId &&
        commitment.storageStatus === 'uploaded' &&
        Boolean(commitment.cid) &&
        (!requireEvmTxHash || Boolean(commitment.evmTxHash)) &&
        (!requireSolanaSignature || Boolean(commitment.solanaSignature));
      if (fullyDone) {
        continue;
      }

      const failedAlready =
        commitment &&
        (commitment.storageStatus === 'failed' || commitment.evmStatus === 'failed' || commitment.solanaStatus === 'failed');
      if (commitment && failedAlready && !includeFailed) {
        continue;
      }

      results.push({ memory, commitment });
    }

    return results;
  }
}
