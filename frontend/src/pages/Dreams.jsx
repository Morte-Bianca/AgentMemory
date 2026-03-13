import React, { useEffect, useState } from 'react';
import { Moon, RefreshCw, Sparkles, Brain } from 'lucide-react';
import { client } from '../api/client';
import { useUI } from '../components/UIContext';

const Dreams = () => {
  const [dreams, setDreams] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const { showAlert } = useUI();

  const fetchDreamsAndSchedule = async () => {
    setLoading(true);
    try {
      const [dreamsData, scheduleData] = await Promise.all([
        client.getDreams(),
        client.getDreamSchedule()
      ]);
      setDreams(dreamsData.dreams || []);
      setSchedule(scheduleData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDreamsAndSchedule();
  }, []);

  const triggerDream = async () => {
    setRunning(true);
    try {
      await client.runDream();
      showAlert('DREAM SYNTHESIS TRIGGERED. IT RUNS ASYNCHRONOUSLY.', 'info');
      // Refresh dreams after a short delay
      setTimeout(fetchDreamsAndSchedule, 3000);
    } catch (err) {
      showAlert('FAILED TO TRIGGER DREAM: ' + err.message, 'error');
    } finally {
      setRunning(false);
    }
  };

  const toggleSchedule = async () => {
    try {
      if (schedule?.enabled) {
        await client.stopDreamSchedule();
      } else {
        await client.startDreamSchedule();
      }
      fetchDreamsAndSchedule();
    } catch (err) {
      showAlert("ERROR TOGGLING SCHEDULE: " + err.message, 'error');
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <header className="flex-between" style={{ marginBottom: 40, borderBottom: '1px solid var(--border)', paddingBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 48, marginBottom: 8, letterSpacing: '-0em' }}>DREAM CONTROL</h1>
          <p className="text-muted text-sm" style={{ textTransform: 'uppercase' }}>Synthesize new procedural and semantic memories while resting.</p>
        </div>
        <button className="btn btn-primary" onClick={triggerDream} disabled={running}>
          {running ? <RefreshCw className="animate-spin" /> : <Sparkles />}
          {running ? 'SYNTHESIZING...' : 'TRIGGER DREAM'}
        </button>
      </header>

      {error && <div style={{ background: 'var(--bg-color)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: 12, marginBottom: 16, fontSize: 13, textTransform: 'uppercase' }}>{error}</div>}

      <div className="brutalist-panel" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `8px solid ${schedule?.enabled ? 'var(--text-main)' : 'var(--border)'}` }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
             BACKGROUND PROCESSING
             {schedule?.enabled && <span style={{ padding: '2px 8px', background: 'var(--text-main)', color: 'var(--bg-color)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>ACTIVE</span>}
          </h3>
          <p className="text-sm text-muted" style={{ marginTop: 8, textTransform: 'uppercase' }}>
            When enabled, the server will autonomously synthesize memories while the agent is idle.
          </p>
        </div>
        <button onClick={toggleSchedule} className="btn" style={{ borderColor: schedule?.enabled ? 'var(--primary)' : 'var(--text-muted)', color: schedule?.enabled ? 'var(--bg-color)' : 'var(--text-main)', background: schedule?.enabled ? 'var(--primary)' : 'transparent' }}>
          {schedule?.enabled ? 'STOP SCHEDULE' : 'START SCHEDULE'}
        </button>
      </div>

      <div className="brutalist-panel">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <Brain className="text-muted" size={20} /> PAST DREAMS
        </h3>

        {loading ? (
          <div className="text-muted text-center" style={{ padding: 40, textTransform: 'uppercase' }}>LOADING LOGS...</div>
        ) : dreams.length === 0 ? (
          <div className="text-muted flex-center" style={{ flexDirection: 'column', padding: '60px 0', border: '1px solid var(--border)', background: 'var(--bg-color)', textTransform: 'uppercase' }}>
            <Moon size={40} style={{ margin: '0 auto 16px' }} />
            NO DREAMS RECORDED YET. TRY TRIGGERING ONE.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {dreams.map(dream => (
              <div key={dream.id} style={{ padding: 16, background: 'var(--bg-panel)', border: '1px solid var(--border)' }}>
                <div className="flex-between" style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>CYCLE #{dream.id.slice(0,8)}</div>
                  <div className="text-muted text-sm" style={{ fontWeight: 700 }}>{new Date(dream.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-sm">
                  <span className="text-muted" style={{ textTransform: 'uppercase' }}>GENERATED: </span>
                  <strong>{dream?.stats?.generatedMemories || 0}</strong> MEMORIES 
                  <span className="text-muted ml-4" style={{ marginLeft: 16, textTransform: 'uppercase' }}> EPISODES SELECTED: </span>
                  <strong>{dream?.stats?.selectedEpisodes || 0}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dreams;
