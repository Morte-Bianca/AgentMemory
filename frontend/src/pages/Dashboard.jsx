import React, { useEffect, useState } from 'react';
import { Key, Activity, Database, Hash, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useUI } from '../components/useUI';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState(client.agent);
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useUI();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await client.getMemoryStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to load stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const copyKey = () => {
    navigator.clipboard.writeText(client.apiKey);
    showAlert('API Key copied to clipboard', 'success');
  };

  const handleRotateKey = async () => {
    showConfirm("Are you sure? Rotating the key will invalidate your current API Key immediately.", async () => {
      try {
        const data = await client.rotateApiKey();
        setAgent({ ...client.agent }); // trigger re-render
        showAlert(`API Key rotated successfully. New Key: ${data.apiKey.substring(0, 12)}... (Copied to clipboard)`, 'success');
        navigator.clipboard.writeText(data.apiKey);
      } catch (err) {
        showAlert("Error rotating API key: " + err.message, 'error');
      }
    });
  };

  const handleRevokeKey = async () => {
    showConfirm("WARNING: Revoking the key will disconnect this application from the agent, and you cannot recover access unless you saved the key elsewhere. Proceed?", async () => {
      try {
        await client.revokeApiKey();
        navigate('/login');
      } catch (err) {
        showAlert("Error revoking API key: " + err.message, 'error');
      }
    });
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <header style={{ marginBottom: 40, borderBottom: '1px solid var(--border)', paddingBottom: 24 }}>
        <h1 style={{ fontSize: 48, marginBottom: 8, letterSpacing: '-0em' }}>AGENT DASHBOARD</h1>
        <p className="text-muted text-sm" style={{ textTransform: 'uppercase' }}>Overview of core memory functions and connection status.</p>
      </header>

      <div className="grid-container">
        
        {/* Identity Panel */}
        <div className="brutalist-panel">
          <div className="flex-between" style={{ marginBottom: 20 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/dream-logo-2.svg" alt="Logo" style={{ width: 20, height: 20, filter: 'grayscale(1) brightness(0.7)' }} /> IDENTITY
            </h3>
            <span style={{ padding: '4px 12px', border: '1px solid var(--primary)', color: 'var(--bg-color)', background: 'var(--primary)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
              ONLINE
            </span>
          </div>

          <div style={{ marginBottom: 24 }}>
            <span className="text-muted text-sm">DESIGNATION</span>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{agent?.name || 'UNKNOWN'}</div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <span className="text-muted text-sm">ENTITY ID</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Hash size={16} className="text-muted" />
              <code>{agent?.id}</code>
            </div>
          </div>

          <div>
            <span className="text-muted text-sm" style={{ display: 'block', marginBottom: 8 }}>AUTHORIZATION TOKEN</span>
            <div className="flex-between">
              <code>{client.apiKey ? `${client.apiKey.substring(0, 12)}...` : 'NONE'}</code>
              <button className="btn" style={{ padding: '6px 10px', height: 32 }} onClick={copyKey}>
                COPY
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button className="btn" style={{ flex: 1, borderColor: 'var(--text-muted)', color: 'var(--text-main)' }} onClick={handleRotateKey}>
                 ROTATE KEY
              </button>
              <button className="btn" style={{ flex: 1, borderColor: 'var(--text-muted)', color: 'var(--text-main)', borderStyle: 'dashed' }} onClick={handleRevokeKey}>
                 REVOKE
              </button>
            </div>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="brutalist-panel">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Activity className="text-muted" size={20} /> MEMORY INDEX
          </h3>

          {loading ? (
            <div className="text-muted">SYNCING DATA...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: 24, background: 'var(--bg-color)', border: '1px solid var(--border)' }}>
                <Database size={40} color="var(--primary)" style={{ marginRight: 24 }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 40, lineHeight: 1 }}>{stats?.total || 0}</div>
                  <div className="text-muted text-sm" style={{ marginTop: 8 }}>TOTAL MEMORIES</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid var(--border)', background: 'var(--border)' }}>
                {['episodic', 'semantic', 'procedural', 'self_model'].map(type => (
                  <div key={type} style={{ background: 'var(--bg-panel)', padding: 16, border: '1px solid var(--border)' }}>
                    <div className="text-muted text-sm" style={{ textTransform: 'uppercase' }}>{type.replace('_', ' ')}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>
                      {stats?.byType?.[type] || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
