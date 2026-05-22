import React from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useSession } from './contexts/SessionContext';
import { SecretKeyGate } from './features/auth/components/SecretKeyGate';
import { SessionManager } from './features/auth/components/SessionManager';
import { FissionWorkspace } from './features/fission/components/FissionWorkspace';
import { OpsWorkspace } from './features/ops/components/OpsWorkspace';
import { GroupSendTab } from './features/ops/components/GroupSendTab';
import { SopTab } from './features/ops/components/SopTab';
import { RetentionReportsTab } from './features/ops/components/RetentionReportsTab';
import { StatsTab } from './features/ops/components/StatsTab';
import './App.css';

const App: React.FC = () => {
  const { isVerified, logout } = useSession();

  if (isVerified === null) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}>
        <div className="loading-spinner"></div>
        <span style={{ marginLeft: '1rem' }}>系统初始化中...</span>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="container">
        <SecretKeyGate />
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">AUTOMATION ENGINE CORE</h1>
        <div className="status-group">
          <button 
            className="btn btn-outline" 
            style={{ marginLeft: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
            onClick={logout}
          >
            <LogOut size={16} style={{ marginRight: '0.4rem' }} /> 退出系统
          </button>
        </div>
      </header>
      
      <div className="tab-bar">
        <NavLink 
          to="/auth" 
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
        >
          ACCESS AUTH
        </NavLink>
        <NavLink 
          to="/fission" 
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
        >
          FISSION CORE
        </NavLink>
        <NavLink 
          to="/ops" 
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
        >
          OPS CENTER
        </NavLink>
      </div>

      <Routes>
        <Route path="/auth" element={<SessionManager />} />
        <Route path="/fission" element={<FissionWorkspace />} />
        <Route path="/ops" element={<OpsWorkspace />}>
          <Route index element={<Navigate to="reports" replace />} />
          <Route path="group-send" element={<GroupSendTab />} />
          <Route path="sop" element={<SopTab />} />
          <Route path="reports" element={<RetentionReportsTab />} />
          <Route path="stats" element={<StatsTab />} />
        </Route>
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </div>
  );
};

export default App;
