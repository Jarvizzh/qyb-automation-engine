import React from 'react';
import { Upload, Play, Square } from 'lucide-react';
import { useSession } from '../../../contexts/SessionContext';

interface FissionTerminalProps {
  concurrency: number;
  setConcurrency: (n: number) => void;
  isTaskRunning: boolean;
  startTask: () => void;
  stopTask: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FissionTerminal: React.FC<FissionTerminalProps> = ({
  concurrency,
  setConcurrency,
  isTaskRunning,
  startTask,
  stopTask,
  handleFileUpload
}) => {
  const { sessions, selectedMobile, setSelectedMobile } = useSession();

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={selectedMobile} 
            onChange={e => setSelectedMobile(e.target.value)}
            style={{ width: '300px' }}
          >
            <option value="">选择企微宝账号</option>
            {sessions.map(s => <option key={s.mobile} value={s.mobile}>企微宝ID: {s.uid}</option>)}
          </select>
          <label className="btn btn-outline">
            <Upload size={18} /> 上传 Excel
            <input type="file" hidden onChange={handleFileUpload} accept=".xlsx,.xls" />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>并发数:</span>
            <select 
              value={concurrency} 
              onChange={e => setConcurrency(parseInt(e.target.value))}
              style={{ width: '80px', padding: '0.4rem' }}
              disabled={isTaskRunning}
            >
              {[4, 8, 12].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {!isTaskRunning ? (
            <button className="btn btn-primary" onClick={startTask}>
              <Play size={18} /> 开始执行
            </button>
          ) : (
            <button className="btn btn-danger" onClick={() => stopTask()}>
              <Square size={18} /> 强制停止
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
