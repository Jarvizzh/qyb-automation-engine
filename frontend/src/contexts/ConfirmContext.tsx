import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  showCancel?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  alert: (options: Omit<ConfirmOptions, 'showCancel'> | string) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
  const [resolveRef, setResolveRef] = useState<{ resolve: (value: boolean) => void } | null>(null);

  const confirm = (opt: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      const resolvedOptions = typeof opt === 'string' ? { message: opt } : opt;
      setOptions({
        title: resolvedOptions.title || '系统确认',
        message: resolvedOptions.message,
        confirmText: resolvedOptions.confirmText || '确定',
        cancelText: resolvedOptions.cancelText || '取消',
        type: resolvedOptions.type || 'info',
        showCancel: resolvedOptions.showCancel !== false,
      });
      setResolveRef({ resolve });
      setIsOpen(true);
    });
  };

  const alert = (opt: Omit<ConfirmOptions, 'showCancel'> | string) => {
    return new Promise<void>((resolve) => {
      const resolvedOptions = typeof opt === 'string' ? { message: opt } : opt;
      setOptions({
        title: resolvedOptions.title || '系统提示',
        message: resolvedOptions.message,
        confirmText: resolvedOptions.confirmText || '确定',
        cancelText: '',
        type: resolvedOptions.type || 'info',
        showCancel: false,
      });
      setResolveRef({
        resolve: () => resolve(),
      });
      setIsOpen(true);
    });
  };

  const handleConfirm = () => {
    if (resolveRef) resolveRef.resolve(true);
    setIsOpen(false);
    setResolveRef(null);
  };

  const handleCancel = () => {
    if (resolveRef) resolveRef.resolve(false);
    setIsOpen(false);
    setResolveRef(null);
  };

  const getIcon = (type?: 'danger' | 'warning' | 'info' | 'success') => {
    const size = 28;
    switch (type) {
      case 'danger':
        return <XCircle size={size} style={{ color: '#ef4444' }} />;
      case 'warning':
        return <AlertCircle size={size} style={{ color: '#f59e0b' }} />;
      case 'success':
        return <CheckCircle size={size} style={{ color: '#10b981' }} />;
      case 'info':
      default:
        return <Info size={size} style={{ color: 'var(--accent-cyan)' }} />;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {isOpen && (
        <div className="dialog-overlay">
          <div className="dialog-card">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ flexShrink: 0, marginTop: '2px' }}>
                {getIcon(options.type)}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  margin: '0 0 0.5rem 0', 
                  fontSize: '1.15rem', 
                  fontWeight: 700, 
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: 'none',
                  background: 'none'
                }}>
                  {options.title}
                </h3>
                <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  {options.message}
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
              {options.showCancel && (
                <button className="btn btn-outline" onClick={handleCancel} style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>
                  {options.cancelText}
                </button>
              )}
              <button 
                className={`btn ${options.type === 'danger' ? 'btn-danger' : 'btn-primary'}`} 
                onClick={handleConfirm} 
                style={{ 
                  padding: '0.5rem 1.25rem', 
                  fontSize: '0.9rem',
                  ...(options.type === 'danger' ? {} : { border: 'none', color: '#020617' })
                }}
              >
                {options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
};

export const useAlert = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useAlert must be used within a ConfirmProvider');
  }
  return context.alert;
};
