import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Bolt, Shield, Code2, Network, Check, ArrowRight, Zap, Target } from 'lucide-react';

const ForAgents = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');

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
        <span>PROTOCOL: MCP_BRIDGE</span>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
        <div 
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'Clash Display', fontSize: 24, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}
        >
          <BrainCircuit size={32} />
          Dream Catcher AI
        </div>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <button className="btn" onClick={() => navigate('/docs')} style={{ padding: '12px 24px', textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em', border: 'none' }}>Docs</button>
          <button className="btn" onClick={() => navigate('/for-agents')} style={{ padding: '12px 24px', textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em', border: 'none', background: 'var(--text-main)', color: 'var(--bg-color)' }}>For Agents</button>
          <button className="btn btn-primary" onClick={() => navigate('/login')} style={{ borderRadius: 0, padding: '12px 24px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Initialize Identity
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

          {[
            { id: 'overview', label: 'Overview', icon: Bolt },
            { id: 'install', label: 'Installation', icon: Shield },
            { id: 'types', label: 'Memory Types', icon: Network },
            { id: 'tools', label: 'Available Tools', icon: Code2 },
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
          
          {activeSection === 'overview' && (
            <div>
               <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Give Your Agent Real Memory</h1>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>
                 One Configuration. Your agent remembers everything across sessions via our MCP Streamable Bridge.
               </p>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 48 }}>
                 <div className="brutalist-panel">
                   <h3 style={{ textTransform: 'uppercase', marginBottom: 24, color: 'var(--text-muted)' }}>Without Active Memory</h3>
                   <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--text-muted)' }}>
                     <li style={{ display: 'flex', gap: 12 }}><span style={{ opacity: 0.5 }}>[-]</span> Relies on static workspace context dumps</li>
                     <li style={{ display: 'flex', gap: 12 }}><span style={{ opacity: 0.5 }}>[-]</span> Pre-compaction details are lost forever</li>
                     <li style={{ display: 'flex', gap: 12 }}><span style={{ opacity: 0.5 }}>[-]</span> Missed saves mean lost workflow patterns</li>
                     <li style={{ display: 'flex', gap: 12 }}><span style={{ opacity: 0.5 }}>[-]</span> Nothing connects retroactively over time</li>
                   </ul>
                 </div>

                 <div className="brutalist-panel" style={{ borderColor: 'var(--text-main)' }}>
                   <h3 style={{ textTransform: 'uppercase', marginBottom: 24, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 12 }}>
                     <Check size={20} /> With Dream Catcher AI
                   </h3>
                   <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                     <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}><strong style={{ color: 'var(--primary)' }}>[+]</strong> <span>Recall by semantic meaning and workflow trace vectors.</span></li>
                     <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}><strong style={{ color: 'var(--primary)' }}>[+]</strong> <span>Background dream cycles connect unlinked nodes automatically.</span></li>
                     <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}><strong style={{ color: 'var(--primary)' }}>[+]</strong> <span>Important contextual facts grow stronger via Hebbian reinforcement.</span></li>
                     <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}><strong style={{ color: 'var(--primary)' }}>[+]</strong> <span>Agents synthesize proactive opinions before you ask.</span></li>
                   </ul>
                 </div>
               </div>
               
               <button className="btn btn-primary" onClick={() => navigate('/login')} style={{ padding: '20px 40px', fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Obtain API Key <ArrowRight size={18} />
              </button>
            </div>
          )}

          {activeSection === 'install' && (
            <div>
               <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Installation</h1>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>
                 Fastest path to persistent agent memory. No infrastructure needed.
               </p>

               <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Hosted Endpoint</h3>
                 <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
                   Hosted base URL:
                 </p>
                 <code style={{ display: 'block', marginBottom: 24 }}>https://agent-memory-five.vercel.app</code>

                 <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
                   Main API endpoints for Claw agents:
                 </p>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                   <code>GET /v1/agents/me</code>
                   <code>POST /v1/memories</code>
                   <code>POST /v1/memories/recall</code>
                   <code>POST /v1/claw/events</code>
                   <code>POST /v1/claw/context</code>
                   <code>POST /v1/mcp</code>
                   <code>GET /v1/mcp</code>
                 </div>
                 
                 <div style={{ background: '#000', padding: 24, border: '1px solid var(--border)', overflowX: 'auto' }}>
                   <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-main)' }}>
{`// HTTP MCP clients
POST https://agent-memory-five.vercel.app/v1/mcp
GET  https://agent-memory-five.vercel.app/v1/mcp

// Current hosted deployment is in public test mode.
// No API key is required right now.`}
                   </pre>
                 </div>
                 
                 <div style={{ marginTop: 24, padding: 16, borderLeft: '4px solid var(--primary)', background: 'rgba(251, 250, 225, 0.05)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--primary)' }}><Zap size={16} /> Important Note</h4>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>If your Claw environment supports HTTP MCP, point it directly to <code>/v1/mcp</code>. If it only supports stdio MCP, use a stdio-to-HTTP proxy/adapter in front of this endpoint.</p>
                 </div>
               </div>

               <div className="brutalist-panel">
                 <h3 style={{ textTransform: 'uppercase', marginBottom: 16 }}>Typical Claw Flow</h3>
                 <ol style={{ marginLeft: 24, padding: 0, lineHeight: 1.9, color: 'var(--text-muted)' }}>
                   <li>Call <code>/v1/agents/me</code> to get the current public agent id.</li>
                   <li>Store important traces with <code>/v1/memories</code>.</li>
                   <li>Recall relevant memory with <code>/v1/memories/recall</code>.</li>
                   <li>For structured tool/session traces, send events to <code>/v1/claw/events</code>.</li>
                   <li>For assembled context, call <code>/v1/claw/context</code>.</li>
                   <li>For MCP-native flows, connect the client to <code>/v1/mcp</code>.</li>
                 </ol>
               </div>
            </div>
          )}

          {activeSection === 'types' && (
             <div>
               <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Memory Types</h1>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>
                 Not all information is the same. The engine categorizes intent.
               </p>

               <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                 <div className="brutalist-panel">
                    <h3 style={{ textTransform: 'uppercase', marginBottom: 8, color: 'var(--text-main)' }}>1. Episodic</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Raw events and interactions. Automatically captured from failed tool outputs or specific conversational turns.</p>
                    <code style={{ color: '#888' }}>"We debugged the auth flow on March 5 and hit a CORS error."</code>
                 </div>
                 
                 <div className="brutalist-panel">
                    <h3 style={{ textTransform: 'uppercase', marginBottom: 8, color: 'var(--text-main)' }}>2. Semantic</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Absolute factual extractions. Condensed truths about the environment or user.</p>
                    <code style={{ color: '#888' }}>"The user's application relies on Next.js 14 App Router and Supabase."</code>
                 </div>

                 <div className="brutalist-panel">
                    <h3 style={{ textTransform: 'uppercase', marginBottom: 8, color: 'var(--text-main)' }}>3. Procedural</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Synthesized "how-tos" and tactical patterns. Usually generated over time from successful workflows.</p>
                    <code style={{ color: '#888' }}>"To deploy: commit to main branch strictly. Railway detects and auto-deploys within 2 mins."</code>
                 </div>

                 <div className="brutalist-panel">
                    <h3 style={{ textTransform: 'uppercase', marginBottom: 8, color: 'var(--text-main)' }}>4. Self_Model</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Behavioral adjustments and constraints the agent learns about its own performance.</p>
                    <code style={{ color: '#888' }}>"I tend to over-explain simple CSS. I must keep UI tweaks under 3 bullet points."</code>
                 </div>

                 <div className="brutalist-panel">
                    <h3 style={{ textTransform: 'uppercase', marginBottom: 8, color: 'var(--text-main)' }}>5. Introspective</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Original insights and pattern recognition generated purely by backend Dream cycles.</p>
                    <code style={{ color: '#888' }}>"The pattern across the last 10 tasks suggests a looming database migration bottleneck."</code>
                 </div>
               </div>
            </div>
          )}

          {activeSection === 'tools' && (
            <div>
               <h1 style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: 24, letterSpacing: '-0.02em', borderBottom: '4px solid var(--text-main)', display: 'inline-block', paddingBottom: 8 }}>Available Tools</h1>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: 40, fontFamily: 'JetBrains Mono, monospace' }}>
                 The 4 native functions exposed to the agent upon MCP connection.
               </p>

               <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                 <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                    <Target size={24} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ textTransform: 'uppercase', margin: 0 }}>memory_store</h3>
                 </div>
                 <p style={{ color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>Allows the agent to actively push a memory string if it detects a crucial piece of semantic or procedural data that shouldn't wait for background episodic digestion.</p>
                 <code style={{ display: 'block' }}>Arguments: &#123; content: string, type: string, summary: string &#125;</code>
               </div>

               <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                 <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                    <Target size={24} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ textTransform: 'uppercase', margin: 0 }}>memory_recall</h3>
                 </div>
                 <p style={{ color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>Performs a hybrid search (semantic vector + structural metadata) to fetch nodes relevant to the immediate query. Returns heavily weighed concepts first.</p>
                 <code style={{ display: 'block' }}>Arguments: &#123; query: string, types?: array, limit?: int &#125;</code>
               </div>

               <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                 <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                    <Target size={24} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ textTransform: 'uppercase', margin: 0 }}>claw_context_build</h3>
                 </div>
                 <p style={{ color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>Macro-level tool. Triggers a full workspace context build combining recent file activity with deep episodic recall to frame the upcoming response.</p>
                 <code style={{ display: 'block' }}>Arguments: &#123; filter_workspace_id: string &#125;</code>
               </div>

               <div className="brutalist-panel" style={{ marginBottom: 32 }}>
                 <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                    <Target size={24} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ textTransform: 'uppercase', margin: 0 }}>dream_run</h3>
                 </div>
                 <p style={{ color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>Manually force a consolidation cycle online. Should be used sparingly, mostly recommended to let the server run cron scheduled cycles while resting.</p>
                 <code style={{ display: 'block' }}>Arguments: &#123; focus_area?: string &#125;</code>
               </div>

            </div>
          )}

        </main>
      </div>

    </div>
  );
};

export default ForAgents;
