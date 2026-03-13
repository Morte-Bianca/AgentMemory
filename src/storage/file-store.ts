import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { McpSessionRecord, StoreData } from '../types';
import type { StoreAdapter } from './types';

const EMPTY_STORE: StoreData = {
  users: [],
  agents: [],
  sessions: [],
  memories: [],
  dreamRuns: [],
  mcpSessions: [],
};

function normalizeStoreData(parsed: Partial<StoreData> | null | undefined): StoreData {
  return {
    users: parsed?.users ?? [],
    agents: parsed?.agents ?? [],
    sessions: parsed?.sessions ?? [],
    memories: parsed?.memories ?? [],
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
}
