import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bolt, Check, Code2, Network, Shield, Target, Wrench } from 'lucide-react';

const baseUrl = 'https://agent-memory-five.vercel.app';

const ForAgents = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', label: 'Overview', icon: Bolt },
    { id: 'owner-setup', label: 'Owner Setup', icon: Shield },
    { id: 'http-api', label: 'HTTP API', icon: Code2 },
    { id: 'mcp', label: 'MCP Setup', icon: Network },
    { id: 'memory-strategy', label: 'Memory Strategy', icon: Target },
    { id: 'support', label: 'Operational Notes', icon: Wrench },
  ];

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
        <span>SYS.INSTALL: <span style={{color: 'var(--text-main)'}}>AGENT_INTEGRATION</span></span>
        <span>PROTOCOL: HTTP + MCP</span>
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
          <button className="btn" onClick={() => navigate('/docs')} style={{ padding: '12px 24px', textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em', border: 'none' }}>Docs</button>
          <button className="btn" onClick={() => navigate('/for-agents')} style={{ padding: '12px 24px', textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em', border: 'none', background: 'var(--text-main)', color: 'var(--bg-color)' }}>For Agents</button>
          <button className="btn btn-primary" onClick={() => navigate('/login')} style={{ borderRadius: 0, padding: '12px 24px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Login
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
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
            For Agents
          </div>

          {sections.map(item => {
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
          
          {activeSection === 'overview' && (
            <div>
               <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Give Your Agent Real Memory</h1>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>
                 This service gives Claw-style agents a hosted memory backend with API-key protected recall, event ingestion, dream synthesis, and optional MCP over HTTP.
               </p>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 48 }}>
                 <div className="brutalist-panel">
                   <h3 style={{ textTransform: 'uppercase', marginBottom: 24, color: 'var(--text-muted)' }}>Without Active Memory</h3>
                   <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--text-muted)' }}>
                     <li style={{ display: 'flex', gap: 12 }}><span style={{ opacity: 0.5 }}>[-]</span> No persistent memory beyond the local conversation</li>
                     <li style={{ display: 'flex', gap: 12 }}><span style={{ opacity: 0.5 }}>[-]</span> Tool outcomes are hard to search later</li>
                     <li style={{ display: 'flex', gap: 12 }}><span style={{ opacity: 0.5 }}>[-]</span> Cross-session preferences and facts drift away</li>
                     <li style={{ display: 'flex', gap: 12 }}><span style={{ opacity: 0.5 }}>[-]</span> No long-term consolidation layer</li>
                   </ul>
                 </div>

                 <div className="brutalist-panel" style={{ borderColor: 'var(--text-main)' }}>
                   <h3 style={{ textTransform: 'uppercase', marginBottom: 24, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 12 }}>
                     <Check size={20} /> With Dream Catcher AI
                   </h3>
                   <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                     <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}><strong style={{ color: 'var(--primary)' }}>[+]</strong> <span>Persistent memory per agent with recall scoped by API key.</span></li>
                     <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}><strong style={{ color: 'var(--primary)' }}>[+]</strong> <span>Structured Claw event ingestion for workflow-aware retrieval.</span></li>
                     <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}><strong style={{ color: 'var(--primary)' }}>[+]</strong> <span>Dream cycles that consolidate episodic traces over time.</span></li>
                     <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}><strong style={{ color: 'var(--primary)' }}>[+]</strong> <span>Optional hosted MCP tools if your environment supports HTTP MCP.</span></li>
                   </ul>
                 </div>
               </div>
               
               <button className="btn btn-primary" onClick={() => navigate('/login')} style={{ padding: '20px 40px', fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Login & Obtain API Key <ArrowRight size={18} />
              </button>
            </div>
          )}

          {activeSection === 'owner-setup' && (
            <div>
               <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Owner Setup</h1>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>
                 The supported setup flow is frontend-first: authenticate as the owner, initialize the owned agent, then place the issued API key into your agent runtime.
               </p>

               <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Step-by-Step</h3>
                 <ol style={{ marginLeft: 24, lineHeight: 1.9, color: 'var(--text-muted)' }}>
                   <li>Open <code>{baseUrl}</code>.</li>
                   <li>Go to Login and sign in with Google.</li>
                   <li>Open the Account page.</li>
                   <li>Press Initialize Agent to create the owned agent and issue the API key.</li>
                   <li>Copy the API key and store it in your Claw environment or secret manager.</li>
                   <li>Return to Account later if you need to rotate or revoke the key.</li>
                 </ol>
               </div>

               <div className="brutalist-panel">
                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Important Constraints</h3>
                 <ul style={{ listStyleType: 'square', marginLeft: 24, lineHeight: 1.9, color: 'var(--text-muted)' }}>
                   <li>One Google owner currently maps to one agent.</li>
                   <li>The Google session is for bootstrap only, not for protected route access.</li>
                   <li>After initialization, your agent should operate only with the issued API key.</li>
                 </ul>
               </div>
            </div>
          )}

          {activeSection === 'http-api' && (
             <div>
               <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>HTTP API</h1>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>
                 Base URL: {baseUrl}
               </p>

               <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Minimum Endpoints</h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                   <code>GET /health</code>
                   <code>GET /v1/agents/me</code>
                   <code>POST /v1/memories</code>
                   <code>POST /v1/memories/recall</code>
                   <code>POST /v1/claw/events</code>
                   <code>POST /v1/claw/context</code>
                   <code>POST /v1/dreams/run</code>
                 </div>
               </div>

               <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Authorization Pattern</h3>
                 <div style={{ background: '#000', padding: 16, border: '1px solid var(--border)' }}>
                   <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-main)' }}>
{`Authorization: Bearer <apiKey>

// or

x-api-key: <apiKey>`}
                   </pre>
                 </div>
               </div>

               <div className="brutalist-panel">
                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Practical Sequence</h3>
                 <ol style={{ marginLeft: 24, lineHeight: 1.9, color: 'var(--text-muted)' }}>
                   <li>Verify <code>/health</code>.</li>
                   <li>Call <code>GET /v1/agents/me</code> with the API key.</li>
                   <li>Store important facts with <code>POST /v1/memories</code>.</li>
                   <li>Recall relevant state with <code>POST /v1/memories/recall</code>.</li>
                   <li>Send structured workflow traces with <code>POST /v1/claw/events</code> when possible.</li>
                 </ol>
               </div>
            </div>
          )}

          {activeSection === 'mcp' && (
            <div>
               <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>MCP Setup</h1>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>
                 Use hosted MCP only if your agent environment supports MCP over HTTP. Otherwise, put a stdio-to-HTTP bridge in front of it.
               </p>

               <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Hosted Endpoint</h3>
                 <code style={{ display: 'block', marginBottom: 8 }}>POST {baseUrl}/v1/mcp</code>
                 <code style={{ display: 'block', marginBottom: 16 }}>GET {baseUrl}/v1/mcp</code>
                 <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>Every MCP request still requires the agent API key.</p>
               </div>

               <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Exposed Tools</h3>
                 <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                   <code>memory_store</code>
                   <code>memory_recall</code>
                   <code>claw_context_build</code>
                   <code>dream_run</code>
                 </div>
               </div>

               <div className="brutalist-panel">
                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>When Not To Use MCP</h3>
                 <ul style={{ listStyleType: 'square', marginLeft: 24, lineHeight: 1.9, color: 'var(--text-muted)' }}>
                   <li>If your host only supports stdio and you do not have a bridge.</li>
                   <li>If your runtime already has clean HTTP tool calling and you want simpler integration.</li>
                   <li>If you only need direct memory store/recall and not MCP session semantics.</li>
                 </ul>
               </div>
            </div>
          )}

          {activeSection === 'memory-strategy' && (
            <div>
               <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Memory Strategy</h1>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>
                 The best results come from separating immediate facts, structured workflow traces, and delayed consolidation.
               </p>

               <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                 <div className="brutalist-panel">
                    <h3 style={{ textTransform: 'uppercase', marginBottom: 8, color: 'var(--text-main)' }}>Direct Memory Writes</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>Use <code>/v1/memories</code> for explicit facts, stable preferences, concise summaries, or operator instructions.</p>
                 </div>
                 <div className="brutalist-panel">
                    <h3 style={{ textTransform: 'uppercase', marginBottom: 8, color: 'var(--text-main)' }}>Structured Event Ingestion</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>Use <code>/v1/claw/events</code> when actor, intent, action, tool name, or outcome matter later during recall.</p>
                 </div>
                 <div className="brutalist-panel">
                    <h3 style={{ textTransform: 'uppercase', marginBottom: 8, color: 'var(--text-main)' }}>Dream Consolidation</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>Use dream runs and schedules to convert episodic traces into more reusable semantic and procedural memory.</p>
                 </div>
               </div>
            </div>
          )}

          {activeSection === 'support' && (
            <div>
              <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Operational Notes</h1>
              <div className="brutalist-panel" style={{ marginBottom: 24 }}>
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Validate These First</h3>
                <ol style={{ marginLeft: 24, lineHeight: 1.9, color: 'var(--text-muted)' }}>
                  <li>Your API key is stored outside the browser and survives restarts.</li>
                  <li><code>GET /v1/agents/me</code> works with that key.</li>
                  <li>You can store and recall memory for the same <code>agentId</code>.</li>
                  <li>If using MCP, your client actually supports HTTP MCP or a bridge is present.</li>
                </ol>
              </div>

              <div className="brutalist-panel">
                <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Common Mistakes</h3>
                <ul style={{ listStyleType: 'square', marginLeft: 24, lineHeight: 1.9, color: 'var(--text-muted)' }}>
                  <li>Trying to call protected routes with only the Google login session.</li>
                  <li>Using an old key after rotate/revoke.</li>
                  <li>Sending an <code>agentId</code> that does not belong to the current key.</li>
                  <li>Expecting stdio-only tools to speak to the hosted MCP endpoint directly.</li>
                </ul>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
};

export default ForAgents;
