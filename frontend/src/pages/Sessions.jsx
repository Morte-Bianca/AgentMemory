import React, { useEffect, useState } from 'react';
import { Network, History, Clock } from 'lucide-react';
import { client } from '../api/client';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await client.getSessions();
        setSessions(data.sessions || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <header style={{ marginBottom: 40, borderBottom: '1px solid var(--border)', paddingBottom: 24 }}>
        <h1 style={{ fontSize: 48, marginBottom: 8, letterSpacing: '-0em' }}>SESSION LOGS</h1>
        <p className="text-muted text-sm" style={{ textTransform: 'uppercase' }}>Explore active and historical interaction threads for this agent.</p>
      </header>

      {error && <div style={{ background: 'var(--bg-color)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: 12, marginBottom: 16, fontSize: 13, textTransform: 'uppercase' }}>{error}</div>}

      <div className="brutalist-panel">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <Network className="text-muted" size={20} /> ALL CONNECTIONS
        </h3>
        
        {loading ? (
          <div className="text-muted text-center" style={{ padding: 40, textTransform: 'uppercase' }}>SCANNING LOGS...</div>
        ) : sessions.length === 0 ? (
          <div className="text-muted flex-center" style={{ flexDirection: 'column', padding: '60px 0', border: '1px solid var(--border)', background: 'var(--bg-color)', textTransform: 'uppercase' }}>
            <History size={40} style={{ margin: '0 auto 16px' }} />
            NO SESSIONS INSTANTIATED YET.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sessions.map(sess => (
              <div key={sess.id} style={{ padding: 16, background: 'var(--bg-panel)', border: '1px solid var(--border)' }}>
                <div className="flex-between" style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>THREAD {sess.id}</div>
                  <div className="text-muted text-sm flex-center" style={{ gap: 4, fontWeight: 700 }}>
                    <Clock size={14} /> {new Date(sess.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-muted" style={{ textTransform: 'uppercase' }}>CHANNEL: </span>
                  <strong>{sess.channel || 'DEFAULT'}</strong>
                  <span className="text-muted" style={{ marginLeft: 16, textTransform: 'uppercase' }}>WORKSPACE: </span>
                  <strong>{sess.workspaceId || 'N/A'}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sessions;
