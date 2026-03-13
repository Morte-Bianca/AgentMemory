export const POSTGRES_SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  api_key_status TEXT NOT NULL DEFAULT 'active',
  api_key_rotated_at TIMESTAMPTZ,
  api_key_revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key_rotated_at TIMESTAMPTZ;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key_revoked_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  external_id TEXT,
  channel TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON sessions(agent_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_agent_external_id
  ON sessions(agent_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  importance DOUBLE PRECISION NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ NOT NULL,
  access_count INTEGER NOT NULL DEFAULT 0,
  dream_origin_run_id TEXT,
  embedding vector(128),
  embedding_model TEXT
);
ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding vector(128);
ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding_model TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_tags_gin ON memories USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_memories_embedding_hnsw ON memories USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS dream_runs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'local-claw-dream-v1',
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_memory_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_memory_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE dream_runs ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'local-claw-dream-v1';
CREATE INDEX IF NOT EXISTS idx_dream_runs_agent_id ON dream_runs(agent_id);

CREATE TABLE IF NOT EXISTS mcp_sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  event_cursor INTEGER NOT NULL DEFAULT 0,
  queued_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE mcp_sessions ADD COLUMN IF NOT EXISTS event_cursor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mcp_sessions ADD COLUMN IF NOT EXISTS queued_events JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_agent_id ON mcp_sessions(agent_id);
`;
