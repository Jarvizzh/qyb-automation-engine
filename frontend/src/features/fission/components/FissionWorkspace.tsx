import React from 'react';
import { useTaskExecution } from '../hooks/useTaskExecution';
import { FissionTerminal } from './FissionTerminal';
import { TaskPreviewTable } from './TaskPreviewTable';
import { LiveConsole } from './LiveConsole';
import { TaskHistory } from './TaskHistory';
import { Modal } from '../../../components/UI/Modal';

export const FissionWorkspace: React.FC = () => {
  const {
    previewTasks,
    concurrency,
    setConcurrency,
    logs,
    isTaskRunning,
    historyTasks,
    historyLogs,
    showHistoryLogs,
    setShowHistoryLogs,
    handleFileUpload,
    startTask,
    stopTask,
    fetchHistory,
    viewHistoryLogs,
    deleteHistoryTask,
    downloadHistoryLogs
  } = useTaskExecution();

  return (
    <>
      <FissionTerminal 
        concurrency={concurrency}
        setConcurrency={setConcurrency}
        isTaskRunning={isTaskRunning}
        startTask={startTask}
        stopTask={stopTask}
        handleFileUpload={handleFileUpload}
      />

      <TaskPreviewTable previewTasks={previewTasks} />

      <LiveConsole logs={logs} />

      <TaskHistory 
        historyTasks={historyTasks}
        fetchHistory={fetchHistory}
        viewHistoryLogs={viewHistoryLogs}
        downloadHistoryLogs={downloadHistoryLogs}
        deleteHistoryTask={deleteHistoryTask}
      />

      {/* History Log Viewer Modal */}
      <Modal 
        isOpen={showHistoryLogs} 
        onClose={() => setShowHistoryLogs(false)} 
        title="历史日志回溯"
      >
        <div className="console" style={{ flex: 1, height: 'auto', overflowY: 'auto' }}>
          {historyLogs.map((log, i) => {
            let logClass = "log-info";
            if (log.includes("❌") || log.includes("🛑") || log.includes("错误")) logClass = "log-error";
            else if (log.includes("✅") || log.includes("执行完毕")) logClass = "log-success";
            return <div key={i} className={logClass}>{log}</div>;
          })}
        </div>
      </Modal>
    </>
  );
};
