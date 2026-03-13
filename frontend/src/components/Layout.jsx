import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { BrainCircuit, Database, Moon, LogOut, Code2, Network } from 'lucide-react';
import { client } from '../api/client';

const Layout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    client.clearCredentials();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <BrainCircuit className="sidebar-logo-icon" size={28} />
          <span>Dreams Catcher</span>
        </div>

        <nav style={{ flex: 1 }}>
          <NavLink to="/app/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Code2 size={20} /> Dashboard
          </NavLink>
          <NavLink to="/app/memories" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Database size={20} /> Memories
          </NavLink>
          <NavLink to="/app/dreams" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Moon size={20} /> Dreams
          </NavLink>
          <NavLink to="/app/sessions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Network size={20} /> Sessions
          </NavLink>
        </nav>

        <div style={{ padding: '16px 0', borderTop: '1px solid var(--border)' }}>
          <div className="nav-link" style={{ marginBottom: 12, cursor: 'default' }}>
            <div style={{ width: 8, height: 8, background: 'var(--text-main)', border: '1px solid var(--text-main)' }}/>
            <span className="text-sm">{client.agent?.name || 'AGENT CONNECTED'}</span>
          </div>
          <button onClick={handleLogout} className="nav-link" style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
            <LogOut size={20} />
            <span style={{ fontSize: 13 }}>DISCONNECT</span>
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
