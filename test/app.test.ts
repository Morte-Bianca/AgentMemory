import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rm } from 'node:fs/promises';
import path from 'node:path';

const testDataFile = path.join(process.cwd(), 'data', 'test-store.json');
const defaultEnv = {
  DATA_FILE_PATH: testDataFile,
  STORAGE_DRIVER: 'file',
  MCP_SESSION_EVENT_LIMIT: '100',
  MCP_SESSION_TTL_MS: String(1000 * 60 * 60 * 24),
};

async function buildTestApp(envOverrides?: Record<string, string | undefined>) {
  vi.resetModules();
  Object.assign(process.env, defaultEnv, envOverrides ?? {});
  const { buildApp } = await import('../src/fastify-app');
  return buildApp();
}

describe('Claw memory API', () => {
  beforeEach(async () => {
    vi.resetModules();
    Object.assign(process.env, defaultEnv);
    await rm(testDataFile, { force: true });
  });

  it('creates an agent, stores memories, recalls, and runs dream cycle', async () => {
    const app = await buildTestApp();

    const createAgent = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: { name: 'claw-alpha', description: 'Test agent' },
    });

    expect(createAgent.statusCode).toBe(201);
    const agentId = createAgent.json().agent.id as string;
    const apiKey = createAgent.json().apiKey as string;

    await app.inject({
      method: 'POST',
      url: '/v1/memories',
      headers: { 'x-api-key': apiKey },
      payload: {
        agentId,
        type: 'episodic',
        content: 'User asked the Claw agent to remember deployment preferences for production.',
        tags: ['deployment', 'production'],
        importance: 0.8,
      },
    });

    await app.inject({
      method: 'POST',
      url: '/v1/memories',
      headers: { 'x-api-key': apiKey },
      payload: {
        agentId,
        type: 'episodic',
        content: 'The agent also discussed NFT gallery curation and art drops.',
        tags: ['nft', 'art'],
        importance: 0.5,
      },
    });

    const memoryList = await app.inject({
      method: 'GET',
      url: `/v1/agents/${agentId}/memories`,
      headers: { 'x-api-key': apiKey },
    });

    expect(memoryList.statusCode).toBe(200);
    expect(memoryList.json().memories[0].embeddingModel).toBe('local-hash-128');
    expect(Array.isArray(memoryList.json().memories[0].embedding)).toBe(true);

    const recall = await app.inject({
      method: 'POST',
      url: '/v1/memories/recall',
      headers: { 'x-api-key': apiKey },
      payload: { agentId, query: 'deployment preferences', limit: 5 },
    });

    expect(recall.statusCode).toBe(200);
    expect(recall.json().count).toBeGreaterThan(0);
    expect(recall.json().memories[0].summary.toLowerCase()).toContain('deployment');

    const dream = await app.inject({
      method: 'POST',
      url: '/v1/dreams/run',
      headers: { 'x-api-key': apiKey },
      payload: { agentId },
    });

    expect(dream.statusCode).toBe(201);
    expect(dream.json().createdMemories.length).toBeGreaterThan(0);
    expect(dream.json().dreamRun.provider).toBe('local-claw-dream-v1');
    expect(dream.json().dreamRun.notes.some((note: string) => note.includes('Provider local-claw-dream-v1'))).toBe(true);

    await app.close();
  });

  it('ingests Claw events and returns Claw context', async () => {
    const app = await buildTestApp();

    const createAgent = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: { name: 'claw-beta' },
    });

    const apiKey = createAgent.json().apiKey as string;

    const ingest = await app.inject({
      method: 'POST',
      url: '/v1/claw/events',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: {
        session: {
          id: 'ext-session-1',
          channel: 'cli',
          workspaceId: 'agentmemory',
          threadId: 'thread-42',
          userId: 'user-7',
          metadata: { workspace: 'agentmemory' },
        },
        event: {
          kind: 'reflection',
          actor: 'assistant',
          intent: 'stability-review',
          content: 'The agent noticed repeated questions around deployment safety and rollback steps.',
          tags: ['deployment', 'rollback'],
          importance: 0.95,
        },
      },
    });

    expect(ingest.statusCode).toBe(201);
    expect(ingest.json().dream).not.toBeNull();

    const context = await app.inject({
      method: 'POST',
      url: '/v1/claw/context',
      headers: { 'x-api-key': apiKey },
      payload: { query: 'deployment rollback', limit: 5 },
    });

    expect(context.statusCode).toBe(200);
    expect(context.json().context.summaries.length).toBeGreaterThan(0);

    const toolIngest = await app.inject({
      method: 'POST',
      url: '/v1/claw/events',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: {
        session: {
          id: 'ext-session-1',
          channel: 'cli',
        },
        event: {
          kind: 'tool_result',
          actor: 'tool',
          toolName: 'shell',
          action: 'deploy-preview',
          outcome: 'success',
          references: ['run-123'],
          content: 'Preview deploy succeeded and rollback artifact was created.',
          tags: ['deploy'],
          importance: 0.82,
        },
      },
    });

    expect(toolIngest.statusCode).toBe(201);
    expect(toolIngest.json().memory.type).toBe('procedural');
    expect(toolIngest.json().memory.tags).toContain('tool:shell');
    expect(toolIngest.json().memory.tags).toContain('action:deploy-preview');
    expect(toolIngest.json().memory.tags).toContain('outcome:success');
    expect(toolIngest.json().memory.metadata.threadId).toBeUndefined();
    expect(toolIngest.json().memory.metadata.toolName).toBe('shell');

    const memoryList = await app.inject({
      method: 'GET',
      url: `/v1/agents/${createAgent.json().agent.id}/memories`,
      headers: { 'x-api-key': apiKey },
    });

    expect(memoryList.statusCode).toBe(200);
    expect(memoryList.json().memories.some((memory: { metadata: { intent?: string } }) => memory.metadata.intent === 'stability-review')).toBe(true);

    const filteredRecall = await app.inject({
      method: 'POST',
      url: '/v1/memories/recall',
      headers: { 'x-api-key': apiKey },
      payload: {
        agentId: createAgent.json().agent.id,
        query: 'deploy rollback artifact',
        limit: 5,
        metadataFilters: {
          toolName: 'shell',
          action: 'deploy-preview',
          outcome: 'success',
        },
      },
    });

    expect(filteredRecall.statusCode).toBe(200);
    expect(filteredRecall.json().count).toBeGreaterThan(0);
    expect(filteredRecall.json().memories[0].metadata.toolName).toBe('shell');
    expect(filteredRecall.json().memories[0].metadata.action).toBe('deploy-preview');

    const filteredContext = await app.inject({
      method: 'POST',
      url: '/v1/claw/context',
      headers: { 'x-api-key': apiKey },
      payload: {
        query: 'rollback artifact',
        limit: 5,
        metadataFilters: {
          toolName: 'shell',
          outcome: 'success',
        },
      },
    });

    expect(filteredContext.statusCode).toBe(200);
    expect(filteredContext.json().context.summaries.length).toBeGreaterThan(0);
    expect(
      filteredContext
        .json()
        .context.summaries.every(
          (summary: { metadata: { toolName?: string; outcome?: string } }) =>
            summary.metadata.toolName === 'shell' && summary.metadata.outcome === 'success',
        ),
    ).toBe(true);

    await app.close();
  });

  it('rejects protected routes without API key', async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/v1/agents',
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('rotates and revokes agent api keys', async () => {
    const app = await buildTestApp();

    const createAgent = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: { name: 'claw-gamma' },
    });

    const firstApiKey = createAgent.json().apiKey as string;

    const rotate = await app.inject({
      method: 'POST',
      url: '/v1/agents/me/api-key/rotate',
      headers: { 'x-api-key': firstApiKey },
    });

    expect(rotate.statusCode).toBe(201);
    expect(rotate.json().apiKey).not.toBe(firstApiKey);
    expect(rotate.json().agent.apiKeyStatus).toBe('active');
    expect(typeof rotate.json().agent.apiKeyRotatedAt).toBe('string');

    const secondApiKey = rotate.json().apiKey as string;

    const oldKeyMe = await app.inject({
      method: 'GET',
      url: '/v1/agents/me',
      headers: { 'x-api-key': firstApiKey },
    });

    expect(oldKeyMe.statusCode).toBe(401);

    const newKeyMe = await app.inject({
      method: 'GET',
      url: '/v1/agents/me',
      headers: { 'x-api-key': secondApiKey },
    });

    expect(newKeyMe.statusCode).toBe(200);

    const revoke = await app.inject({
      method: 'POST',
      url: '/v1/agents/me/api-key/revoke',
      headers: { 'x-api-key': secondApiKey },
    });

    expect(revoke.statusCode).toBe(200);
    expect(revoke.json().agent.apiKeyStatus).toBe('revoked');
    expect(typeof revoke.json().agent.apiKeyRevokedAt).toBe('string');

    const revokedMe = await app.inject({
      method: 'GET',
      url: '/v1/agents/me',
      headers: { 'x-api-key': secondApiKey },
    });

    expect(revokedMe.statusCode).toBe(401);
    await app.close();
  });

  it('serves an MCP bridge for Claw memory workflows', async () => {
    const app = await buildTestApp();

    const createAgent = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: { name: 'claw-mcp' },
    });

    const agentId = createAgent.json().agent.id as string;
    const apiKey = createAgent.json().apiKey as string;

    const initialize = await app.inject({
      method: 'POST',
      url: '/v1/mcp',
      headers: { 'x-api-key': apiKey },
      payload: {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      },
    });

    expect(initialize.statusCode).toBe(200);
    const sessionId = initialize.headers['mcp-session-id'] as string;
    expect(typeof sessionId).toBe('string');
    expect(initialize.json().result.capabilities.tools).toBeDefined();

    const initialized = await app.inject({
      method: 'POST',
      url: '/v1/mcp',
      headers: { 'x-api-key': apiKey, 'mcp-session-id': sessionId },
      payload: {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      },
    });

    expect(initialized.statusCode).toBe(202);

    const toolsList = await app.inject({
      method: 'POST',
      url: '/v1/mcp',
      headers: { authorization: `Bearer ${apiKey}`, 'mcp-session-id': sessionId },
      payload: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      },
    });

    expect(toolsList.statusCode).toBe(200);
    expect(toolsList.json().result.tools.some((tool: { name: string }) => tool.name === 'memory_store')).toBe(true);

    const storeMemory = await app.inject({
      method: 'POST',
      url: '/v1/mcp',
      headers: { 'x-api-key': apiKey, 'mcp-session-id': sessionId },
      payload: {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'memory_store',
          arguments: {
            agentId,
            type: 'procedural',
            content: 'Use shell deploy-preview before promoting a release to production.',
            tags: ['deploy', 'preview'],
            importance: 0.9,
            metadata: {
              toolName: 'shell',
              action: 'deploy-preview',
              outcome: 'success',
            },
          },
        },
      },
    });

    expect(storeMemory.statusCode).toBe(200);
    expect(storeMemory.json().result.structuredContent.memory.type).toBe('procedural');

    const runDream = await app.inject({
      method: 'POST',
      url: '/v1/mcp',
      headers: { 'x-api-key': apiKey, 'mcp-session-id': sessionId },
      payload: {
        jsonrpc: '2.0',
        id: 'dream-1',
        method: 'tools/call',
        params: {
          name: 'dream_run',
          arguments: {
            agentId,
            maxSourceMemories: 5,
          },
        },
      },
    });

    expect(runDream.statusCode).toBe(200);
    expect(runDream.json().result.structuredContent.dreamRun.id).toBeDefined();

    const recallMemory = await app.inject({
      method: 'POST',
      url: '/v1/mcp',
      headers: {
        'x-api-key': apiKey,
        'mcp-session-id': sessionId,
        accept: 'application/json, text/event-stream',
      },
      payload: {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'memory_recall',
          arguments: {
            query: 'deploy preview production',
            metadataFilters: {
              toolName: 'shell',
              action: 'deploy-preview',
            },
            limit: 5,
          },
        },
      },
    });

    expect(recallMemory.statusCode).toBe(200);
    expect(recallMemory.headers['content-type']).toContain('text/event-stream');
    expect(recallMemory.payload).toContain('event: message');
    expect(recallMemory.payload).toContain('shell');

    const buildContext = await app.inject({
      method: 'POST',
      url: '/v1/mcp',
      headers: { 'x-api-key': apiKey, 'mcp-session-id': sessionId },
      payload: {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'claw_context_build',
          arguments: {
            query: 'deploy preview',
            metadataFilters: {
              toolName: 'shell',
            },
          },
        },
      },
    });

    expect(buildContext.statusCode).toBe(200);
    expect(buildContext.json().result.structuredContent.context.summaries.length).toBeGreaterThan(0);

    const discoveryStream = await app.inject({
      method: 'GET',
      url: '/v1/mcp',
      headers: {
        'x-api-key': apiKey,
        'mcp-session-id': sessionId,
        accept: 'text/event-stream',
      },
    });

    expect(discoveryStream.statusCode).toBe(200);
    expect(discoveryStream.headers['content-type']).toContain('text/event-stream');
    expect(discoveryStream.payload).toContain('event: endpoint');
    expect(discoveryStream.payload).toContain('notifications/claw/memory_stored');
    expect(discoveryStream.payload).toContain('notifications/claw/dream_completed');

    const eventIds = [...discoveryStream.payload.matchAll(/id: ([^\n]+)/g)].map((match) => match[1]);
    expect(eventIds.length).toBeGreaterThanOrEqual(2);

    const replayStream = await app.inject({
      method: 'GET',
      url: '/v1/mcp',
      headers: {
        'x-api-key': apiKey,
        'mcp-session-id': sessionId,
        accept: 'text/event-stream',
        'last-event-id': eventIds[0],
      },
    });

    expect(replayStream.statusCode).toBe(200);
    expect(replayStream.payload).not.toContain(`id: ${eventIds[0]}`);
    expect(replayStream.payload).toContain(`id: ${eventIds[1]}`);

    const closeSession = await app.inject({
      method: 'DELETE',
      url: '/v1/mcp',
      headers: {
        'x-api-key': apiKey,
        'mcp-session-id': sessionId,
      },
    });

    expect(closeSession.statusCode).toBe(204);

    const afterClose = await app.inject({
      method: 'POST',
      url: '/v1/mcp',
      headers: { 'x-api-key': apiKey, 'mcp-session-id': sessionId },
      payload: {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/list',
      },
    });

    expect(afterClose.statusCode).toBe(404);

    await app.close();
  });

  it('persists MCP sessions across app restarts', async () => {
    const firstApp = await buildTestApp();

    const createAgent = await firstApp.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: { name: 'claw-mcp-persist' },
    });

    const apiKey = createAgent.json().apiKey as string;

    const initialize = await firstApp.inject({
      method: 'POST',
      url: '/v1/mcp',
      headers: { 'x-api-key': apiKey },
      payload: {
        jsonrpc: '2.0',
        id: 'init-persist',
        method: 'initialize',
      },
    });

    const sessionId = initialize.headers['mcp-session-id'] as string;
    expect(typeof sessionId).toBe('string');

    const storeMemory = await firstApp.inject({
      method: 'POST',
      url: '/v1/mcp',
      headers: { 'x-api-key': apiKey, 'mcp-session-id': sessionId },
      payload: {
        jsonrpc: '2.0',
        id: 'persist-store',
        method: 'tools/call',
        params: {
          name: 'memory_store',
          arguments: {
            type: 'episodic',
            content: 'Remember persistent MCP sessions across restarts.',
            tags: ['mcp', 'restart'],
          },
        },
      },
    });

    expect(storeMemory.statusCode).toBe(200);
    await firstApp.close();

    const secondApp = await buildTestApp();

    const discoveryStream = await secondApp.inject({
      method: 'GET',
      url: '/v1/mcp',
      headers: {
        'x-api-key': apiKey,
        'mcp-session-id': sessionId,
        accept: 'text/event-stream',
      },
    });

    expect(discoveryStream.statusCode).toBe(200);
    expect(discoveryStream.payload).toContain('notifications/claw/memory_stored');
    expect(discoveryStream.payload).toContain('persistent MCP sessions across restarts');

    await secondApp.close();
  });

  it('expires MCP sessions and validates MCP origins', async () => {
    const app = await buildTestApp({
      MCP_SESSION_TTL_MS: '5',
      MCP_ALLOWED_ORIGINS: 'http://localhost:3000',
    });

    const createAgent = await app.inject({
      method: 'POST',
      url: '/v1/agents',
      payload: { name: 'claw-mcp-secure' },
    });

    const apiKey = createAgent.json().apiKey as string;

    const badOrigin = await app.inject({
      method: 'POST',
      url: '/v1/mcp',
      headers: {
        'x-api-key': apiKey,
        origin: 'http://evil.example',
      },
      payload: {
        jsonrpc: '2.0',
        id: 'bad-origin',
        method: 'initialize',
      },
    });

    expect(badOrigin.statusCode).toBe(403);

    const initialize = await app.inject({
      method: 'POST',
      url: '/v1/mcp',
      headers: {
        'x-api-key': apiKey,
        origin: 'http://localhost:3000',
      },
      payload: {
        jsonrpc: '2.0',
        id: 'good-origin',
        method: 'initialize',
      },
    });

    expect(initialize.statusCode).toBe(200);
    const sessionId = initialize.headers['mcp-session-id'] as string;

    await new Promise((resolve) => setTimeout(resolve, 12));

    const expiredSession = await app.inject({
      method: 'POST',
      url: '/v1/mcp',
      headers: {
        'x-api-key': apiKey,
        'mcp-session-id': sessionId,
        origin: 'http://localhost:3000',
      },
      payload: {
        jsonrpc: '2.0',
        id: 'expired-check',
        method: 'tools/list',
      },
    });

    expect(expiredSession.statusCode).toBe(404);

    await app.close();
  });
});
