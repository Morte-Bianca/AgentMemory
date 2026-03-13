import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { client } from '../api/client';

const Login = () => {
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [user, setUser] = useState(client.user);
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);

  useEffect(() => {
    if (client.apiKey) {
      navigate('/app/dashboard', { replace: true });
      return;
    }

    if (client.sessionToken) {
      client.getAuthMe().then((data) => {
        setUser(data.user);
        navigate('/', { replace: true });
      }).catch((err) => {
        client.clearSession();
        setError(err.message);
      });
    }
  }, [navigate]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleButtonRef.current || !clientId || !window.google?.accounts?.id) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        if (!response.credential) {
          setError('Google login did not return a credential.');
          return;
        }

        setGoogleLoading(true);
        setError('');
        try {
          const data = await client.loginWithGoogle(response.credential);
          setUser(data.user);
          navigate('/', { replace: true });
        } catch (err) {
          setError(err.message);
        } finally {
          setGoogleLoading(false);
        }
      },
    });

    googleButtonRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: 340,
    });
  }, []);

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
          <h2 style={{ fontSize: 32 }}>LOGIN</h2>
          <p className="text-muted" style={{ marginTop: 8, fontSize: 13, textTransform: 'uppercase' }}>SIGN IN WITH GOOGLE FIRST. AGENT INITIALIZATION IS MANAGED SEPARATELY IN YOUR ACCOUNT.</p>
        </div>

        {error && (
          <div style={{ background: 'var(--bg-color)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: 12, marginBottom: 16, fontSize: 13, textTransform: 'uppercase' }}>
            {error}
          </div>
        )}

        {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <div style={{ background: 'var(--bg-color)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: 12, marginBottom: 16, fontSize: 13, textTransform: 'uppercase' }}>
            VITE_GOOGLE_CLIENT_ID is not configured.
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          {user ? (
            <div style={{ border: '1px solid var(--border)', padding: 16, background: 'var(--bg-panel)' }}>
              <div className="text-muted text-sm" style={{ marginBottom: 8, textTransform: 'uppercase' }}>Signed in</div>
              <div style={{ fontWeight: 700 }}>{user.name}</div>
              <div className="text-muted text-sm" style={{ marginTop: 4 }}>{user.email}</div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={() => navigate('/account')}>
                <ShieldCheck size={18} /> OPEN ACCOUNT
              </button>
            </div>
          ) : (
            <>
              <div ref={googleButtonRef} style={{ display: 'flex', justifyContent: 'center' }} />
              {googleLoading && <div className="text-muted text-sm" style={{ marginTop: 12, textAlign: 'center' }}>VERIFYING GOOGLE SESSION...</div>}
            </>
          )}
        </div>

        <button className="btn" style={{ width: '100%' }} onClick={() => navigate('/')}>
          <ArrowLeft size={18} /> BACK TO HOME
        </button>
      </div>
    </div>
  );
};

export default Login;
