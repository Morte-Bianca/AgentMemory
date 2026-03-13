import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config } from '../config';
import type { AppServices } from '../app';
import { ensureAgentScope, requireAgentAuth } from '../http-auth';
import { createId } from '../services/id';
import type { McpQueuedEvent, McpSessionRecord, MemoryType, RecallMetadataFilters } from '../types';

const jsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string().min(1),
  params: z.unknown().optional(),
});

const jsonRpcEnvelopeSchema = z.union([jsonRpcRequestSchema, z.array(jsonRpcRequestSchema).min(1)]);
const memoryTypeSchema = z.enum(['episodic', 'semantic', 'procedural', 'self_model', 'introspective']);
const metadataFiltersSchema = z.object({
  actor: z.enum(['user', 'assistant', 'tool', 'system']).optional(),
  intent: z.string().optional(),
  action: z.string().optional(),
  toolName: z.string().optional(),
  outcome: z.enum(['success', 'failure', 'partial']).optional(),
  workspaceId: z.string().optional(),
  threadId: z.string().optional(),
  userId: z.string().optional(),
}).optional();

const scopedAgentSchema = z.object({
  agentId: z.string().min(1).optional(),
});

const memoryStoreArgsSchema = scopedAgentSchema.extend({
  sessionId: z.string().min(1).optional(),
  type: memoryTypeSchema,
  content: z.string().min(1),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  importance: z.number().min(0).max(1).optional(),
  source: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const memoryRecallArgsSchema = scopedAgentSchema.extend({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  memoryTypes: z.array(memoryTypeSchema).optional(),
  metadataFilters: metadataFiltersSchema,
  limit: z.number().int().positive().max(20).optional(),
});

const dreamRunArgsSchema = scopedAgentSchema.extend({
  maxSourceMemories: z.number().int().positive().max(100).optional(),
});

type JsonRpcRequest = z.infer<typeof jsonRpcRequestSchema>;

const protocolVersion = '2025-03-26';

function createJsonRpcResult(id: string | number | null | undefined, result: unknown) {
  return {
    jsonrpc: '2.0' as const,
    id: id ?? null,
    result,
  };
}

function createJsonRpcError(id: string | number | null | undefined, code: number, message: string, data?: unknown) {
  return {
    jsonrpc: '2.0' as const,
    id: id ?? null,
    error: {
      code,
      message,
      data,
    },
  };
}

function formatToolContent(title: string, payload: unknown) {
  return [
    {
      type: 'text',
      text: `${title}\n${JSON.stringify(payload, null, 2)}`,
    },
  ];
}

function toolDefinitions() {
  return [
    {
      name: 'memory_store',
      title: 'Store memory',
      description: 'Persist a Claw memory item for the authenticated agent.',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string' },
          sessionId: { type: 'string' },
          type: { type: 'string', enum: ['episodic', 'semantic', 'procedural', 'self_model', 'introspective'] },
          content: { type: 'string' },
          summary: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          importance: { type: 'number', minimum: 0, maximum: 1 },
          source: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
        required: ['type', 'content'],
        additionalProperties: false,
      },
    },
    {
      name: 'memory_recall',
      title: 'Recall memories',
      description: 'Recall memories with hybrid search and optional metadata filters.',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string' },
          query: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          memoryTypes: {
            type: 'array',
            items: { type: 'string', enum: ['episodic', 'semantic', 'procedural', 'self_model', 'introspective'] },
          },
          metadataFilters: {
            type: 'object',
            properties: {
              actor: { type: 'string', enum: ['user', 'assistant', 'tool', 'system'] },
              intent: { type: 'string' },
              action: { type: 'string' },
              toolName: { type: 'string' },
              outcome: { type: 'string', enum: ['success', 'failure', 'partial'] },
              workspaceId: { type: 'string' },
              threadId: { type: 'string' },
              userId: { type: 'string' },
            },
            additionalProperties: false,
          },
          limit: { type: 'integer', minimum: 1, maximum: 20 },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'claw_context_build',
      title: 'Build Claw context',
      description: 'Build a compact Claw execution context from recalled memories.',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string' },
          query: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          memoryTypes: {
            type: 'array',
            items: { type: 'string', enum: ['episodic', 'semantic', 'procedural', 'self_model', 'introspective'] },
          },
          metadataFilters: {
            type: 'object',
            properties: {
              actor: { type: 'string', enum: ['user', 'assistant', 'tool', 'system'] },
              intent: { type: 'string' },
              action: { type: 'string' },
              toolName: { type: 'string' },
              outcome: { type: 'string', enum: ['success', 'failure', 'partial'] },
              workspaceId: { type: 'string' },
              threadId: { type: 'string' },
              userId: { type: 'string' },
            },
            additionalProperties: false,
          },
          limit: { type: 'integer', minimum: 1, maximum: 20 },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'dream_run',
      title: 'Run dream cycle',
      description: 'Trigger a Claw dream cycle for the authenticated agent.',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string' },
          maxSourceMemories: { type: 'integer', minimum: 1, maximum: 100 },
        },
        additionalProperties: false,
      },
    },
  ];
}

