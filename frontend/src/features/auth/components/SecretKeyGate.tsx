import React, { useState } from 'react';
import { Key, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useSession } from '../../../contexts/SessionContext';
import { useToast } from '../../../components/Toast/ToastContext';

export const SecretKeyGate: React.FC = () => {
  const { verifySecret } = useSession();
  const { addToast } = useToast();
  const [secretKey, setSecretKey] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!secretKey) return addToast("请输入系统密钥", "warning");
    setIsVerifying(true);
    await verifySecret(secretKey);

    setIsVerifying(false);
  };

  return (
    <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', padding: '3rem' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(168, 85, 247, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem'
        }}>
          <Key size={32} color="var(--accent-purple)" />
        </div>
        <h2 style={{ marginBottom: '1rem' }}>系统授权验证</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', fontSize: '0.9rem' }}>请输入系统密钥以解锁自动化引擎核心功能</p>
        
        <div className="input-group" style={{ textAlign: 'left' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
            <input 
              type={showSecret ? "text" : "password"} 
              value={secretKey} 
              onChange={e => setSecretKey(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
              placeholder="请输入系统密钥"
              style={{ width: '100%', paddingRight: '2.5rem', letterSpacing: showSecret ? 'normal' : '0.2em' }}
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
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
              {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        
        <button 
          className="btn btn-primary" 
          style={{ width: '100%', marginTop: '1rem' }} 
          onClick={handleVerify}
          disabled={isVerifying}
        >
          {isVerifying ? '正在验证...' : '立即激活系统'}
        </button>
        
        <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={14} /> 安全加密验证系统
        </div>
      </div>
    </div>
  );
};
