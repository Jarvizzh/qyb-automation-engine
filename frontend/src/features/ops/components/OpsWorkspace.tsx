import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useSession } from '../../../contexts/SessionContext';
import { useOpsCenter } from '../hooks/useOpsCenter';
import { Modal } from '../../../components/UI/Modal';

export const OpsWorkspace: React.FC = () => {
  const { sessions, selectedMobile, setSelectedMobile } = useSession();
  const opsContext = useOpsCenter();

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
      <div className="card">
        {/* Operations Center Sub-Tabs Navigation & Account Selector */}
        <div style={{
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1.5rem', 
          borderBottom: '1px solid var(--border-glass)', 
          paddingBottom: '1.5rem', 
          marginBottom: '2rem'
        }}>
          <div className="sub-tab-bar" style={{ marginBottom: 0 }}>
            <NavLink 
              to="/ops/reports" 
              className={({ isActive }) => `sub-tab ${isActive ? 'active' : ''}`}
            >
              📊 留存分析大盘
            </NavLink>
            <NavLink 
              to="/ops/group-send" 
              className={({ isActive }) => `sub-tab ${isActive ? 'active' : ''}`}
            >
              📣 群发任务分发
            </NavLink>
            <NavLink 
              to="/ops/sop" 
              className={({ isActive }) => `sub-tab ${isActive ? 'active' : ''}`}
            >
              ⚙️ SOP内容治理
            </NavLink>
            <NavLink 
              to="/ops/stats" 
              className={({ isActive }) => `sub-tab ${isActive ? 'active' : ''}`}
            >
              🏷️ 标签用户统计
            </NavLink>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>授权账号:</span>
            <select 
              value={selectedMobile} 
              onChange={e => setSelectedMobile(e.target.value)}
              style={{ width: '260px', padding: '0.5rem 1rem' }}
            >
              <option value="">选择企微宝账号</option>
              {sessions.map(s => (
                <option key={s.mobile} value={s.mobile}>
                  企微宝ID: {s.uid} ({s.mobile})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Guard: If no account is selected, prompt selection */}
        {!selectedMobile ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-dim)', animation: 'fadeIn 0.3s ease' }}>
            <ShieldCheck size={48} style={{ opacity: 0.15, marginBottom: '1.5rem', color: 'var(--accent-cyan)', margin: '0 auto 1.5rem' }} />
            <p style={{ fontSize: '1.1rem', color: 'white', fontWeight: 600 }}>请先选择授权账号以开启智能运营功能</p>
            <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>
              您可以在右上角的下拉菜单中选择一个已激活授权的企微宝账户来拉取实时数据
            </p>
          </div>
        ) : (
          /* Sub-panel Switch using Route Outlet */
          <Outlet context={opsContext} />
        )}
      </div>

      {/* History logs popup */}
      <Modal 
        isOpen={opsContext.showHistoryLogs} 
        onClose={() => opsContext.setShowHistoryLogs(false)} 
        title="历史日志回溯"
      >
        <div className="console" style={{ flex: 1, height: 'auto', overflowY: 'auto', maxHeight: '60vh' }}>
          {opsContext.historyLogs.map((log, i) => {
            let logClass = "log-info";
            if (log.includes("❌") || log.includes("🛑") || log.includes("错误")) logClass = "log-error";
            else if (log.includes("✅") || log.includes("执行完毕")) logClass = "log-success";
            return <div key={i} className={logClass}>{log}</div>;
          })}
        </div>
      </Modal>
    </div>
  );
};
