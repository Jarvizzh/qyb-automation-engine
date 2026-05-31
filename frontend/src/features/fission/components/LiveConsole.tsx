import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface LiveConsoleProps {
  logs: string[];
}

export const LiveConsole: React.FC<LiveConsoleProps> = ({ logs }) => {
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Terminal size={20} /> 实时监控台
      </h3>
      <div className="console" ref={consoleRef}>
        {logs.map((log, i) => {
          let logClass = "log-info";
          if (log.includes("❌") || log.includes("🛑") || log.includes("错误")) logClass = "log-error";
          else if (log.includes("✅") || log.includes("执行完毕")) logClass = "log-success";
          
          return <div key={i} className={logClass}>{log}</div>;
        })}
        {logs.length === 0 && <div style={{ color: 'var(--text-dim)', opacity: 0.5 }}>等待任务启动... [SYSTEM READY]</div>}
      </div>
    </div>
  );
};
