import { apiKeyPrefix, generateApiKey, hashApiKey } from './api-key';
import { createId } from './id';
import type { AgentRecord } from '../types';
import type { StoreAdapter } from '../storage';

export class AgentService {
  constructor(private readonly store: StoreAdapter) {}

  async getByOwnerUserId(userId: string): Promise<AgentRecord | undefined> {
    const state = await this.store.read();
    return state.agents.find((agent) => agent.ownerUserId === userId);
  }

  async getOrCreatePublicAgent(input?: { name?: string; description?: string }): Promise<AgentRecord> {
    const state = await this.store.read();
    const name = input?.name ?? '__public__';
    const description = input?.description ?? 'Anonymous shared agent (auth disabled)';

    const existing = state.agents.find((agent) => agent.name === name);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const apiKey = generateApiKey();

    const agent: AgentRecord = {
      id: createId('agt'),
      name,
      description,
      apiKeyHash: hashApiKey(apiKey),
      apiKeyPrefix: apiKeyPrefix(apiKey),
      apiKeyStatus: 'active',
      createdAt: now,
      updatedAt: now,
    };

    state.agents.push(agent);
    await this.store.write(state);
    return agent;
  }

  async create(input: { name: string; description?: string }): Promise<{ agent: AgentRecord; apiKey: string }> {
    const state = await this.store.read();
    const now = new Date().toISOString();
    const apiKey = generateApiKey();

    const agent: AgentRecord = {
      id: createId('agt'),
      name: input.name,
      description: input.description,
      apiKeyHash: hashApiKey(apiKey),
      apiKeyPrefix: apiKeyPrefix(apiKey),
      apiKeyStatus: 'active',
      createdAt: now,
      updatedAt: now,
    };

    state.agents.push(agent);
    await this.store.write(state);
    return { agent, apiKey };
  }

  async initializeForOwner(input: { ownerUserId: string; name: string; description?: string }): Promise<{ agent: AgentRecord; apiKey: string; created: boolean }> {
    const existing = await this.getByOwnerUserId(input.ownerUserId);
    if (existing) {
      const rotated = await this.rotateApiKey(existing.id);
      return { ...rotated, created: false };
    }

    const state = await this.store.read();
    const now = new Date().toISOString();
    const apiKey = generateApiKey();

    const agent: AgentRecord = {
      id: createId('agt'),
      name: input.name,
      description: input.description,
      ownerUserId: input.ownerUserId,
      apiKeyHash: hashApiKey(apiKey),
      apiKeyPrefix: apiKeyPrefix(apiKey),
      apiKeyStatus: 'active',
      createdAt: now,
      updatedAt: now,
    };

    state.agents.push(agent);
    await this.store.write(state);
    return { agent, apiKey, created: true };
  }

  async list(): Promise<AgentRecord[]> {
    const state = await this.store.read();
    return state.agents.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(agentId: string): Promise<AgentRecord | undefined> {
    const state = await this.store.read();
    return state.agents.find((agent) => agent.id === agentId);
  }

  async authenticate(apiKey: string): Promise<AgentRecord | undefined> {
    const state = await this.store.read();
    const apiKeyHash = hashApiKey(apiKey);
    return state.agents.find((agent) => agent.apiKeyHash === apiKeyHash && agent.apiKeyStatus === 'active');
  }

  async rotateApiKey(agentId: string): Promise<{ agent: AgentRecord; apiKey: string }> {
    const state = await this.store.read();
    const agent = state.agents.find((item) => item.id === agentId);

    if (!agent) {
      throw new Error('Agent not found');
    }

    const apiKey = generateApiKey();
    const now = new Date().toISOString();

    agent.apiKeyHash = hashApiKey(apiKey);
    agent.apiKeyPrefix = apiKeyPrefix(apiKey);
    agent.apiKeyStatus = 'active';
    agent.apiKeyRotatedAt = now;
    agent.apiKeyRevokedAt = undefined;
    agent.updatedAt = now;

    await this.store.write(state);
    return { agent, apiKey };
  }

  async revokeApiKey(agentId: string): Promise<AgentRecord> {
    const state = await this.store.read();
    const agent = state.agents.find((item) => item.id === agentId);

    if (!agent) {
      throw new Error('Agent not found');
    }

    const now = new Date().toISOString();
    agent.apiKeyStatus = 'revoked';
    agent.apiKeyRevokedAt = now;
    agent.updatedAt = now;

    await this.store.write(state);
    return agent;
  }
}
