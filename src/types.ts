export type MemoryType =
  | 'episodic'
  | 'semantic'
  | 'procedural'
  | 'self_model'
  | 'introspective';

export interface UserRecord {
  id: string;
  googleSub: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRecord {
  id: string;
  name: string;
  description?: string;
  ownerUserId?: string;
  apiKeyHash: string;
  apiKeyPrefix: string;
  apiKeyStatus: 'active' | 'revoked';
  apiKeyRotatedAt?: string;
  apiKeyRevokedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  agentId: string;
  externalId?: string;
  channel: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ClawEventKind =
  | 'user_message'
  | 'assistant_response'
  | 'tool_result'
  | 'reflection'
  | 'knowledge_note'
  | 'policy_update';

export interface ClawEventInput {
  agentId?: string;
  session?: {
    id?: string;
    channel: string;
    workspaceId?: string;
    threadId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  };
  event: {
    kind: ClawEventKind;
    actor?: 'user' | 'assistant' | 'tool' | 'system';
    content: string;
    summary?: string;
    intent?: string;
    action?: string;
    toolName?: string;
    outcome?: 'success' | 'failure' | 'partial';
    references?: string[];
    tags?: string[];
    importance?: number;
    source?: string;
    metadata?: Record<string, unknown>;
  };
  triggerDream?: boolean;
}

export interface MemoryRecord {
  id: string;
  agentId: string;
  sessionId?: string;
  type: MemoryType;
  content: string;
  summary: string;
  tags: string[];
  importance: number;
  source: string;
  createdAt: string;
  lastAccessedAt: string;
  accessCount: number;
  dreamOriginRunId?: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
  embeddingModel?: string;
}

export type MemoryCommitmentStatus = 'disabled' | 'pending' | 'uploaded' | 'submitted' | 'confirmed' | 'failed';

export interface MemoryCommitmentRecord {
  id: string;
  agentId: string;
  memoryId: string;
  storageProvider: 'pinata';
  contentHash: string;
  encryptedHash: string;
  cid?: string;
  storageStatus: MemoryCommitmentStatus;
  evmStatus: MemoryCommitmentStatus;
  evmChainId?: number;
  evmTo?: string;
  evmTxHash?: string;
  solanaStatus: MemoryCommitmentStatus;
  solanaSignature?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DreamRunRecord {
  id: string;
  agentId: string;
  status: 'completed' | 'failed';
  provider: string;
  notes: string[];
  sourceMemoryIds: string[];
  createdMemoryIds: string[];
  createdAt: string;
}

export interface DreamScheduleRecord {
  agentId: string;
  intervalMs: number;
  active: boolean;
  lastRunAt?: string;
}

export interface McpQueuedEvent {
  id: string;
  event: 'message';
  payload: unknown;
  createdAt: string;
}

export interface McpSessionRecord {
  id: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
  eventCursor: number;
  queuedEvents: McpQueuedEvent[];
}

export interface StoreData {
  users: UserRecord[];
  agents: AgentRecord[];
  sessions: SessionRecord[];
  memories: MemoryRecord[];
  memoryCommitments: MemoryCommitmentRecord[];
  dreamRuns: DreamRunRecord[];
  mcpSessions: McpSessionRecord[];
}

export interface RecallMetadataFilters {
  actor?: 'user' | 'assistant' | 'tool' | 'system';
  intent?: string;
  action?: string;
  toolName?: string;
  outcome?: 'success' | 'failure' | 'partial';
  workspaceId?: string;
  threadId?: string;
  userId?: string;
}

export interface RecallRequest {
  agentId: string;
  query?: string;
  tags?: string[];
  memoryTypes?: MemoryType[];
  metadataFilters?: RecallMetadataFilters;
  limit?: number;
}

export interface StoreMemoryInput {
  agentId: string;
  sessionId?: string;
  type: MemoryType;
  content: string;
  summary?: string;
  tags?: string[];
  importance?: number;
  source?: string;
  dreamOriginRunId?: string;
  metadata?: Record<string, unknown>;
}
