import type {
  McpSessionRecord,
  MemoryCommitmentRecord,
  MemoryRecord,
  MemoryType,
  RecallMetadataFilters,
  StoreData,
} from '../types';

export interface SearchMemoriesInput {
  agentId: string;
  queryText?: string;
  queryEmbedding: number[];
  memoryTypes?: MemoryType[];
  tags?: string[];
  metadataFilters?: RecallMetadataFilters;
  limit: number;
}

export interface SearchMemoryCandidate extends MemoryRecord {
  vectorScore: number;
}

export interface CommitmentBackfillCursor {
  createdAt: string;
  id: string;
}

export interface CommitmentBackfillCandidate {
  memory: MemoryRecord;
  commitment: MemoryCommitmentRecord | null;
}

export interface StoreAdapter {
  read(): Promise<StoreData>;
  write(next: StoreData): Promise<void>;
  getMemoryById(memoryId: string): Promise<MemoryRecord | null>;
  getMcpSession(id: string): Promise<McpSessionRecord | null>;
  putMcpSession(session: McpSessionRecord): Promise<void>;
  deleteMcpSession(id: string): Promise<void>;
  deleteExpiredMcpSessions(olderThanIso: string): Promise<number>;
  getMemoryCommitment(memoryId: string): Promise<MemoryCommitmentRecord | null>;
  putMemoryCommitment(record: MemoryCommitmentRecord): Promise<void>;
  listMemoryCommitmentsByAgent(agentId: string, opts?: { limit?: number }): Promise<MemoryCommitmentRecord[]>;
  listCommitmentBackfillCandidates?(
    agentId: string,
    opts: {
      limit: number;
      cursor?: CommitmentBackfillCursor;
      includeFailed: boolean;
      requireEvmTxHash: boolean;
      requireSolanaSignature: boolean;
    },
  ): Promise<CommitmentBackfillCandidate[]>;
  searchMemories?(input: SearchMemoriesInput): Promise<SearchMemoryCandidate[]>;
  touchMemories?(ids: string[]): Promise<void>;
  init?(): Promise<void>;
  close?(): Promise<void>;
}