function readSessionId(request: FastifyRequest): string | undefined {
  const header = request.headers['mcp-session-id'];
  return typeof header === 'string' && header.trim() ? header.trim() : undefined;
}

function requestWantsSse(request: FastifyRequest): boolean {
  const accept = request.headers.accept;
  return typeof accept === 'string' && accept.toLowerCase().includes('text/event-stream');
}

function validateMcpOrigin(request: FastifyRequest): boolean {
  const origin = request.headers.origin;
  if (typeof origin !== 'string' || !origin.trim()) {
    return true;
  }

  if (config.mcpAllowedOrigins.length === 0) {
    return true;
  }

  return config.mcpAllowedOrigins.includes('*') || config.mcpAllowedOrigins.includes(origin);
}

function startSse(reply: FastifyReply, extraHeaders?: Record<string, string>) {
  reply.hijack();
  reply.raw.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    ...extraHeaders,
  });
}

function writeSseEvent(reply: FastifyReply, event: string, data: unknown, id?: string) {
  if (id) {
    reply.raw.write(`id: ${id}\n`);
  }

  reply.raw.write(`event: ${event}\n`);
  const serialized = typeof data === 'string' ? data : JSON.stringify(data);
  for (const line of serialized.split('\n')) {
    reply.raw.write(`data: ${line}\n`);
  }
  reply.raw.write('\n');
}

function readLastEventId(request: FastifyRequest): string | undefined {
  const header = request.headers['last-event-id'];
  return typeof header === 'string' && header.trim() ? header.trim() : undefined;
}

function firstForwardedValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    value = value[0];
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const first = value.split(',')[0]?.trim();
  return first ? first : undefined;
}

function publicBaseUrl(request: FastifyRequest): { proto: string; host: string } {
  const proto = firstForwardedValue(request.headers['x-forwarded-proto']) ?? request.protocol;
  const host =
    firstForwardedValue(request.headers['x-forwarded-host'])
    ?? (typeof request.headers.host === 'string' ? request.headers.host : undefined)
    ?? request.hostname;

  return { proto, host };
}

function queueSessionEvent(session: McpSessionRecord, payload: unknown): McpQueuedEvent {
  session.eventCursor += 1;
  const event: McpQueuedEvent = {
    id: `${session.id}:${session.eventCursor}`,
    event: 'message',
    payload,
    createdAt: new Date().toISOString(),
  };

  session.queuedEvents.push(event);
  if (session.queuedEvents.length > config.mcpSessionEventLimit) {
    session.queuedEvents.splice(0, session.queuedEvents.length - config.mcpSessionEventLimit);
  }

  session.updatedAt = new Date().toISOString();
  return event;
}

