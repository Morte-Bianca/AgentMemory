import React, { useEffect, useState } from 'react';
import { Search, Plus, Loader, Database, ChevronDown } from 'lucide-react';
import { client } from '../api/client';
import { useUI } from '../components/useUI';

const CustomSelect = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <div 
        className="input-field" 
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setOpen(!open)}
      >
        {options.find(o => o.value === value)?.label || 'SELECT...'}
        <ChevronDown size={16} className="text-muted" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
      </div>
      
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            zIndex: 10,
            boxShadow: '8px 8px 0 var(--border)',
            display: 'flex', flexDirection: 'column'
          }}>
            {options.map(opt => (
              <div 
                key={opt.value}
                className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Memories = () => {
  const [query, setQuery] = useState('');
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [newMemText, setNewMemText] = useState('');
  const [newMemType, setNewMemType] = useState('episodic');
  const [adding, setAdding] = useState(false);
  const { showAlert } = useUI();

  useEffect(() => {
    let active = true;

    client.listMemories()
      .then((data) => {
        if (!active) {
          return;
        }
        setMemories(data.memories || []);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        setError(err.message);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query) return;
    setLoading(true);
    setError('');
    try {
      const data = await client.recallMemories({ query, limit: 10 });
      setMemories(data.memories || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e?.preventDefault();
    if (!newMemText) return;
    setAdding(true);
    try {
      await client.addMemory({
        content: newMemText,
        type: newMemType,
      });
      setNewMemText('');
      showAlert('MEMORY ADDED SUCCESSFULLY', 'success');

      if (query) {
        await handleSearch();
      } else {
        const listData = await client.listMemories();
        setMemories(listData.memories || []);
      }
    } catch (err) {
      showAlert('ERROR ADDING MEMORY: ' + err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <header style={{ marginBottom: 40, borderBottom: '1px solid var(--border)', paddingBottom: 24 }}>
        <h1 style={{ fontSize: 48, marginBottom: 8, letterSpacing: '-0em' }}>MEMORY EXPLORER</h1>
        <p className="text-muted text-sm" style={{ textTransform: 'uppercase' }}>Search existing associative memories or encode new experiences.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 24, alignItems: 'start' }}>
        
        {/* Inject Memory Panel */}
        <div className="brutalist-panel" style={{ position: 'sticky', top: 40 }}>
          <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={20} className="text-muted" /> ENCODE MEMORY
          </h3>
          <form onSubmit={handleAdd}>
            <div className="input-group">
              <label className="input-label">CONTENT</label>
              <textarea 
                className="input-field" 
                rows="4" 
                placeholder="Describe the experience or fact..."
                value={newMemText}
                onChange={(e) => setNewMemText(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label">MEMORY TYPE</label>
              <CustomSelect
                value={newMemType}
                onChange={(val) => setNewMemType(val)}
                options={[
                  { value: 'episodic', label: 'EPISODIC (EVENTS)' },
                  { value: 'semantic', label: 'SEMANTIC (FACTS)' },
                  { value: 'procedural', label: 'PROCEDURAL (HOW-TOS)' }
                ]}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={adding}>
              {adding ? 'ENCODING...' : 'INJECT MEMORY'}
            </button>
          </form>
        </div>

        {/* Recall & Search Panel */}
        <div className="brutalist-panel">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <input 
              type="text" 
              className="input-field" 
              style={{ flex: 1 }} 
              placeholder="Query memory banks..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader className="animate-pulse" size={18} /> : <Search size={18} />}
              RECALL
            </button>
          </form>

          {error && <div style={{ background: 'var(--bg-color)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: 12, marginBottom: 16, fontSize: 13, textTransform: 'uppercase' }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {memories.length === 0 && !loading && (
              <div className="text-muted flex-center" style={{ flexDirection: 'column', padding: '40px 0', border: '1px solid var(--border)', background: 'var(--bg-color)' }}>
                <Database size={32} style={{ opacity: 0.5, margin: '0 auto 12px' }} />
                NO MEMORIES RECALLED.
              </div>
            )}
            {memories.map((mem) => (
              <div key={mem.id} style={{ padding: 16, background: 'var(--bg-panel)', border: '1px solid var(--border)' }}>
                <div className="flex-between" style={{ marginBottom: 12 }}>
                  <span className={`badge badge-${mem.type}`}>{mem.type}</span>
                  <span className="text-muted text-sm" style={{ fontWeight: 700 }}>
                    {typeof mem.score === 'number' ? `SCORE: ${(mem.score * 100).toFixed(1)}%` : new Date(mem.createdAt).toLocaleString()}
                  </span>
                </div>
                <div style={{ lineHeight: 1.6, marginTop: 12 }}>{mem.content}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Memories;
