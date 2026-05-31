import React, { useState } from 'react';
import { UserCheck, Trash2, Eye, EyeOff } from 'lucide-react';
import { useSession } from '../../../contexts/SessionContext';
import { useToast } from '../../../components/Toast/ToastContext';

export const SessionManager: React.FC = () => {
  const { sessions, loginAccount, revokeSession } = useSession();
  const { addToast } = useToast();
  
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!mobile.trim()) return addToast("请输入手机号", "warning");
    if (!password.trim()) return addToast("请输入密码", "warning");

    setIsLoggingIn(true);
    const success = await loginAccount(mobile, password);
    setIsLoggingIn(false);
    if (success) {
      setMobile('');
      setPassword('');
    }
  };

  return (
    <div className="grid">
      <div className="card">
        <h3><UserCheck size={20} /> 添加账号授权</h3>
        <div className="input-group">
          <label>手机号</label>
          <input 
            type="text" 
            value={mobile} 
            onChange={e => setMobile(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleLogin()} 
            placeholder="企微宝登录手机号" 
          />
        </div>
        <div className="input-group">
          <label>密码</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleLogin()} 
              placeholder="企微宝登录密码" 
              style={{ width: '100%', paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 0,
                outline: 'none'
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleLogin} disabled={isLoggingIn}>
          {isLoggingIn ? '正在授权...' : '立即授权'}
        </button>
      </div>

      <div className="card">
        <h3>已授权列表</h3>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {sessions.map(s => (
            <div key={s.mobile} className="session-item">
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <span>账号：{s.mobile}</span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                  UID：<span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>{s.uid}</span>
                </span>
              </div>
              <button 
                className="btn btn-outline" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }} 
                onClick={() => revokeSession(s.mobile)}
              >
                <Trash2 size={14} /> 取消授权
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>暂无授权账号</p>
          )}
        </div>
      </div>
    </div>
  );
};
