import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppWindow, ArrowRight, Code, Terminal, Database, Shield, Bolt, Network, Layers } from 'lucide-react';
import { client } from '../api/client';

const Landing = () => {
  const navigate = useNavigate();
  const [sessionToken, setSessionToken] = useState(client.sessionToken);
  const [apiKey, setApiKey] = useState(client.apiKey);
  const [agent, setAgent] = useState(client.agent);

  useEffect(() => {
    let active = true;

    if (!client.sessionToken) {
      setSessionToken(null);
      setApiKey(client.apiKey);
      setAgent(client.agent);
      return undefined;
    }

    client.getAuthMe()
      .then((data) => {
        if (!active) {
          return;
        }

        setSessionToken(client.sessionToken);
        setApiKey(client.apiKey);
        setAgent(data.agent || null);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        client.clearSession();
        setSessionToken(null);
        setApiKey(client.apiKey);
        setAgent(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const primaryAction = useMemo(() => {
    if (!sessionToken) {
      return { label: 'LOGIN WITH GOOGLE', path: '/login' };
    }

    if (!agent || !apiKey) {
      return { label: 'INITIALIZE AGENT', path: '/account' };
    }

    return { label: 'OPEN DASHBOARD', path: '/app/dashboard' };
  }, [agent, apiKey, sessionToken]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Banner Status (Brutalist aesthetic) */}
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
        <span>SYS.STATUS: <span style={{color: 'var(--text-main)'}}>ONLINE</span></span>
        <span>VERSION: CLAW_MEMORY_API_V1</span>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Clash Display', fontSize: 24, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          <img src="/dream-logo-2.svg" alt="Dream Catcher AI" style={{ width: 48, height: 48 }} />
          Dream Catcher AI
        </div>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <button className="btn" onClick={() => navigate('/docs')} style={{ padding: '12px 24px', textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em', border: 'none' }}>Docs</button>
          <button className="btn" onClick={() => navigate('/for-agents')} style={{ padding: '12px 24px', textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em', border: 'none' }}>For Agents</button>
          {sessionToken && (
            <button className="btn" onClick={() => navigate('/account')} style={{ padding: '12px 24px', textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.04em', border: 'none' }}>Account</button>
          )}
          <button className="btn btn-primary" onClick={() => navigate(primaryAction.path)} style={{ borderRadius: 0, padding: '12px 24px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {primaryAction.label}
          </button>
        </div>
      </nav>

      {/* Hero Grid - Hard Asymmetrical Layout */}
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }}>
        
        {/* Left Side: Massive, aggressive typography */}
        <div style={{ gridColumn: 'span 8', borderRight: '1px solid var(--border)', padding: '24px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ borderBottom: '2px solid var(--text-main)', display: 'inline-block', paddingBottom: 8, marginBottom: 24, alignSelf: 'flex-start' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Core Service Layer</span>
          </div>
          
          <h1 style={{ 
            fontSize: 'clamp(4rem, 6vw, 6rem)', 
            lineHeight: 0.85, 
            textTransform: 'uppercase', 
            marginBottom: 24, 
            letterSpacing: '0em',
            wordBreak: 'break-word'
          }}>
            The Dream<br />Engine<br />For Agents
          </h1>
          
          <p style={{ 
            fontFamily: 'JetBrains Mono, monospace', 
            fontSize: '1.1rem', 
            lineHeight: 1.5, 
            color: 'var(--text-muted)', 
            maxWidth: 600,
            marginBottom: 24,
            borderLeft: '2px solid var(--text-main)',
            paddingLeft: 24
          }}>
          Streamable MCP Bridge integration. Deterministic Hybrid Vector Recall powered by pgvector.
          </p>

          <div style={{ 
            border: '1px solid var(--border)', 
            background: 'var(--bg-panel)', 
            padding: '16px 24px',
            marginBottom: 32,
            display: 'inline-block',
            alignSelf: 'flex-start'
          }}>
             <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 8 }}>
                Contract Address
             </div>
             <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, color: 'var(--text-main)' }}>
               xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
             </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <button className="btn btn-primary" onClick={() => navigate(primaryAction.path)} style={{ padding: '20px 32px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ACCESS TERMINAL <ArrowRight size={18} />
            </button>
            <button className="btn" onClick={() => navigate('/docs')} style={{ padding: '20px 32px', fontSize: 14, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              READ PROTOCOLS <Terminal size={18} />
            </button>
          </div>

          <div style={{ marginTop: 24, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {sessionToken
              ? agent
                ? apiKey
                  ? `Session ready · ${agent.name} is connected`
                  : `Signed in · ${agent.name} exists but needs an active API key in this browser`
                : 'Signed in · initialize your owned agent to receive an API key'
              : 'Not signed in · login with Google to bootstrap an owned agent'}
          </div>
        </div>

        {/* Right Side: Brutalist Stats / Features Stack */}
        {/* Right Side: Brutalist Stats / Features Stack */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column' }}>
          
          {/* Box 1 */}
          <div style={{ flex: 1, borderBottom: '1px solid var(--border)', padding: '24px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--bg-panel)' }}>
            <Database size={24} style={{ marginBottom: 12, opacity: 0.8 }} />
            <h3 style={{ textTransform: 'uppercase', marginBottom: 8, fontSize: 18 }}>Hybrid Vector Engine</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.4 }}>
              Local `local-hash-128` embedding generation with HNSW index scaling under Postgres `pgvector`. Keyword/tag deterministic scaling via Metadata filters.
            </p>
          </div>

          {/* Box 2 - Inverted for stark brutalist emphasis */}
          <div style={{ flex: 1, borderBottom: '1px solid var(--border)', padding: '24px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--text-main)', color: 'var(--bg-color)' }}>
            <Layers size={24} style={{ marginBottom: 12, opacity: 0.8 }} />
            <h3 style={{ textTransform: 'uppercase', marginBottom: 8, fontSize: 18 }}>Dream Synthesis Pipeline</h3>
            <p style={{ color: '#333', fontSize: 13, lineHeight: 1.4 }}>
              Background automated abstraction. The `local-claw-dream-v1` provider independently synthesizes raw `episodic` events into clustered `procedural` traits.
            </p>
          </div>

          {/* Box 3 */}
          <div style={{ flex: 1, padding: '24px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--bg-panel)' }}>
            <Bolt size={24} style={{ marginBottom: 12, color: 'var(--primary)' }} />
            <h3 style={{ textTransform: 'uppercase', marginBottom: 8, fontSize: 18 }}>Streamable MCP Bridge</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.4 }}>
               JSON-RPC 2.0 via `text/event-stream`. Directly expose `memory_store` and `dream_run` tools via SSE to Claude Desktop or Cursor natively.
            </p>
          </div>

        </div>

      </main>

      {/* Footer / System Status Footer */}
      <div style={{ 
        padding: '24px 32px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: 'JetBrains Mono, monospace', 
        fontSize: 12, 
        color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', gap: 48, textTransform: 'uppercase' }}>
           <span>[ CORE_RUNTIME_API ]</span>
           {['memory_store', 'memory_recall', 'claw_context_build', 'dream_run'].map(cmd => (
              <span key={cmd} style={{ color: 'var(--text-main)' }}>~/{cmd}</span>
           ))}
        </div>
        <div style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dual Storage: file / postgres</div>
      </div>
    </div>
  );
};

export default Landing;
