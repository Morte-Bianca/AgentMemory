import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import SessionGuard from './components/SessionGuard';
import { UIProvider } from './components/UIContext';

import Landing from './pages/Landing';
import Docs from './pages/Docs';
import ForAgents from './pages/ForAgents';
import Login from './pages/Login';
import Account from './pages/Account';
import Dashboard from './pages/Dashboard';
import Memories from './pages/Memories';
import Dreams from './pages/Dreams';
import Sessions from './pages/Sessions';

function App() {
  return (
    <UIProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/for-agents" element={<ForAgents />} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={
            <SessionGuard>
              <Account />
            </SessionGuard>
          } />
          
          <Route path="/app" element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="memories" element={<Memories />} />
            <Route path="dreams" element={<Dreams />} />
            <Route path="sessions" element={<Sessions />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </UIProvider>
  );
}

export default App;
