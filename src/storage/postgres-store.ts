import { Pool } from 'pg';
import type { AgentRecord, DreamRunRecord, McpQueuedEvent, McpSessionRecord, MemoryRecord, SessionRecord, StoreData, UserRecord } from '../types';
import type { SearchMemoriesInput, SearchMemoryCandidate, StoreAdapter } from './types';
import { POSTGRES_SCHEMA_SQL } from './postgres-schema';

interface AgentRow {
  id: string;
  name: string;
  description: string | null;
  owner_user_id: string | null;
  api_key_hash: string;
  api_key_prefix: string;
  api_key_status: AgentRecord['apiKeyStatus'];
  api_key_rotated_at: string | Date | null;
  api_key_revoked_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface UserRow {
  id: string;
  google_sub: string;
  email: string;
  name: string;
  picture: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface SessionRow {
  id: string;
  agent_id: string;
  external_id: string | null;
  channel: string;
  metadata: Record<string, unknown> | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface MemoryRow {
  id: string;
  agent_id: string;
  session_id: string | null;
  type: MemoryRecord['type'];
  content: string;
  summary: string;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  importance: number | string;
  source: string;
  created_at: string | Date;
  last_accessed_at: string | Date;
  access_count: number | string;
  dream_origin_run_id: string | null;
  embedding?: string | null;
  embedding_model?: string | null;
}

function toVectorLiteral(values?: number[]): string | null {
  if (!values || values.length === 0) {
    return null;
  }

  return `[${values.map((value) => Number(value.toFixed(6))).join(',')}]`;
}

function parseVectorLiteral(value: string | null): number[] | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return undefined;
  }

  return trimmed
    .slice(1, -1)
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));
}

function mapMemoryRow(row: MemoryRow): MemoryRecord {
  return {
    id: row.id,
    agentId: row.agent_id,
    sessionId: row.session_id ?? undefined,
    type: row.type,
    content: row.content,
    summary: row.summary,
    tags: row.tags ?? [],
    metadata: row.metadata ?? {},
    importance: Number(row.importance),
    source: row.source,
    createdAt: new Date(row.created_at).toISOString(),
    lastAccessedAt: new Date(row.last_accessed_at).toISOString(),
    accessCount: Number(row.access_count),
    dreamOriginRunId: row.dream_origin_run_id ?? undefined,
    embedding: parseVectorLiteral(row.embedding ?? null),
    embeddingModel: row.embedding_model ?? undefined,
  };
}

type MemoryEmbeddingColumnName = 'embedding' | 'embedding_vector';

function inferPgSsl(databaseUrl: string): { rejectUnauthorized: boolean } | undefined {
  try {
    const parsed = new URL(databaseUrl);
    const sslmode = parsed.searchParams.get('sslmode')?.toLowerCase();
    const ssl = parsed.searchParams.get('ssl')?.toLowerCase();

    const wantsSsl =
      sslmode === 'require' ||
      sslmode === 'verify-ca' ||
      sslmode === 'verify-full' ||
      ssl === 'true' ||
      ssl === '1' ||
      Boolean(process.env.VERCEL) ||
      parsed.hostname.endsWith('vercel-storage.com');

    if (!wantsSsl) {
      return undefined;
    }

    return { rejectUnauthorized: false };
  } catch {
    return undefined;
  }
}

interface DreamRunRow {
  id: string;
  agent_id: string;
  status: DreamRunRecord['status'];
  provider: string;
  notes: string[] | null;
  source_memory_ids: string[] | null;
  created_memory_ids: string[] | null;
  created_at: string | Date;
}

interface McpSessionRow {
  id: string;
  agent_id: string;
  event_cursor: number | string;
  queued_events: McpQueuedEvent[] | null;
  created_at: string | Date;
  updated_at: string | Date;
}

