import React, { useState } from 'react';
import { Key, ShieldCheck } from 'lucide-react';
import { useSession } from '../../../contexts/SessionContext';
import { useToast } from '../../../components/Toast/ToastContext';

export const SecretKeyGate: React.FC = () => {
  const { verifySecret } = useSession();
  const { addToast } = useToast();
  const [secretKey, setSecretKey] = useState('');
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
          <input 
            type="password" 
            value={secretKey} 
            onChange={e => setSecretKey(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
            placeholder="请输入系统密钥"
            style={{ letterSpacing: '0.2em' }}
          />
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