function replayableEvents(session: McpSessionRecord, lastEventId?: string): McpQueuedEvent[] {
  if (!lastEventId) {
    return session.queuedEvents;
  }

  const index = session.queuedEvents.findIndex((event) => event.id === lastEventId);
  if (index === -1) {
    return session.queuedEvents;
  }

  return session.queuedEvents.slice(index + 1);
}

function queueToolNotification(session: McpSessionRecord, toolName: string, result: unknown) {
  const structuredContent = (result as { structuredContent?: Record<string, unknown> } | null)?.structuredContent;
  if (!structuredContent) {
    return;
  }

  if (toolName === 'memory_store') {
    const memory = structuredContent.memory as { id?: string; type?: string; summary?: string } | undefined;
    if (!memory?.id) {
      return;
    }

    queueSessionEvent(session, {
      jsonrpc: '2.0',
      method: 'notifications/claw/memory_stored',
      params: {
        memoryId: memory.id,
        type: memory.type,
        summary: memory.summary,
      },
    });
    return;
  }

  if (toolName === 'dream_run') {
    const dreamRun = structuredContent.dreamRun as { id?: string; provider?: string } | undefined;
    const createdMemories = structuredContent.createdMemories as Array<{ id?: string; type?: string }> | undefined;
    if (!dreamRun?.id) {
      return;
    }

    queueSessionEvent(session, {
      jsonrpc: '2.0',
      method: 'notifications/claw/dream_completed',
      params: {
        dreamRunId: dreamRun.id,
        provider: dreamRun.provider,
        createdMemoryCount: createdMemories?.length ?? 0,
        createdMemoryIds: (createdMemories ?? []).map((memory) => memory.id).filter(Boolean),
      },
    });
  }
}

async function resolveAgentId(
  reply: FastifyReply,
  authAgentId: string,
  requestedAgentId?: string,
) {
  const ok = await ensureAgentScope(
    reply,
    {
      id: authAgentId,
      name: '',
      apiKeyHash: '',
      apiKeyPrefix: '',
      apiKeyStatus: 'active',
      createdAt: '',
      updatedAt: '',
    },
    requestedAgentId,
  );

  if (!ok) {
    return null;
  }

  return requestedAgentId ?? authAgentId;
}