function mapMcpSessionRow(row: McpSessionRow): McpSessionRecord {
  return {
    id: row.id,
    agentId: row.agent_id,
    eventCursor: Number(row.event_cursor),
    queuedEvents: Array.isArray(row.queued_events) ? row.queued_events : [],
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export class PostgresStore implements StoreAdapter {
  private readonly pool: Pool;
  private initialized = false;
  private readonly embeddingDimensions: number;
  private vectorSearchColumn: MemoryEmbeddingColumnName | null = null;
  private embeddingColumnType: 'vector' | 'text' | null = null;
  private embeddingVectorColumnExists = false;

  constructor(databaseUrl: string, options?: { embeddingDimensions?: number }) {
    const ssl = inferPgSsl(databaseUrl);
    this.pool = new Pool({ connectionString: databaseUrl, ssl });
    this.embeddingDimensions = options?.embeddingDimensions ?? 128;
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.pool.query(POSTGRES_SCHEMA_SQL);
    await this.tryEnableVectorSearch();
    this.initialized = true;
  }

  private async tryEnableVectorSearch(): Promise<void> {
    try {
      await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
    } catch {
      // pgvector is optional; ignore if it's unavailable or disallowed.
    }

    try {
      await this.pool.query(
        `ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding_vector vector(${this.embeddingDimensions});`,
      );
    } catch {
      // ignore
    }

    try {
      await this.pool.query(
        'CREATE INDEX IF NOT EXISTS idx_memories_embedding_vector_hnsw ON memories USING hnsw (embedding_vector vector_cosine_ops);',
      );
    } catch {
      // ignore (index method may be unavailable depending on pgvector version)
    }

    // Determine which column we can use for vector search.
    const columnsRes = await this.pool.query<{
      column_name: string;
      udt_name: string;
    }>(
      `SELECT column_name, udt_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'memories'
         AND column_name IN ('embedding', 'embedding_vector')`,
    );

    const embedding = columnsRes.rows.find((row) => row.column_name === 'embedding');
    const embeddingVector = columnsRes.rows.find((row) => row.column_name === 'embedding_vector');

    this.embeddingVectorColumnExists = embeddingVector?.udt_name === 'vector';
    this.embeddingColumnType = embedding?.udt_name === 'vector' ? 'vector' : embedding ? 'text' : null;

    if (embeddingVector?.udt_name === 'vector') {
      this.vectorSearchColumn = 'embedding_vector';
    } else if (embedding?.udt_name === 'vector') {
      this.vectorSearchColumn = 'embedding';
    } else {
      this.vectorSearchColumn = null;
    }

    if (this.vectorSearchColumn === 'embedding_vector') {
      // Best-effort backfill to enable search for existing rows.
      try {
        if (this.embeddingColumnType === 'vector') {
          await this.pool.query(
            'UPDATE memories SET embedding_vector = embedding WHERE embedding_vector IS NULL AND embedding IS NOT NULL;',
          );
        } else {
          await this.pool.query(
            'UPDATE memories SET embedding_vector = embedding::vector WHERE embedding_vector IS NULL AND embedding IS NOT NULL;',
          );
        }
      } catch {
        // ignore
      }
    }
  }

  async read(): Promise<StoreData> {
    await this.init();

    const [usersRes, agentsRes, sessionsRes, memoriesRes, dreamRunsRes, mcpSessionsRes] = await Promise.all([
      this.pool.query(`SELECT * FROM users ORDER BY created_at DESC`),
      this.pool.query(`SELECT * FROM agents ORDER BY created_at DESC`),
      this.pool.query(`SELECT * FROM sessions ORDER BY created_at DESC`),
      this.pool.query(`SELECT * FROM memories ORDER BY created_at DESC`),
      this.pool.query(`SELECT * FROM dream_runs ORDER BY created_at DESC`),
      this.pool.query(`SELECT * FROM mcp_sessions ORDER BY updated_at DESC`),
    ]);

    const users: UserRecord[] = usersRes.rows.map((row: UserRow) => ({
      id: row.id,
      googleSub: row.google_sub,
      email: row.email,
      name: row.name,
      picture: row.picture ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));

    const agents: AgentRecord[] = agentsRes.rows.map((row: AgentRow) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      ownerUserId: row.owner_user_id ?? undefined,
      apiKeyHash: row.api_key_hash,
      apiKeyPrefix: row.api_key_prefix,
      apiKeyStatus: row.api_key_status,
      apiKeyRotatedAt: row.api_key_rotated_at ? new Date(row.api_key_rotated_at).toISOString() : undefined,
      apiKeyRevokedAt: row.api_key_revoked_at ? new Date(row.api_key_revoked_at).toISOString() : undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));

    const sessions: SessionRecord[] = sessionsRes.rows.map((row: SessionRow) => ({
      id: row.id,
      agentId: row.agent_id,
      externalId: row.external_id ?? undefined,
      channel: row.channel,
      metadata: row.metadata ?? {},
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));

    const memories: MemoryRecord[] = memoriesRes.rows.map((row: MemoryRow) => mapMemoryRow(row));

    const dreamRuns: DreamRunRecord[] = dreamRunsRes.rows.map((row: DreamRunRow) => ({
      id: row.id,
      agentId: row.agent_id,
      status: row.status,
      provider: row.provider,
      notes: Array.isArray(row.notes) ? row.notes : [],
      sourceMemoryIds: Array.isArray(row.source_memory_ids) ? row.source_memory_ids : [],
      createdMemoryIds: Array.isArray(row.created_memory_ids) ? row.created_memory_ids : [],
      createdAt: new Date(row.created_at).toISOString(),
    }));

    const mcpSessions: McpSessionRecord[] = mcpSessionsRes.rows.map((row: McpSessionRow) => mapMcpSessionRow(row));

    return { users, agents, sessions, memories, dreamRuns, mcpSessions };
  }

  async write(next: StoreData): Promise<void> {
    await this.init();
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM dream_runs');
      await client.query('DELETE FROM mcp_sessions');
      await client.query('DELETE FROM memories');
      await client.query('DELETE FROM sessions');
      await client.query('DELETE FROM agents');
      await client.query('DELETE FROM users');

      for (const user of next.users) {
        await client.query(
          `INSERT INTO users (id, google_sub, email, name, picture, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [user.id, user.googleSub, user.email, user.name, user.picture ?? null, user.createdAt, user.updatedAt],
        );
      }

      for (const agent of next.agents) {
        await client.query(
          `INSERT INTO agents (id, name, description, owner_user_id, api_key_hash, api_key_prefix, api_key_status, api_key_rotated_at, api_key_revoked_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            agent.id,
            agent.name,
            agent.description ?? null,
            agent.ownerUserId ?? null,
            agent.apiKeyHash,
            agent.apiKeyPrefix,
            agent.apiKeyStatus,
            agent.apiKeyRotatedAt ?? null,
            agent.apiKeyRevokedAt ?? null,
            agent.createdAt,
            agent.updatedAt,
          ],
        );
      }

      for (const session of next.sessions) {
        await client.query(
          `INSERT INTO sessions (id, agent_id, external_id, channel, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
          [session.id, session.agentId, session.externalId ?? null, session.channel, JSON.stringify(session.metadata ?? {}), session.createdAt, session.updatedAt],
        );
      }

      for (const memory of next.memories) {
        const embeddingLiteral = toVectorLiteral(memory.embedding);

        if (this.vectorSearchColumn && this.vectorSearchColumn === 'embedding') {
          await client.query(
            `INSERT INTO memories
               (id, agent_id, session_id, type, content, summary, tags, metadata, importance, source, created_at, last_accessed_at, access_count, dream_origin_run_id, embedding, embedding_model)
             VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8::jsonb, $9, $10, $11, $12, $13, $14, $15::vector, $16)`,
            [
              memory.id,
              memory.agentId,
              memory.sessionId ?? null,
              memory.type,
              memory.content,
              memory.summary,
              memory.tags,
              JSON.stringify(memory.metadata ?? {}),
              memory.importance,
              memory.source,
              memory.createdAt,
              memory.lastAccessedAt,
              memory.accessCount,
              memory.dreamOriginRunId ?? null,
              embeddingLiteral,
              memory.embeddingModel ?? null,
            ],
          );
        } else if (this.embeddingVectorColumnExists) {
          await client.query(
            `INSERT INTO memories
               (id, agent_id, session_id, type, content, summary, tags, metadata, importance, source, created_at, last_accessed_at, access_count, dream_origin_run_id, embedding, embedding_vector, embedding_model)
             VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16::vector, $17)`,
            [
              memory.id,
              memory.agentId,
              memory.sessionId ?? null,
              memory.type,
              memory.content,
              memory.summary,
              memory.tags,
              JSON.stringify(memory.metadata ?? {}),
              memory.importance,
              memory.source,
              memory.createdAt,
              memory.lastAccessedAt,
              memory.accessCount,
              memory.dreamOriginRunId ?? null,
              embeddingLiteral,
              embeddingLiteral,
              memory.embeddingModel ?? null,
            ],
          );
        } else {
          await client.query(
            `INSERT INTO memories
               (id, agent_id, session_id, type, content, summary, tags, metadata, importance, source, created_at, last_accessed_at, access_count, dream_origin_run_id, embedding, embedding_model)
             VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16)`,
            [
              memory.id,
              memory.agentId,
              memory.sessionId ?? null,
              memory.type,
              memory.content,
              memory.summary,
              memory.tags,
              JSON.stringify(memory.metadata ?? {}),
              memory.importance,
              memory.source,
              memory.createdAt,
              memory.lastAccessedAt,
              memory.accessCount,
              memory.dreamOriginRunId ?? null,
              embeddingLiteral,
              memory.embeddingModel ?? null,
            ],
          );
        }
      }

      for (const dreamRun of next.dreamRuns) {
        await client.query(
          `INSERT INTO dream_runs (id, agent_id, status, provider, notes, source_memory_ids, created_memory_ids, created_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8)`,
          [
            dreamRun.id,
            dreamRun.agentId,
            dreamRun.status,
            dreamRun.provider,
            JSON.stringify(dreamRun.notes),
            JSON.stringify(dreamRun.sourceMemoryIds),
            JSON.stringify(dreamRun.createdMemoryIds),
            dreamRun.createdAt,
          ],
        );
      }

      for (const mcpSession of next.mcpSessions) {
        await client.query(
          `INSERT INTO mcp_sessions (id, agent_id, event_cursor, queued_events, created_at, updated_at)
           VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
          [
            mcpSession.id,
            mcpSession.agentId,
            mcpSession.eventCursor,
            JSON.stringify(mcpSession.queuedEvents),
            mcpSession.createdAt,
            mcpSession.updatedAt,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async searchMemories(input: SearchMemoriesInput): Promise<SearchMemoryCandidate[]> {
    await this.init();

    const values: Array<string | string[] | number | null> = [
      input.agentId,
      toVectorLiteral(input.queryEmbedding),
    ];
    let cursor = values.length;
    const addParam = (value: string | string[] | number) => {
      values.push(value);
      cursor += 1;
      return `$${cursor}`;
    };

    const baseConditions = ['agent_id = $1'];

    if (input.memoryTypes && input.memoryTypes.length > 0) {
      baseConditions.push(`type = ANY(${addParam(input.memoryTypes)}::text[])`);
    }

    const selectorParts: string[] = [];
    if (input.tags && input.tags.length > 0) {
      selectorParts.push(`tags && ${addParam(input.tags)}::text[]`);
    }

    const metadataConditions: string[] = [];
    for (const [key, value] of Object.entries(input.metadataFilters ?? {})) {
      if (value === undefined) {
        continue;
      }

      metadataConditions.push(`LOWER(COALESCE(metadata->>'${key}', '')) = LOWER(${addParam(String(value))})`);
    }

    const trimmedQuery = input.queryText?.trim();
    if (trimmedQuery) {
      const queryParam = addParam(`%${trimmedQuery.toLowerCase()}%`);
      selectorParts.push(`(
        LOWER(summary) LIKE ${queryParam}
        OR LOWER(content) LIKE ${queryParam}
        OR EXISTS (
          SELECT 1
          FROM unnest(tags) AS tag
          WHERE LOWER(tag) LIKE ${queryParam}
        )
      )`);
    }

    const vectorLimitParam = addParam(input.limit);
    const metadataLimitParam = addParam(input.limit);
    const metadataConditionsSql = [...baseConditions, ...metadataConditions];
    const selectorSql = selectorParts.length > 0 ? ` AND (${selectorParts.join(' OR ')})` : '';
    const includeVectorCandidates = Boolean(this.vectorSearchColumn) && Boolean(input.queryEmbedding?.length);
    const vectorColumn = this.vectorSearchColumn;

    const sql = `
      WITH metadata_candidates AS (
        SELECT id, 0.0::double precision AS vector_score
        FROM memories
        WHERE ${metadataConditionsSql.join(' AND ')}${selectorSql}
        ORDER BY importance DESC, created_at DESC
        LIMIT ${metadataLimitParam}
      )
      ${includeVectorCandidates && vectorColumn ? `,
      vector_candidates AS (
        SELECT id, (1 - (${vectorColumn} <=> $2::vector)) AS vector_score
        FROM memories
        WHERE ${[...baseConditions, ...metadataConditions, `${vectorColumn} IS NOT NULL`, '$2::vector IS NOT NULL'].join(' AND ')}
        ORDER BY ${vectorColumn} <=> $2::vector ASC
        LIMIT ${vectorLimitParam}
      )` : ''},
      merged AS (
        SELECT id, MAX(vector_score) AS vector_score
        FROM (
          SELECT * FROM metadata_candidates
          ${includeVectorCandidates ? 'UNION ALL\n          SELECT * FROM vector_candidates' : ''}
        ) AS candidates
        GROUP BY id
      )
      SELECT m.*, merged.vector_score
      FROM merged
      JOIN memories m ON m.id = merged.id
      ORDER BY merged.vector_score DESC, m.importance DESC, m.created_at DESC
      LIMIT ${metadataLimitParam}
    `;

    const result = await this.pool.query<MemoryRow & { vector_score: number | string }>(sql, values);
    return result.rows.map((row) => ({
      ...mapMemoryRow(row),
      vectorScore: Number(row.vector_score),
    }));
  }

  async touchMemories(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await this.init();
    await this.pool.query(
      `UPDATE memories
       SET last_accessed_at = NOW(),
           access_count = access_count + 1
       WHERE id = ANY($1::text[])`,
      [ids],
    );
  }

  async getMcpSession(id: string): Promise<McpSessionRecord | null> {
    await this.init();
    const result = await this.pool.query<McpSessionRow>(`SELECT * FROM mcp_sessions WHERE id = $1 LIMIT 1`, [id]);
    const row = result.rows[0];
    return row ? mapMcpSessionRow(row) : null;
  }

  async putMcpSession(session: McpSessionRecord): Promise<void> {
    await this.init();
    await this.pool.query(
      `INSERT INTO mcp_sessions (id, agent_id, event_cursor, queued_events, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       ON CONFLICT (id)
       DO UPDATE SET
         agent_id = EXCLUDED.agent_id,
         event_cursor = EXCLUDED.event_cursor,
         queued_events = EXCLUDED.queued_events,
         created_at = EXCLUDED.created_at,
         updated_at = EXCLUDED.updated_at`,
      [
        session.id,
        session.agentId,
        session.eventCursor,
        JSON.stringify(session.queuedEvents),
        session.createdAt,
        session.updatedAt,
      ],
    );
  }

  async deleteMcpSession(id: string): Promise<void> {
    await this.init();
    await this.pool.query(`DELETE FROM mcp_sessions WHERE id = $1`, [id]);
  }

  async deleteExpiredMcpSessions(olderThanIso: string): Promise<number> {
    await this.init();
    const result = await this.pool.query(`DELETE FROM mcp_sessions WHERE updated_at < $1`, [olderThanIso]);
    return result.rowCount ?? 0;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
