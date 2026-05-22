import React from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { useToast } from './ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts } = useToast();

  const container = (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' && <CheckCircle size={20} />}
          {t.type === 'error' && <XCircle size={20} />}
          {t.type === 'warning' && <AlertCircle size={20} />}
          {t.type === 'info' && <Info size={20} />}
          <div className="toast-message">{t.message}</div>
        </div>
      ))}
    </div>
  );

  // Render into body since toast container needs fixed positioning on top
  return ReactDOM.createPortal(container, document.body);
};
