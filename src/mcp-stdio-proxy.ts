import process from 'node:process';

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

type SseEvent = {
  id?: string;
  event?: string;
  data: string;
};

function jsonRpcError(id: JsonRpcId | undefined, code: number, message: string, data?: unknown): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: {
      code,
      message,
      data,
    },
  };
}

function writeJsonRpcMessage(message: unknown) {
  const body = JSON.stringify(message);
  const length = Buffer.byteLength(body, 'utf8');
  process.stdout.write(`Content-Length: ${length}\r\n\r\n${body}`);
}

function logError(message: string, details?: unknown) {
  try {
    process.stderr.write(`[mcp-stdio-proxy] ${message}${details ? ` ${JSON.stringify(details)}` : ''}\n`);
  } catch {
    process.stderr.write(`[mcp-stdio-proxy] ${message}\n`);
  }
}

class StdioJsonRpcParser {
  private buffer = Buffer.alloc(0);

  onMessage: (message: unknown) => void = () => undefined;

  push(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    this.drain();
  }

  private drain() {
    // Prefer Content-Length framing (MCP SDK compatible).
    // Fallback: newline-delimited JSON (best-effort).
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        const headerText = this.buffer.slice(0, headerEnd).toString('utf8');
        const headers = headerText.split('\r\n');
        const contentLengthLine = headers.find((line) => line.toLowerCase().startsWith('content-length:'));
        if (!contentLengthLine) {
          // Not a valid framed message, drop through to newline mode.
          break;
        }

        const length = Number(contentLengthLine.split(':')[1]?.trim() ?? NaN);
        if (!Number.isFinite(length) || length < 0) {
          logError('Invalid Content-Length header', { contentLengthLine });
          // Skip past this header block.
          this.buffer = this.buffer.slice(headerEnd + 4);
          continue;
        }

        const bodyStart = headerEnd + 4;
        const bodyEnd = bodyStart + length;
        if (this.buffer.length < bodyEnd) {
          return;
        }

        const body = this.buffer.slice(bodyStart, bodyEnd).toString('utf8');
        this.buffer = this.buffer.slice(bodyEnd);
        if (body.trim().length === 0) {
          continue;
        }

        try {
          this.onMessage(JSON.parse(body));
        } catch (error) {
          logError('Failed to parse JSON-RPC body', { error: String(error), body: body.slice(0, 2000) });
        }

        continue;
      }

      const newlineIndex = this.buffer.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }

      const line = this.buffer.slice(0, newlineIndex + 1).toString('utf8');
      this.buffer = this.buffer.slice(newlineIndex + 1);
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      try {
        this.onMessage(JSON.parse(trimmed));
      } catch {
        // If it's not JSON, ignore the line.
      }
    }
  }
}

class AgentMemoryHttpMcpClient {
  private sessionId: string | null = null;
  private lastEventId: string | null = null;

  constructor(
    private readonly endpointUrl: string,
    private readonly apiKey: string,
  ) {}

  private authHeaders(): Record<string, string> {
    // Match server-side support: Authorization: Bearer <apiKey> OR x-api-key.
    return {
      authorization: `Bearer ${this.apiKey}`,
    };
  }

