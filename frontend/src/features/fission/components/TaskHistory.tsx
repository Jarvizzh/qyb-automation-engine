import React from 'react';
import { Play } from 'lucide-react';

interface TaskHistoryProps {
  historyTasks: any[];
  fetchHistory: () => void;
  viewHistoryLogs: (id: string) => void;
  downloadHistoryLogs: (id: string) => void;
  deleteHistoryTask: (id: string) => void;
}

export const TaskHistory: React.FC<TaskHistoryProps> = React.memo(({
  historyTasks,
  fetchHistory,
  viewHistoryLogs,
  downloadHistoryLogs,
  deleteHistoryTask
}) => {
  const filteredTasks = historyTasks.filter((t: any) => 
    t.task_type === 'fission'
  );

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3>裂变任务执行记录</h3>
        <button 
          className="btn btn-outline" 
          onClick={fetchHistory} 
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Play size={14} /> 刷新列表
        </button>
      </div>

      <div style={{ maxHeight: '600px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
        <table className="preview-table">
          <thead>
            <tr>
              <th>任务 ID</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map(task => (
              <tr key={task.id}>
                <td style={{ fontSize: '0.8rem', color: 'var(--accent-purple)' }}>{task.id}</td>
                <td>
                  <span className={`status-badge ${task.status === 'completed' ? 'status-success' : task.status === 'running' ? 'status-running' : 'status-stopped'}`} 
                    style={{ border: '1px solid transparent' }}>
                    {task.status === 'completed' ? '已完成' : task.status === 'running' ? '执行中' : '已停止'}
                  </span>
                </td>
                <td style={{ fontSize: '0.8rem' }}>
                  {new Date(task.created_at).toLocaleString('zh-CN', { hour12: false })}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => viewHistoryLogs(task.id)}>
                      查看日志
                    </button>
                    <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => downloadHistoryLogs(task.id)}>
                      下载日志
                    </button>
                    <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => deleteHistoryTask(task.id)}>
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>暂无历史任务记录</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

TaskHistory.displayName = 'TaskHistory';

