-- Base schema (pgvector is optional)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  picture TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  api_key_status TEXT NOT NULL DEFAULT 'active',
  api_key_rotated_at TIMESTAMPTZ,
  api_key_revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key_rotated_at TIMESTAMPTZ;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key_revoked_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_owner_user_id_unique ON agents(owner_user_id) WHERE owner_user_id IS NOT NULL;

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
  embedding TEXT,
  embedding_model TEXT
);
ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding_model TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_tags_gin ON memories USING GIN(tags);

CREATE TABLE IF NOT EXISTS memory_commitments (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  memory_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  storage_provider TEXT NOT NULL DEFAULT 'pinata',
  content_hash TEXT NOT NULL,
  encrypted_hash TEXT NOT NULL,
  cid TEXT,
  storage_status TEXT NOT NULL,
  evm_status TEXT NOT NULL,
  evm_chain_id INTEGER,
  evm_to TEXT,
  evm_tx_hash TEXT,
  solana_status TEXT NOT NULL,
  solana_signature TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_commitments_memory_id_unique ON memory_commitments(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_commitments_agent_id ON memory_commitments(agent_id);

-- Optional pgvector support (best-effort)
-- CREATE EXTENSION IF NOT EXISTS vector;
-- ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding_vector vector(128);
-- CREATE INDEX IF NOT EXISTS idx_memories_embedding_vector_hnsw ON memories USING hnsw (embedding_vector vector_cosine_ops);

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