  private async httpPost(payload: unknown, includeSession: boolean): Promise<{ status: number; data?: unknown }> {
    const headers: Record<string, string> = {
      ...this.authHeaders(),
      accept: 'application/json',
      'content-type': 'application/json',
    };

    if (includeSession && this.sessionId) {
      headers['mcp-session-id'] = this.sessionId;
    }

    const response = await fetch(this.endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const upstreamSession = response.headers.get('mcp-session-id');
    if (upstreamSession) {
      this.sessionId = upstreamSession;
    }

    if (response.status === 202) {
      return { status: 202 };
    }

    const text = await response.text();
    if (!text.trim()) {
      return { status: response.status };
    }

    try {
      return { status: response.status, data: JSON.parse(text) };
    } catch {
      return { status: response.status, data: { raw: text } };
    }
  }

  async initialize(request: JsonRpcRequest): Promise<unknown> {
    const { status, data } = await this.httpPost(request, false);
    if (status >= 400) {
      throw new Error(`Upstream initialize failed (${status})`);
    }

    return data;
  }

  async send(request: JsonRpcRequest | JsonRpcRequest[]): Promise<{ status: number; data?: unknown }> {
    if (!this.sessionId) {
      return { status: 400, data: { error: 'Missing upstream session; call initialize first.' } };
    }
    return this.httpPost(request, true);
  }

  async pullQueuedEvents(): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    const headers: Record<string, string> = {
      ...this.authHeaders(),
      accept: 'text/event-stream',
      'mcp-session-id': this.sessionId,
    };
    if (this.lastEventId) {
      headers['last-event-id'] = this.lastEventId;
    }

    const response = await fetch(this.endpointUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      logError('Failed to pull queued events', { status: response.status, text: text.slice(0, 2000) });
      return;
    }

    if (!response.body) {
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let pending = '';

    const flushChunk = (chunk: string) => {
      pending += chunk;
      while (true) {
        const delimiterIndex = pending.indexOf('\n\n');
        if (delimiterIndex === -1) {
          return;
        }
        const rawEvent = pending.slice(0, delimiterIndex);
        pending = pending.slice(delimiterIndex + 2);
        const parsed = parseSseEvent(rawEvent);
        if (!parsed) {
          continue;
        }
        this.handleSseEvent(parsed);
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      flushChunk(decoder.decode(value, { stream: true }));
    }

    if (pending.trim()) {
      const parsed = parseSseEvent(pending);
      if (parsed) {
        this.handleSseEvent(parsed);
      }
    }
  }

  private handleSseEvent(event: SseEvent) {
    if (event.id) {
      this.lastEventId = event.id;
    }

    if (event.event === 'endpoint') {
      return;
    }

    if (event.event !== 'message') {
      return;
    }

    const trimmed = event.data.trim();
    if (!trimmed) {
      return;
    }

    try {
      const payload = JSON.parse(trimmed) as unknown;
      if (Array.isArray(payload)) {
        for (const item of payload) {
          writeJsonRpcMessage(item);
        }
        return;
      }
      writeJsonRpcMessage(payload);
    } catch (error) {
      logError('Failed to parse SSE message payload', { error: String(error), data: trimmed.slice(0, 2000) });
    }
  }
}

function parseSseEvent(raw: string): SseEvent | null {
  const lines = raw.split('\n');
  let id: string | undefined;
  let event: string | undefined;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('id:')) {
      id = line.slice(3).trim();
      continue;
    }
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
      continue;
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  return {
    id,
    event,
    data: dataLines.join('\n'),
  };
}

function resolveEnv(name: string): string | null {
  const value = process.env[name];
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function main() {
  const baseUrl = resolveEnv('AGENTMEMORY_BASE_URL') ?? resolveEnv('AGENTMEMORY_URL') ?? 'http://127.0.0.1:3000';
  const path = resolveEnv('AGENTMEMORY_MCP_PATH') ?? '/v1/mcp';
  const apiKey = resolveEnv('AGENTMEMORY_API_KEY') ?? resolveEnv('AGENT_API_KEY') ?? resolveEnv('API_KEY');
  if (!apiKey) {
    logError('Missing API key. Set AGENTMEMORY_API_KEY (or AGENT_API_KEY).');
    process.exitCode = 2;
    return;
  }

  const endpointUrl = new URL(path, baseUrl).toString();
  const client = new AgentMemoryHttpMcpClient(endpointUrl, apiKey);
  const parser = new StdioJsonRpcParser();

  parser.onMessage = async (message) => {
    try {
      if (Array.isArray(message)) {
        await handleBatch(client, message);
        return;
      }

      await handleSingle(client, message);
    } catch (error) {
      logError('Unhandled proxy error', { error: String(error) });
    }
  };

  process.stdin.on('data', (chunk: Buffer) => {
    parser.push(chunk);
  });

  process.stdin.on('error', (error) => {
    logError('stdin error', { error: String(error) });
  });
}

async function handleBatch(client: AgentMemoryHttpMcpClient, message: unknown[]) {
  const requests = message.filter((item) => typeof item === 'object' && item !== null) as JsonRpcRequest[];
  if (requests.length === 0) {
    return;
  }

  // Avoid mixing initialize with other calls in a single upstream batch.
  const initIndex = requests.findIndex((req) => req.method === 'initialize');
  if (initIndex !== -1) {
    const initReq = requests[initIndex];
    const initRes = await client.initialize(initReq);
    if (initReq.id !== undefined && initRes) {
      writeJsonRpcMessage(initRes);
    }
    await client.pullQueuedEvents();

    const remaining = requests.filter((_, idx) => idx !== initIndex);
    for (const req of remaining) {
      await forwardAndRespond(client, req);
    }
    return;
  }

  // Forward as a single upstream batch.
  const forwarded = requests.filter((req) => req.method !== 'notifications/initialized');
  if (forwarded.length === 0) {
    await client.pullQueuedEvents();
    return;
  }

  const { status, data } = await client.send(forwarded);
  if (status >= 400) {
    // Best-effort: return per-request error replies.
    for (const req of forwarded) {
      if (req.id !== undefined) {
        writeJsonRpcMessage(jsonRpcError(req.id, -32000, 'Upstream error', { status, data }));
      }
    }
    return;
  }

  if (data !== undefined) {
    writeJsonRpcMessage(data);
  }

  await client.pullQueuedEvents();
}

async function handleSingle(client: AgentMemoryHttpMcpClient, message: unknown) {
  if (typeof message !== 'object' || message === null) {
    return;
  }

  const request = message as Partial<JsonRpcRequest>;
  if (request.jsonrpc !== '2.0' || typeof request.method !== 'string') {
    return;
  }

  if (request.method === 'initialize') {
    const response = await client.initialize(request as JsonRpcRequest);
    if (request.id !== undefined && response) {
      writeJsonRpcMessage(response);
    }
    await client.pullQueuedEvents();
    return;
  }

  await forwardAndRespond(client, request as JsonRpcRequest);
}

async function forwardAndRespond(client: AgentMemoryHttpMcpClient, request: JsonRpcRequest) {
  if (request.method === 'notifications/initialized') {
    // Upstream returns 202 and no body; still useful to pull events.
    await client.send(request);
    await client.pullQueuedEvents();
    return;
  }

  const { status, data } = await client.send(request);
  if (status >= 400) {
    if (request.id !== undefined) {
      writeJsonRpcMessage(jsonRpcError(request.id, -32000, 'Upstream error', { status, data }));
    }
    return;
  }

  if (request.id !== undefined && data !== undefined) {
    writeJsonRpcMessage(data);
  }

  await client.pullQueuedEvents();
}

main();
