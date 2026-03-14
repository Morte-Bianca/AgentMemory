import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Database, KeyRound, Moon, Network, Wrench } from 'lucide-react';

const baseUrl = 'https://agent-memory-five.vercel.app';

const endpointGroups = {
  auth: [
    ['POST', '/v1/auth/google', 'Verify a Google ID token and issue a signed owner session.'],
    ['GET', '/v1/auth/me', 'Return the signed-in owner and the owned agent, if one exists.'],
    ['POST', '/v1/agents/initialize', 'Create the owned agent or rotate/re-issue its API key.'],
    ['GET', '/v1/agents/me', 'Return the current agent for the supplied API key.'],
    ['POST', '/v1/agents/me/api-key/rotate', 'Rotate the current API key immediately.'],
    ['POST', '/v1/agents/me/api-key/revoke', 'Revoke the current API key.'],
  ],
  memories: [
    ['POST', '/v1/memories', 'Store a memory item for the authenticated agent.'],
    ['POST', '/v1/memories/recall', 'Recall relevant memories using hybrid scoring.'],
    ['GET', '/v1/agents/:agentId/memories', 'List stored memories for the agent.'],
    ['GET', '/v1/agents/:agentId/memories/stats', 'Return memory totals and type distribution.'],
  ],
  dreams: [
    ['POST', '/v1/dreams/run', 'Trigger a dream synthesis cycle immediately.'],
    ['GET', '/v1/agents/:agentId/dreams', 'List completed dream runs.'],
    ['POST', '/v1/dreams/schedule/start', 'Enable the dream scheduler for the agent.'],
    ['POST', '/v1/dreams/schedule/stop', 'Disable the dream scheduler for the agent.'],
    ['GET', '/v1/dreams/schedule', 'List active dream schedules for the authenticated agent.'],
  ],
  claw: [
    ['POST', '/v1/claw/events', 'Ingest structured Claw events as memories.'],
    ['POST', '/v1/claw/context', 'Build compact working context from stored memories.'],
    ['POST', '/v1/sessions', 'Create a tracked session for the current agent.'],
    ['GET', '/v1/agents/:agentId/sessions', 'List sessions created for the agent.'],
  ],
};

const sectionIds = [
  { id: 'auth', label: 'Authentication', icon: KeyRound },
  { id: 'memories', label: 'Memory API', icon: Database },
  { id: 'dreams', label: 'Dream Cycles', icon: Moon },
  { id: 'claw', label: 'Claw Workflows', icon: Book },
  { id: 'mcp', label: 'MCP Bridge', icon: Network },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: Wrench },
];

const EndpointList = ({ items }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    {items.map(([method, path, description]) => (
      <div key={`${method}-${path}`} className="mobile-col mobile-gap-8" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--primary)', fontWeight: 700, minWidth: 44, fontFamily: 'JetBrains Mono, monospace' }}>{method}</span>
          <code style={{ wordBreak: 'break-all' }}>{path}</code>
        </div>
        <span className="text-muted text-sm" style={{ lineHeight: 1.6 }}>{description}</span>
      </div>
    ))}
  </div>
);