async function callTool(
  toolName: string,
  args: unknown,
  authAgentId: string,
  reply: FastifyReply,
  services: AppServices,
) {
  switch (toolName) {
    case 'memory_store': {
      const parsed = memoryStoreArgsSchema.safeParse(args ?? {});
      if (!parsed.success) {
        return { isError: true, content: formatToolContent('Invalid arguments', parsed.error.flatten()) };
      }

      const agentId = await resolveAgentId(reply, authAgentId, parsed.data.agentId);
      if (!agentId) {
        return null;
      }

      const memory = await services.memories.storeMemory({
        agentId,
        sessionId: parsed.data.sessionId,
        type: parsed.data.type,
        content: parsed.data.content,
        summary: parsed.data.summary,
        tags: parsed.data.tags,
        importance: parsed.data.importance,
        source: parsed.data.source ?? 'mcp-bridge',
        metadata: parsed.data.metadata,
      });

      return {
        structuredContent: { memory },
        content: formatToolContent('Stored memory', { id: memory.id, type: memory.type, summary: memory.summary }),
      };
    }

    case 'memory_recall': {
      const parsed = memoryRecallArgsSchema.safeParse(args ?? {});
      if (!parsed.success) {
        return { isError: true, content: formatToolContent('Invalid arguments', parsed.error.flatten()) };
      }

      const agentId = await resolveAgentId(reply, authAgentId, parsed.data.agentId);
      if (!agentId) {
        return null;
      }

      const memories = await services.memories.recall({
        agentId,
        query: parsed.data.query,
        tags: parsed.data.tags,
        memoryTypes: parsed.data.memoryTypes as MemoryType[] | undefined,
        metadataFilters: parsed.data.metadataFilters as RecallMetadataFilters | undefined,
        limit: parsed.data.limit,
      });

      return {
        structuredContent: {
          count: memories.length,
          memories,
        },
        content: formatToolContent(
          `Recalled ${memories.length} memories`,
          memories.map((memory) => ({ id: memory.id, type: memory.type, summary: memory.summary, score: memory.score })),
        ),
      };
    }

    case 'claw_context_build': {
      const parsed = memoryRecallArgsSchema.safeParse(args ?? {});
      if (!parsed.success) {
        return { isError: true, content: formatToolContent('Invalid arguments', parsed.error.flatten()) };
      }

      const agentId = await resolveAgentId(reply, authAgentId, parsed.data.agentId);
      if (!agentId) {
        return null;
      }

      const context = await services.claw.buildContext({
        agentId,
        query: parsed.data.query,
        tags: parsed.data.tags,
        memoryTypes: parsed.data.memoryTypes as MemoryType[] | undefined,
        metadataFilters: parsed.data.metadataFilters as RecallMetadataFilters | undefined,
        limit: parsed.data.limit,
      });

      return {
        structuredContent: { context },
        content: formatToolContent('Built Claw context', { count: context.summaries.length, contextText: context.contextText }),
      };
    }

    case 'dream_run': {
      const parsed = dreamRunArgsSchema.safeParse(args ?? {});
      if (!parsed.success) {
        return { isError: true, content: formatToolContent('Invalid arguments', parsed.error.flatten()) };
      }

      const agentId = await resolveAgentId(reply, authAgentId, parsed.data.agentId);
      if (!agentId) {
        return null;
      }

      const result = await services.dreams.run(agentId, {
        maxSourceMemories: parsed.data.maxSourceMemories,
      });

      return {
        structuredContent: result,
        content: formatToolContent('Dream cycle completed', {
          dreamRunId: result.dreamRun.id,
          createdMemoryCount: result.createdMemories.length,
          provider: result.dreamRun.provider,
        }),
      };
    }

    default:
      return { isError: true, content: formatToolContent('Unknown tool', { toolName }) };
  }
}

