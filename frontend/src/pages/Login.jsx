import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Plus } from 'lucide-react';
import { client } from '../api/client';

const Login = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await client.createAgent(name || `CLAW-${Math.floor(Math.random()*1000)}`);
      // Create agent sets the credentials internally
      navigate('/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: 20 }}>
      <div className="brutalist-panel" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="flex-center" style={{ 
            width: 80, height: 80, margin: '0 auto 24px', 
            background: 'var(--text-main)',
            border: '2px solid var(--text-main)'
          }}>
            <img src="/dream-logo-2.svg" alt="Dream Catcher AI" style={{ width: 56, height: 56, filter: 'invert(1)' }} />
          </div>
          <h2 style={{ fontSize: 32 }}>INITIALIZE AGENT</h2>
          <p className="text-muted" style={{ marginTop: 8, fontSize: 13, textTransform: 'uppercase' }}>CONNECT TO THE HTTP MEMORY API</p>
        </div>

        {error && (
          <div style={{ background: 'var(--bg-color)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: 12, marginBottom: 16, fontSize: 13, textTransform: 'uppercase' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleCreateAgent}>
          <div className="input-group">
            <label className="input-label">AGENT DESIGNATION (OPTIONAL)</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. CLAW-007"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: 24, padding: 16, fontSize: 16 }}
            disabled={loading}
          >
            {loading ? <Fingerprint className="animate-pulse" /> : <Plus />}
            {loading ? 'INITIALIZING CORE...' : 'CREATE NEW AGENT'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
