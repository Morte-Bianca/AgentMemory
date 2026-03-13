import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Database, Terminal, Moon, Network } from 'lucide-react';

const Docs = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('auth');

  // Hardcoded docs content based on README.md
  
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Banner Status */}
      <div style={{ 
        borderBottom: '1px solid var(--border)', 
        padding: '8px 24px', 
        fontSize: '11px', 
        fontFamily: 'JetBrains Mono, monospace',
        display: 'flex',
        justifyContent: 'space-between',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-muted)'
      }}>
        <span>SYS.DOCS: <span style={{color: 'var(--text-main)'}}>PUBLIC_ACCESS</span></span>
        <span>NODE: DREAM_CATCHER_DOCS</span>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
        <div 
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Clash Display', fontSize: 24, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}
        >
          <img src="/dream-logo-2.svg" alt="Dream Catcher AI" style={{ width: 48, height: 48 }} />
          Dream Catcher AI
        </div>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <button className="btn" onClick={() => navigate('/docs')} style={{ padding: '12px 24px', textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em', border: 'none', background: 'var(--text-main)', color: 'var(--bg-color)' }}>Docs</button>
          <button className="btn" onClick={() => navigate('/for-agents')} style={{ padding: '12px 24px', textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em', border: 'none' }}>For Agents</button>
          <button className="btn btn-primary" onClick={() => navigate('/login')} style={{ borderRadius: 0, padding: '12px 24px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Initialize Identity
          </button>
        </div>
      </nav>

      {/* Main Docs Content Area */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left Sidebar Menu */}
        <aside style={{ 
          width: 320, 
          borderRight: '1px solid var(--border)', 
          padding: '48px 32px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 12 
        }}>
          <div style={{ fontFamily: 'Clash Display', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', marginBottom: 24 }}>
            Documentation
          </div>

          {[
            { id: 'auth', label: 'Authentication', icon: Terminal },
            { id: 'memories', label: 'Memory API', icon: Database },
            { id: 'dreams', label: 'Dream Cycles', icon: Moon },
            { id: 'claw', label: 'Claw Events', icon: Book },
            { id: 'mcp', label: 'MCP Bridge', icon: Network }
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '16px',
                  background: isActive ? 'var(--text-main)' : 'transparent',
                  color: isActive ? 'var(--bg-color)' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--text-main)' : 'var(--border)',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  transition: 'none'
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </aside>

        {/* Right Content Pane */}
        <main style={{ flex: 1, padding: '64px', maxWidth: 900 }}>
          
          {activeSection === 'auth' && (
            <div>
               <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Authentication</h1>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>
                 Base URL: https://agent-memory-five.vercel.app
               </p>

               <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Current Hosted Test Mode</h3>
                 <p style={{ marginBottom: 12 }}>The public deployment is currently running in shared test mode.</p>
                 <ul style={{ listStyleType: 'square', marginLeft: 24, padding: 0, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                   <li>No API key is required for testing.</li>
                   <li>Anonymous requests use a shared public agent.</li>
                   <li>Do not send secrets or sensitive data.</li>
                 </ul>
               </div>

               <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Headers Required</h3>
                 <p style={{ marginBottom: 16 }}>Protected environments require one of the following headers:</p>
                 <code style={{ display: 'block', marginBottom: 8 }}>Authorization: Bearer &lt;apiKey&gt;</code>
                 <code style={{ display: 'block' }}>x-api-key: &lt;apiKey&gt;</code>
               </div>

               <div className="brutalist-panel">
                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Lifecycle Endpoints</h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                   <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                     <span style={{ color: 'var(--primary)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>POST</span>
                     <code>/v1/agents</code>
                     <span className="text-muted text-sm">— Creates entirely new agent and returns one-time API Key.</span>
                   </div>
                   <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                     <span style={{ color: 'var(--primary)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>POST</span>
                     <code>/v1/agents/me/api-key/rotate</code>
                     <span className="text-muted text-sm">— Invalidates old key instantly.</span>
                   </div>
                   <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                     <span style={{ color: 'var(--primary)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>POST</span>
                     <code>/v1/agents/me/api-key/revoke</code>
                     <span className="text-muted text-sm">— Revokes current key.</span>
                   </div>
                 </div>
               </div>
            </div>
          )}

          {activeSection === 'memories' && (
            <div>
               <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Memory Core API</h1>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>
                 Store and retrieve memories with deterministic, hybrid reranking.
               </p>

               <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                 <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 18, fontFamily: 'JetBrains Mono, monospace' }}>POST</span>
                    <h3 style={{ textTransform: 'uppercase', margin: 0 }}>/v1/memories</h3>
                 </div>
                 <p style={{ marginBottom: 16 }}>Store a new memory. Memory types supported: <code>episodic</code>, <code>semantic</code>, <code>procedural</code>, <code>self_model</code>, <code>introspective</code>.</p>
                 <div style={{ background: '#000', padding: 16, border: '1px solid var(--border)' }}>
                   <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-muted)' }}>
{`{
  "type": "episodic",
  "content": "User expressed preference for brutalist layouts.",
  "importance": 0.8,
  "tags": ["design", "ui", "preference"]
}`}
                   </pre>
                 </div>
               </div>

               <div className="brutalist-panel">
                 <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 18, fontFamily: 'JetBrains Mono, monospace' }}>POST</span>
                    <h3 style={{ textTransform: 'uppercase', margin: 0 }}>/v1/memories/recall</h3>
                 </div>
                  <p style={{ marginBottom: 16 }}>Pipeline uses hybrid scoring across text, tags, metadata, recency, and vector similarity when vector search is available.</p>
                 <p className="text-muted">You can optionally pass <code>metadataFilters</code> like <code>actor</code>, <code>intent</code>, or <code>toolName</code> to scope the recall tightly around specific workflow traces.</p>
               </div>
            </div>
          )}

          {activeSection === 'dreams' && (
             <div>
               <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Dream Cycles</h1>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>
                 Background synthesis of procedural and semantic facts from episodic logs.
               </p>

               <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Provider Abstraction</h3>
                 <p style={{ marginBottom: 16 }}>Dream pipelines run off provider abstractions configued via <code>DREAM_PROVIDER=local</code>. 
                 They consume episodic memories and synthesize clean semantic states.</p>
               </div>

               <div className="brutalist-panel">
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                     <span style={{ color: 'var(--primary)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>POST</span>
                     <code>/v1/dreams/run</code>
                     <span className="text-muted">— Force an immediate cycle</span>
                   </div>
                   <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                     <span style={{ color: 'var(--primary)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>POST</span>
                     <code>/v1/dreams/schedule/start</code>
                     <span className="text-muted">— Start cron cycle</span>
                   </div>
                   <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                     <span style={{ color: 'var(--primary)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>POST</span>
                     <code>/v1/dreams/schedule/stop</code>
                     <span className="text-muted">— Halt cron cycle</span>
                   </div>
                 </div>
               </div>
            </div>
          )}

          {activeSection === 'claw' && (
            <div>
               <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Claw Integration</h1>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>
                 Rich event ingestion mapping directly to agent workflow actions.
               </p>

               <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                 <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 18, fontFamily: 'JetBrains Mono, monospace' }}>POST</span>
                    <h3 style={{ textTransform: 'uppercase', margin: 0 }}>/v1/claw/events</h3>
                 </div>
                 <p style={{ marginBottom: 16 }}>Automatic mapping from agent behaviors to memories. E.g., successful tool results compile to <code>procedural</code> memories, whereas errors map to <code>episodic</code>.</p>
                 <ul style={{ listStyleType: 'square', marginLeft: 24, padding: 0, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                    <li><strong style={{color: 'var(--text-main)'}}>Session fields:</strong> id, channel, workspaceId, threadId, userId</li>
                    <li><strong style={{color: 'var(--text-main)'}}>Event fields:</strong> kind, actor, intent, action, toolName, outcome</li>
                 </ul>
               </div>

               <div className="brutalist-panel">
                 <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 18, fontFamily: 'JetBrains Mono, monospace' }}>POST</span>
                    <h3 style={{ textTransform: 'uppercase', margin: 0 }}>/v1/claw/context</h3>
                 </div>
                 <p>Pull synthesized context prior to executing prompts to ground the LLM with relevant historical patterns.</p>
               </div>
            </div>
          )}

          {activeSection === 'mcp' && (
            <div>
               <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>MCP Bridge</h1>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>
                 Streamable HTTP JSON-RPC 2.0 + SSE Transport Model.
               </p>

               <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Tool Abstractions</h3>
                 <p style={{ marginBottom: 16 }}>Server exposes the following native MCP tools to compatible clients:</p>
                 <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                     <code>memory_store</code>
                     <code>memory_recall</code>
                     <code>claw_context_build</code>
                     <code>dream_run</code>
                 </div>
               </div>

               <div className="brutalist-panel">
                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Hosted Endpoint</h3>
                 <p style={{ marginBottom: 8 }}><code>POST https://agent-memory-five.vercel.app/v1/mcp</code></p>
                 <p style={{ marginBottom: 16 }}><code>GET https://agent-memory-five.vercel.app/v1/mcp</code></p>
                 <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Use this endpoint if your Claw client supports MCP over HTTP. For stdio-only clients, use an adapter/proxy layer.</p>

                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>SSE Background Streams</h3>
                 <p style={{ marginBottom: 16, color: 'var(--text-muted)' }}>Requesting <code>Accept: text/event-stream</code> initializes queued background listeners. Emitted events include:</p>
                 <ul style={{ listStyleType: 'square', marginLeft: 24, padding: 0, color: 'var(--text-main)', lineHeight: 1.8, fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}>
                    <li>notifications/claw/memory_stored</li>
                    <li>notifications/claw/dream_completed</li>
                 </ul>
                 <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>* Uses Last-Event-ID for unread replay.</p>
               </div>
            </div>
          )}

        </main>
      </div>
      
    </div>
  );
};

export default Docs;