const Docs = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('auth');
  const baseEndpointText = useMemo(() => `${baseUrl}`, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid var(--border)', padding: '8px 24px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', display: 'flex', justifyContent: 'space-between', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
        <span>SYS.DOCS: <span style={{ color: 'var(--text-main)' }}>LIVE</span></span>
        <span>NODE: DREAM_CATCHER_DOCS</span>
      </div>

      <nav className="mobile-nav-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Clash Display', fontSize: 24, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          <img src="/dream-logo-2.svg" alt="Dream Catcher AI" style={{ width: 48, height: 48 }} />
          <span className="mobile-logo-text">Dream Catcher AI</span>
        </div>
        <div className="mobile-nav-buttons" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <button className="btn" onClick={() => navigate('/docs')} style={{ padding: '12px 24px', textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em', border: 'none', background: 'var(--text-main)', color: 'var(--bg-color)' }}>Docs</button>
          <button className="btn" onClick={() => navigate('/for-agents')} style={{ padding: '12px 24px', textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em', border: 'none' }}>For Agents</button>
          <button className="btn btn-primary" onClick={() => navigate('/login')} style={{ borderRadius: 0, padding: '12px 24px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Login
          </button>
        </div>
      </nav>

      <div className="mobile-col" style={{ display: 'flex', flex: 1 }}>
        <aside className="mobile-full-width mobile-no-border mobile-p-24" style={{ width: 320, borderRight: '1px solid var(--border)', padding: '48px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: 'Clash Display', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', marginBottom: 24 }}>
            Documentation
          </div>
          {sectionIds.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', background: isActive ? 'var(--text-main)' : 'transparent', color: isActive ? 'var(--bg-color)' : 'var(--text-muted)', border: '1px solid', borderColor: isActive ? 'var(--text-main)' : 'var(--border)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: isActive ? 600 : 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </aside>

        <main className="mobile-full-width mobile-p-24" style={{ flex: 1, padding: '64px', maxWidth: 980 }}>
          {activeSection === 'auth' && (
            <div>
              <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Authentication & Ownership</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>Base URL: {baseEndpointText}</p>
              <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Current Access Model</h3>
                <ul style={{ listStyleType: 'square', marginLeft: 24, lineHeight: 1.9, color: 'var(--text-muted)' }}>
                  <li>One Google account owns one agent.</li>
                  <li>Google login is only for owner bootstrap and key recovery.</li>
                  <li>Protected API routes require the agent API key.</li>
                  <li>The web app flow is: Login → Account → Initialize Agent / Rotate Key.</li>
                </ul>
              </div>
              <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Required Headers</h3>
                <p style={{ marginBottom: 12 }}>Owner bootstrap endpoints use:</p>
                <code style={{ display: 'block', marginBottom: 18 }}>x-user-session: &lt;sessionToken&gt;</code>
                <p style={{ marginBottom: 12 }}>Protected routes use one of:</p>
                <code style={{ display: 'block', marginBottom: 8 }}>Authorization: Bearer &lt;apiKey&gt;</code>
                <code style={{ display: 'block' }}>x-api-key: &lt;apiKey&gt;</code>
              </div>
              <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Recommended Flow</h3>
                <ol style={{ marginLeft: 24, lineHeight: 1.9, color: 'var(--text-muted)' }}>
                  <li>Open the hosted frontend and sign in with Google.</li>
                  <li>Open the Account page and press Initialize Agent.</li>
                  <li>Copy the issued API key and store it in your Claw environment.</li>
                  <li>Use that API key for all memory, dream, Claw, and MCP requests.</li>
                </ol>
              </div>
              <div className="brutalist-panel">
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Identity Endpoints</h3>
                <EndpointList items={endpointGroups.auth} />
              </div>
            </div>
          )}

          {activeSection === 'memories' && (
            <div>
              <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Memory API</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>Hybrid recall uses text relevance, tags, metadata filters, recency, importance, and vector similarity when available.</p>
              <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Supported Memory Types</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {['episodic', 'semantic', 'procedural', 'self_model', 'introspective'].map((type) => <code key={type}>{type}</code>)}
                </div>
              </div>
              <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Store Example</h3>
                <div style={{ background: '#000', padding: 16, border: '1px solid var(--border)' }}>
                  <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-muted)' }}>{`POST /v1/memories\nAuthorization: Bearer <apiKey>\n\n{\n  "agentId": "<agent-id>",\n  "type": "episodic",\n  "content": "User prefers short, direct deployment summaries.",\n  "tags": ["preference", "reporting"],\n  "importance": 0.8,\n  "metadata": {\n    "workspaceId": "client-alpha",\n    "threadId": "ops-17"\n  }\n}`}</pre>
                </div>
              </div>
              <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Recall Example</h3>
                <div style={{ background: '#000', padding: 16, border: '1px solid var(--border)' }}>
                  <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-muted)' }}>{`POST /v1/memories/recall\nAuthorization: Bearer <apiKey>\n\n{\n  "agentId": "<agent-id>",\n  "query": "deployment summary preferences",\n  "memoryTypes": ["episodic", "procedural"],\n  "metadataFilters": {\n    "workspaceId": "client-alpha"\n  },\n  "limit": 5\n}`}</pre>
                </div>
              </div>
              <div className="brutalist-panel">
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Memory Endpoints</h3>
                <EndpointList items={endpointGroups.memories} />
              </div>
            </div>
          )}

          {activeSection === 'dreams' && (
            <div>
              <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Dream Cycles</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>Dream synthesis consolidates episodic and introspective material into longer-lived semantic, procedural, and self-model memories.</p>
              <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>How It Works</h3>
                <ul style={{ listStyleType: 'square', marginLeft: 24, lineHeight: 1.9, color: 'var(--text-muted)' }}>
                  <li>Manual dream runs are immediate and API-key protected.</li>
                  <li>Schedules are per-agent.</li>
                  <li>Dream history is available through the agent-specific list endpoint.</li>
                  <li>If no suitable source memories exist, the run completes with notes and no created memories.</li>
                </ul>
              </div>
              <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Schedule Example</h3>
                <div style={{ background: '#000', padding: 16, border: '1px solid var(--border)' }}>
                  <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-muted)' }}>{`POST /v1/dreams/schedule/start\nAuthorization: Bearer <apiKey>\n\n{\n  "agentId": "<agent-id>",\n  "intervalMs": 900000\n}`}</pre>
                </div>
              </div>
              <div className="brutalist-panel">
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Dream Endpoints</h3>
                <EndpointList items={endpointGroups.dreams} />
              </div>
            </div>
          )}

          {activeSection === 'claw' && (
            <div>
              <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Claw Workflows</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>Claw event ingestion is the recommended structured path for real agents because it preserves actor, intent, action, tool, and outcome metadata for later recall.</p>
              <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Event Mapping</h3>
                <ul style={{ listStyleType: 'square', marginLeft: 24, lineHeight: 1.9, color: 'var(--text-muted)' }}>
                  <li>Successful <code>tool_result</code> events usually become <code>procedural</code> memory.</li>
                  <li>Failed or partial tool events usually become <code>episodic</code> memory.</li>
                  <li><code>reflection</code> becomes <code>introspective</code>.</li>
                  <li><code>knowledge_note</code> becomes <code>semantic</code>.</li>
                </ul>
              </div>
              <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Event Example</h3>
                <div style={{ background: '#000', padding: 16, border: '1px solid var(--border)' }}>
                  <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-muted)' }}>{`POST /v1/claw/events\nAuthorization: Bearer <apiKey>\n\n{\n  "agentId": "<agent-id>",\n  "session": {\n    "id": "thread-001",\n    "channel": "claw",\n    "workspaceId": "client-alpha",\n    "threadId": "ops-17",\n    "userId": "owner-01"\n  },\n  "event": {\n    "kind": "tool_result",\n    "actor": "tool",\n    "intent": "debug_auth",\n    "action": "inspect_logs",\n    "toolName": "log-reader",\n    "outcome": "success",\n    "content": "Detected missing bearer token header in integration test."\n  }\n}`}</pre>
                </div>
              </div>
              <div className="brutalist-panel">
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Claw Endpoints</h3>
                <EndpointList items={endpointGroups.claw} />
              </div>
            </div>
          )}

          {activeSection === 'mcp' && (
            <div>
              <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>MCP Bridge</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>Hosted MCP is available over HTTP JSON-RPC 2.0 and SSE. Use it directly only if your environment supports HTTP MCP.</p>
              <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Hosted Endpoint</h3>
                <code style={{ display: 'block', marginBottom: 8 }}>POST {baseUrl}/v1/mcp</code>
                <code style={{ display: 'block', marginBottom: 16 }}>GET {baseUrl}/v1/mcp</code>
                <p className="text-muted" style={{ lineHeight: 1.6 }}>Include the agent API key on every MCP request. For stream mode, request <code>Accept: text/event-stream</code>. For stdio-only clients, place a stdio-to-HTTP proxy in front of this hosted endpoint.</p>
              </div>
              <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Available MCP Tools</h3>
                <ul style={{ listStyleType: 'square', marginLeft: 24, lineHeight: 1.9, color: 'var(--text-muted)' }}>
                  <li><code>memory_store</code> — store memory for the authenticated agent.</li>
                  <li><code>memory_recall</code> — recall memory with hybrid search.</li>
                  <li><code>claw_context_build</code> — build compact context from recalled memories.</li>
                  <li><code>dream_run</code> — trigger a dream cycle.</li>
                </ul>
              </div>
              <div className="brutalist-panel">
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Session Notes</h3>
                <ul style={{ listStyleType: 'square', marginLeft: 24, lineHeight: 1.9, color: 'var(--text-muted)' }}>
                  <li>The server returns <code>Mcp-Session-Id</code> on initialize.</li>
                  <li>Return that same header on subsequent MCP requests.</li>
                  <li>SSE notifications include memory-stored and dream-completed events.</li>
                  <li>If you send an <code>Origin</code> header, it must be allowed by the hosted allowlist.</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'troubleshooting' && (
            <div>
              <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Troubleshooting</h1>
              <div className="brutalist-panel" style={{ marginBottom: 24 }}>
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Common Failures</h3>
                <ul style={{ listStyleType: 'square', marginLeft: 24, lineHeight: 1.9, color: 'var(--text-muted)' }}>
                  <li><strong style={{ color: 'var(--text-main)' }}>401 Missing API key</strong> — you are calling a protected route without <code>Authorization</code> or <code>x-api-key</code>.</li>
                  <li><strong style={{ color: 'var(--text-main)' }}>401 Missing user session</strong> — owner bootstrap routes require <code>x-user-session</code>.</li>
                  <li><strong style={{ color: 'var(--text-main)' }}>403 Agent scope mismatch</strong> — the supplied <code>agentId</code> does not belong to the authenticated key.</li>
                  <li><strong style={{ color: 'var(--text-main)' }}>404 Route not found</strong> — verify you are using the hosted base URL exactly and not an old API path.</li>
                </ul>
              </div>
              <div className="brutalist-panel">
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Minimum Validation Checklist</h3>
                <ol style={{ marginLeft: 24, lineHeight: 1.9, color: 'var(--text-muted)' }}>
                  <li>Open the frontend and confirm Google login succeeds.</li>
                  <li>Initialize the owned agent from the Account page.</li>
                  <li>Call <code>GET /v1/agents/me</code> with the issued API key.</li>
                  <li>Store one memory and recall it.</li>
                  <li>Trigger one dream run or start/stop the dream schedule.</li>
                </ol>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Docs;
