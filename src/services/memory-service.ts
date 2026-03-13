import type { StoreAdapter } from '../storage';
import type { EmbeddingProvider } from '../embeddings';
import type {
  MemoryRecord,
  RecallRequest,
  RecallMetadataFilters,
  StoreMemoryInput,
  MemoryType,
} from '../types';
import { createId } from './id';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function summarize(content: string): string {
  return content.trim().replace(/\s+/g, ' ').slice(0, 160);
}

function normalizeTags(tags: string[] = []): string[] {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

function tokenize(input?: string): string[] {
  if (!input) {
    return [];
  }

  return input
    .toLowerCase()
    .split(/[^\p{L}\p{N}_-]+/u)
    .filter((term) => term.length > 1);
}

function memoryTypeBoost(type: MemoryType): number {
  switch (type) {
    case 'self_model':
      return 0.08;
    case 'procedural':
      return 0.06;
    case 'semantic':
      return 0.04;
    default:
      return 0;
  }
}

function cosineSimilarity(a?: number[], b?: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return Math.max(0, dot / (Math.sqrt(magA) * Math.sqrt(magB)));
}

function normalizeFilterValue(value?: string): string | undefined {
  return value?.trim().toLowerCase() || undefined;
}

function matchesMetadataFilters(memory: MemoryRecord, filters?: RecallMetadataFilters): boolean {
  if (!filters) {
    return true;
  }

  const entries = Object.entries(filters).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return true;
  }

  return entries.every(([key, expected]) => {
    const actual = memory.metadata[key];
    if (typeof expected !== 'string') {
      return actual === expected;
    }

    return typeof actual === 'string' && actual.toLowerCase() === expected.toLowerCase();
  });
}

function metadataScore(memory: MemoryRecord, filters?: RecallMetadataFilters): number {
  if (!filters) {
    return 0;
  }

  const entries = Object.entries(filters).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return 0;
  }

  const matched = entries.filter(([key, expected]) => {
    const actual = memory.metadata[key];
    if (typeof expected !== 'string') {
      return actual === expected;
    }

    return typeof actual === 'string' && actual.toLowerCase() === expected.toLowerCase();
  }).length;

  return matched / entries.length;
}

export class MemoryService {
  constructor(
    private readonly store: StoreAdapter,
    private readonly embeddings: EmbeddingProvider,
  ) {}

  async storeMemory(input: StoreMemoryInput): Promise<MemoryRecord> {
    const state = await this.store.read();
    const now = new Date().toISOString();
    const summary = input.summary?.trim() || summarize(input.content);
    const tags = normalizeTags(input.tags);
    const embeddingText = [summary, input.content.trim(), tags.join(' ')].filter(Boolean).join('\n');
    const embedding = await this.embeddings.embed(embeddingText);

    const memory: MemoryRecord = {
      id: createId('mem'),
      agentId: input.agentId,
      sessionId: input.sessionId,
      type: input.type,
      content: input.content.trim(),
      summary,
      tags,
      importance: clamp(input.importance ?? 0.5, 0, 1),
      source: input.source || 'claw-api',
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      dreamOriginRunId: input.dreamOriginRunId,
      metadata: input.metadata ?? {},
      embedding,
      embeddingModel: this.embeddings.modelName,
    };

    state.memories.push(memory);
    await this.store.write(state);
    return memory;
  }

  async recall(input: RecallRequest): Promise<Array<MemoryRecord & { score: number }>> {
    const now = Date.now();
    const terms = tokenize(input.query);
    const tags = normalizeTags(input.tags);
    const limit = input.limit ?? 5;
    const queryEmbedding = await this.embeddings.embed([input.query ?? '', tags.join(' ')].filter(Boolean).join('\n'));
    const candidateLimit = Math.max(limit * 5, 25);

    let candidatePool: MemoryRecord[];

    if (this.store.searchMemories && input.query) {
      candidatePool = await this.store.searchMemories({
        agentId: input.agentId,
        queryText: input.query,
        queryEmbedding,
        memoryTypes: input.memoryTypes,
        tags,
        metadataFilters: input.metadataFilters,
        limit: candidateLimit,
      });
    } else {
      const state = await this.store.read();
      candidatePool = state.memories
        .filter((memory) => memory.agentId === input.agentId)
        .filter((memory) => !input.memoryTypes?.length || input.memoryTypes.includes(memory.type))
        .filter((memory) => matchesMetadataFilters(memory, input.metadataFilters));
    }

    const matches = candidatePool
      .filter((memory) => matchesMetadataFilters(memory, input.metadataFilters))
      .map((memory) => {
        const memoryText = `${memory.summary} ${memory.content}`.toLowerCase();
        const termHits = terms.reduce((count, term) => count + (memoryText.includes(term) ? 1 : 0), 0);
        const tagHits = tags.reduce((count, tag) => count + (memory.tags.includes(tag) ? 1 : 0), 0);
        const hoursSinceAccess = Math.max(0, (now - new Date(memory.lastAccessedAt).getTime()) / 3_600_000);
        const recency = Math.pow(0.992, hoursSinceAccess);
        const relevance = terms.length > 0 ? termHits / terms.length : 0.45;
        const tagScore = tags.length > 0 ? tagHits / tags.length : 0.35;
        const vectorScore = cosineSimilarity(queryEmbedding, memory.embedding);
        const metaScore = metadataScore(memory, input.metadataFilters);
        const score =
          0.24 * relevance +
          0.12 * tagScore +
          0.2 * memory.importance +
          0.1 * recency +
          0.2 * vectorScore +
          0.08 * metaScore +
          memoryTypeBoost(memory.type);

        return { ...memory, score };
      })
      .filter((memory) => {
        if (!terms.length && !tags.length) {
          return true;
        }

        return memory.score > 0.2;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    if (matches.length > 0) {
      const ids = matches.map((memory) => memory.id);

      if (this.store.touchMemories) {
        await this.store.touchMemories(ids);
      } else {
        const state = await this.store.read();
        const idSet = new Set(ids);
        state.memories = state.memories.map((memory) => {
          if (!idSet.has(memory.id)) {
            return memory;
          }

          return {
            ...memory,
            lastAccessedAt: new Date().toISOString(),
            accessCount: memory.accessCount + 1,
          };
        });
        await this.store.write(state);
      }
    }

    return matches;
  }

  async listByAgent(agentId: string): Promise<MemoryRecord[]> {
    const state = await this.store.read();
    return state.memories
      .filter((memory) => memory.agentId === agentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async stats(agentId: string): Promise<{
    total: number;
    byType: Record<MemoryType, number>;
    averageImportance: number;
    topTags: Array<{ tag: string; count: number }>;
  }> {
    const memories = await this.listByAgent(agentId);
    const byType: Record<MemoryType, number> = {
      episodic: 0,
      semantic: 0,
      procedural: 0,
      self_model: 0,
      introspective: 0,
    };

    const tagCounts = new Map<string, number>();
    let importanceSum = 0;

    for (const memory of memories) {
      byType[memory.type] += 1;
      importanceSum += memory.importance;
      for (const tag of memory.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    return {
      total: memories.length,
      byType,
      averageImportance: memories.length ? importanceSum / memories.length : 0,
      topTags: [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([tag, count]) => ({ tag, count })),
    };
  }
}
