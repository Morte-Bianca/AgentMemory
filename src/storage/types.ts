import type { McpSessionRecord, MemoryRecord, MemoryType, RecallMetadataFilters, StoreData } from '../types';

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

export interface StoreAdapter {
  read(): Promise<StoreData>;
  write(next: StoreData): Promise<void>;
  getMcpSession(id: string): Promise<McpSessionRecord | null>;
  putMcpSession(session: McpSessionRecord): Promise<void>;
  deleteMcpSession(id: string): Promise<void>;
  deleteExpiredMcpSessions(olderThanIso: string): Promise<number>;
  searchMemories?(input: SearchMemoriesInput): Promise<SearchMemoryCandidate[]>;
  touchMemories?(ids: string[]): Promise<void>;
  init?(): Promise<void>;
  close?(): Promise<void>;
}