export async function registerMcpRoutes(app: FastifyInstance, services: AppServices) {
  const pruneExpiredSessions = async () => {
    const cutoff = new Date(Date.now() - config.mcpSessionTtlMs).toISOString();
    await services.store.deleteExpiredMcpSessions(cutoff);
  };

  const touchSession = async (session: McpSessionRecord) => {
    session.updatedAt = new Date().toISOString();
    await services.store.putMcpSession(session);
    return session;
  };

  const requireSession = async (request: FastifyRequest, reply: FastifyReply, agentId: string) => {
    const sessionId = readSessionId(request);
    if (!sessionId) {
      await reply.status(400).send(createJsonRpcError(null, -32000, 'Missing Mcp-Session-Id header'));
      return null;
    }

    const session = await services.store.getMcpSession(sessionId);
    if (!session) {
      await reply.status(404).send(createJsonRpcError(null, -32001, 'Unknown MCP session'));
      return null;
    }

    if (session.agentId !== agentId) {
      await reply.status(403).send(createJsonRpcError(null, -32003, 'MCP session does not belong to this agent'));
      return null;
    }

    return touchSession(session);
  };

  const handleRequest = async (
    message: JsonRpcRequest,
    authAgentId: string,
    reply: FastifyReply,
    request: FastifyRequest,
  ) => {
    const { id, method, params } = message;

    if (method === 'initialize') {
      if (readSessionId(request)) {
        return createJsonRpcError(id, -32600, 'Initialize requests must not include Mcp-Session-Id');
      }

      const now = new Date().toISOString();
      const session: McpSessionRecord = {
        id: createId('mcp'),
        agentId: authAgentId,
        createdAt: now,
        updatedAt: now,
        eventCursor: 0,
        queuedEvents: [],
      };

      await services.store.putMcpSession(session);
      reply.header('Mcp-Session-Id', session.id);

      return createJsonRpcResult(id, {
        protocolVersion,
        capabilities: {
          tools: {
            listChanged: false,
          },
        },
        serverInfo: {
          name: 'claw-memory-api',
          version: '1.0.0',
        },
      });
    }

    const session = await requireSession(request, reply, authAgentId);
    if (!session) {
      return null;
    }

    reply.header('Mcp-Session-Id', session.id);

    if (method === 'notifications/initialized') {
      return undefined;
    }

    if (method === 'tools/list') {
      return createJsonRpcResult(id, {
        tools: toolDefinitions(),
      });
    }

    if (method === 'tools/call') {
      const toolCall = z.object({
        name: z.string().min(1),
        arguments: z.unknown().optional(),
      }).safeParse(params ?? {});

      if (!toolCall.success) {
        return createJsonRpcError(id, -32602, 'Invalid params', toolCall.error.flatten());
      }

      const result = await callTool(toolCall.data.name, toolCall.data.arguments, authAgentId, reply, services);
      if (reply.sent || result === null) {
        return null;
      }

      queueToolNotification(session, toolCall.data.name, result);
      await services.store.putMcpSession(session);

      return createJsonRpcResult(id, result);
    }

    return createJsonRpcError(id, -32601, 'Method not found');
  };

  app.get('/v1/mcp', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    if (!validateMcpOrigin(request)) {
      return reply.status(403).send({ error: 'Origin not allowed for MCP transport' });
    }

    await pruneExpiredSessions();

    if (!requestWantsSse(request)) {
      return reply.status(406).send({ error: 'Accept header must include text/event-stream' });
    }

    const session = await requireSession(request, reply, authAgent.id);
    if (!session) {
      return;
    }

    const { proto, host } = publicBaseUrl(request);
    const endpoint = `${proto}://${host}${request.url.split('?')[0]}`;
    startSse(reply, { 'Mcp-Session-Id': session.id });
    writeSseEvent(reply, 'endpoint', endpoint);
    for (const event of replayableEvents(session, readLastEventId(request))) {
      writeSseEvent(reply, event.event, event.payload, event.id);
    }
    reply.raw.end();
  });

  app.post('/v1/mcp', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    if (!validateMcpOrigin(request)) {
      return reply.status(403).send(createJsonRpcError(null, -32004, 'Origin not allowed for MCP transport'));
    }

    await pruneExpiredSessions();

    const parsed = jsonRpcEnvelopeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(createJsonRpcError(null, -32600, 'Invalid Request', parsed.error.flatten()));
    }

    const messages = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
    const responses: unknown[] = [];

    for (const message of messages) {
      const result = await handleRequest(message, authAgent.id, reply, request);
      if (reply.sent) {
        return;
      }

      if (result !== undefined && result !== null && message.id !== undefined) {
        responses.push(result);
      }
    }

    if (responses.length === 0) {
      return reply.status(202).send();
    }

    const payload = responses.length === 1 ? responses[0] : responses;
    if (!requestWantsSse(request)) {
      return payload;
    }

    const sessionHeader = reply.getHeader('Mcp-Session-Id');
    startSse(
      reply,
      typeof sessionHeader === 'string'
        ? { 'Mcp-Session-Id': sessionHeader }
        : undefined,
    );
    writeSseEvent(reply, 'message', payload);
    reply.raw.end();
  });

  app.delete('/v1/mcp', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    if (!validateMcpOrigin(request)) {
      return reply.status(403).send({ error: 'Origin not allowed for MCP transport' });
    }

    await pruneExpiredSessions();

    const session = await requireSession(request, reply, authAgent.id);
    if (!session) {
      return;
    }

    await services.store.deleteMcpSession(session.id);
    return reply.status(204).send();
  });
}