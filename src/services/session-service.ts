import { createId } from './id';
import type { SessionRecord } from '../types';
import type { StoreAdapter } from '../storage';

export class SessionService {
  constructor(private readonly store: StoreAdapter) {}

  async create(input: {
    agentId: string;
    externalId?: string;
    channel: string;
    metadata?: Record<string, unknown>;
  }): Promise<SessionRecord> {
    const state = await this.store.read();
    const now = new Date().toISOString();

    const session: SessionRecord = {
      id: createId('ses'),
      agentId: input.agentId,
      externalId: input.externalId,
      channel: input.channel,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    state.sessions.push(session);
    await this.store.write(state);
    return session;
  }

  async listByAgent(agentId: string): Promise<SessionRecord[]> {
    const state = await this.store.read();
    return state.sessions
      .filter((session) => session.agentId === agentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createOrGet(input: {
    agentId: string;
    externalId?: string;
    channel: string;
    metadata?: Record<string, unknown>;
  }): Promise<SessionRecord> {
    if (!input.externalId) {
      return this.create(input);
    }

    const state = await this.store.read();
    const existing = state.sessions.find(
      (session) => session.agentId === input.agentId && session.externalId === input.externalId,
    );

    if (existing) {
      existing.metadata = { ...existing.metadata, ...(input.metadata ?? {}) };
      existing.updatedAt = new Date().toISOString();
      await this.store.write(state);
      return existing;
    }

    return this.create(input);
  }
}
