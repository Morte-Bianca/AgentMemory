import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Fingerprint, KeyRound, LogIn, ShieldCheck, UserCircle2 } from 'lucide-react';
import { client } from '../api/client';
import { useUI } from '../components/useUI';

const Account = () => {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useUI();
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(client.user);
  const [agent, setAgent] = useState(client.agent);
  const [agentName, setAgentName] = useState(client.agent?.name || '');

  useEffect(() => {
    let active = true;

    client.getAuthMe()
      .then((data) => {
        if (!active) {
          return;
        }

        setUser(data.user);
        setAgent(data.agent || null);
        setAgentName((current) => current || data.agent?.name || data.user?.name || '');
      })
      .catch((err) => {
        if (!active) {
          return;
        }

        client.clearSession();
        setError(err.message);
        navigate('/login', { replace: true });
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  const keyLabel = useMemo(() => {
    if (client.apiKey) {
      return `${client.apiKey.slice(0, 12)}...`;
    }

    if (agent?.apiKeyPrefix) {
      return `${agent.apiKeyPrefix}...`;
    }

    return 'NO API KEY ISSUED IN THIS BROWSER';
  }, [agent]);

  const handleIssueKey = async () => {
    setIssuing(true);
    setError('');

    try {
      const data = await client.initializeIdentity(agentName.trim() || undefined);
      setAgent(data.agent);
      if (!agentName.trim()) {
        setAgentName(data.agent.name);
      }
      showAlert(data.created ? 'Agent initialized and API key issued.' : 'New API key issued for your agent.', 'success');
    } catch (err) {
      setError(err.message);
      showAlert(err.message, 'error');
    } finally {
      setIssuing(false);
    }
  };

  const handleCopyKey = async () => {
    if (!client.apiKey) {
      showAlert('Issue a new API key first. Full keys are only shown when created or rotated.', 'error');
      return;
    }

    await navigator.clipboard.writeText(client.apiKey);
    showAlert('API key copied to clipboard.', 'success');
  };

  const handleRevokeKey = () => {
    if (!client.apiKey) {
      showAlert('Load a current API key in this browser before revoking it.', 'error');
      return;
    }

    showConfirm('Revoke the active API key for this agent?', async () => {
      setRevoking(true);
      setError('');
      try {
        await client.revokeApiKey();
        const refreshed = await client.getAuthMe();
        setUser(refreshed.user);
        setAgent(refreshed.agent || null);
        showAlert('API key revoked.', 'success');
      } catch (err) {
        setError(err.message);
        showAlert(err.message, 'error');
      } finally {
        setRevoking(false);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', padding: 20 }}>
        <div className="brutalist-panel" style={{ width: '100%', maxWidth: 720 }}>
          <div className="text-muted text-sm">SYNCING ACCOUNT...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: 20 }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <header style={{ marginBottom: 32, borderBottom: '1px solid var(--border)', paddingBottom: 24 }}>
          <h1 style={{ fontSize: 44, marginBottom: 8 }}>ACCOUNT</h1>
          <p className="text-muted text-sm" style={{ textTransform: 'uppercase' }}>
            Manage your Google session, owned agent, and current API key lifecycle.
          </p>
        </header>

        {error && (
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: 12, marginBottom: 20, fontSize: 13, textTransform: 'uppercase' }}>
            {error}
          </div>
        )}

        <div className="grid-container">
          <div className="brutalist-panel">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <UserCircle2 size={20} /> GOOGLE SESSION
            </h3>

            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <div className="text-muted text-sm">NAME</div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700 }}>{user?.name || 'UNKNOWN USER'}</div>
              </div>
              <div>
                <div className="text-muted text-sm">EMAIL</div>
                <div style={{ marginTop: 6, fontSize: 16 }}>{user?.email}</div>
              </div>
              <div>
                <div className="text-muted text-sm">STATUS</div>
                <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: '1px solid var(--border)' }}>
                  <ShieldCheck size={16} /> SIGNED IN
                </div>
              </div>
            </div>
          </div>

          <div className="brutalist-panel">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Fingerprint size={20} /> OWNED AGENT
            </h3>

            <div className="input-group" style={{ marginBottom: 16 }}>
              <label className="input-label">AGENT DESIGNATION</label>
              <input
                type="text"
                className="input-field"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g. CLAW-007"
              />
            </div>

            {agent ? (
              <div style={{ border: '1px solid var(--border)', background: 'var(--bg-color)', padding: 16, marginBottom: 18 }}>
                <div className="text-muted text-sm">CURRENT AGENT</div>
                <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>{agent.name}</div>
                <div className="text-muted text-sm" style={{ marginTop: 8 }}>ID: {agent.id}</div>
                <div className="text-muted text-sm" style={{ marginTop: 8 }}>
                  STATUS: {agent.apiKeyStatus?.toUpperCase?.() || 'UNKNOWN'}
                </div>
                <div className="text-muted text-sm" style={{ marginTop: 8 }}>
                  PREFIX: {agent.apiKeyPrefix || 'N/A'}
                </div>
              </div>
            ) : (
              <div style={{ border: '1px dashed var(--border)', padding: 16, marginBottom: 18 }}>
                <div className="text-muted text-sm">No owned agent exists yet for this Google account.</div>
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={handleIssueKey}
              disabled={issuing}
            >
              <KeyRound size={18} />
              {issuing ? 'PROCESSING...' : agent ? 'ISSUE / ROTATE API KEY' : 'INITIALIZE AGENT'}
            </button>

            <p className="text-muted text-sm" style={{ marginTop: 12 }}>
              One owned agent per Google account is currently supported. Issuing a new key rotates the previous one immediately.
            </p>
          </div>

          <div className="brutalist-panel">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <LogIn size={20} /> API KEY ACCESS
            </h3>

            <div style={{ border: '1px solid var(--border)', background: 'var(--bg-color)', padding: 16, marginBottom: 18 }}>
              <div className="text-muted text-sm">CURRENT KEY</div>
              <div style={{ marginTop: 8, fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>{keyLabel}</div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <button className="btn" type="button" onClick={handleCopyKey}>
                <Copy size={18} /> COPY KEY
              </button>

              <button
                className="btn"
                type="button"
                onClick={handleRevokeKey}
                disabled={revoking || !client.apiKey}
                style={{ opacity: client.apiKey ? 1 : 0.5 }}
              >
                <KeyRound size={18} /> {revoking ? 'REVOKING...' : 'REVOKE CURRENT KEY'}
              </button>

              <button
                className="btn btn-primary"
                type="button"
                disabled={!client.apiKey}
                style={{ opacity: client.apiKey ? 1 : 0.5 }}
                onClick={() => navigate('/app/dashboard')}
              >
                <ShieldCheck size={18} /> OPEN DASHBOARD
              </button>
            </div>

            <p className="text-muted text-sm" style={{ marginTop: 12 }}>
              Protected API routes still require the API key. Google login is only used to bootstrap and recover agent access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;