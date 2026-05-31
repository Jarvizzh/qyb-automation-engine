import React, { useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Play, Square, Download, RefreshCw, Terminal as TermIcon, FileText } from 'lucide-react';

export const ClearFriendsTab: React.FC = () => {
  const {
    selectedMobile,
    corps,
    fetchCorps,
    
    // Clear states & handlers
    selectedClearCorp,
    setSelectedClearCorp,
    clearZombieType,
    setClearZombieType,
    clearTagName,
    setClearTagName,
    clearLogs,
    isClearTaskRunning,
    isClearActionRunning,
    handleStartClearFriends,
    handleStopClearFriends,
    downloadClearLogs,
    corpTags,
    isTagsLoading,
    
    // History
    historyTasks,
    fetchHistory,
    viewHistoryLogs,
    downloadHistoryLogs,
    deleteHistoryTask,
    stopTask
  } = useOutletContext<any>();

  const consoleRef = useRef<HTMLDivElement>(null);

  // Fetch corps list and history on mount or when account changes
  useEffect(() => {
    if (selectedMobile) {
      fetchCorps();
      fetchHistory();
    }
  }, [selectedMobile, fetchCorps, fetchHistory]);

  // Scroll live console to the bottom on new logs
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [clearLogs]);

  // Filter tasks to strictly list only clear friends tasks
  const filteredHistory = historyTasks.filter((t: any) => 
    t.task_type === 'clear_friends'
  );

  // Frontend Pagination States
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const pageSize = 10;
  const totalItems = filteredHistory.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  useEffect(() => {
    if (currentPage > 1 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedTasks = filteredHistory.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      {/* 1. Header & Configuration Card */}
      <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.01)' }}>
        <h4 style={{ color: 'var(--accent-pink)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.5rem 0' }}>
          🧹 流失客户一键清理工具
        </h4>
        
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Target Corporation Select */}
          <div className="input-group" style={{ flex: '1 1 250px', marginBottom: 0 }}>
            <label>选择目标企业简称</label>
            <select 
              value={selectedClearCorp} 
              onChange={e => setSelectedClearCorp(e.target.value)}
              disabled={isClearTaskRunning}
              style={{ width: '100%' }}
            >
              <option value="">-- 请选择企业简称 --</option>
              {corps.map((corpName: string) => (
                <option key={corpName} value={corpName}>{corpName}</option>
              ))}
            </select>
          </div>

          {/* Target Friend Relationship Type Select */}
          <div className="input-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
            <label>待清理好友类型</label>
            <select 
              value={clearZombieType} 
              onChange={e => setClearZombieType(e.target.value)}
              disabled={isClearTaskRunning}
              style={{ width: '100%' }}
            >
              <option value="3">流失好友</option>
              <option value="2">拉黑好友</option>
            </select>
          </div>

          {/* Optional Tag Filter Select Dropdown */}
          <div className="input-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
            <label>企业标签过滤 (可选)</label>
            <select 
              value={clearTagName} 
              onChange={e => setClearTagName(e.target.value)}
              disabled={isClearTaskRunning || isTagsLoading}
              style={{ width: '100%' }}
            >
              <option value="">-- 不进行标签过滤 (全部) --</option>
              {isTagsLoading ? (
                <option disabled>正在读取企业标签...</option>
              ) : (
                corpTags.map((tag: any) => (
                  <option key={tag.id} value={tag.name}>
                    [{tag.group}] {tag.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
            {!isClearTaskRunning ? (
              <button 
                className="btn btn-primary" 
                onClick={handleStartClearFriends} 
                disabled={isClearActionRunning || !selectedClearCorp}
                style={{ padding: '0.6rem 1.2rem', gap: '0.4rem' }}
              >
                <Play size={16} /> 开始清理
              </button>
            ) : (
              <button 
                className="btn btn-danger" 
                onClick={handleStopClearFriends}
                style={{ padding: '0.6rem 1.2rem', gap: '0.4rem' }}
              >
                <Square size={16} /> 强制停止
              </button>
            )}

            <button 
              className="btn btn-outline" 
              onClick={downloadClearLogs} 
              disabled={clearLogs.length === 0}
              style={{ padding: '0.6rem 1.2rem', gap: '0.4rem' }}
            >
              <Download size={16} /> 下载日志
            </button>
          </div>
        </div>

        {/* Safety tips badge */}
        <div style={{ 
          marginTop: '1.2rem', 
          padding: '0.75rem 1rem', 
          borderRadius: '8px', 
          backgroundColor: 'rgba(239, 68, 68, 0.05)', 
          border: '1px solid rgba(239, 68, 68, 0.15)',
          fontSize: '0.85rem',
          color: 'var(--text-dim)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ color: '#ef4444', fontWeight: 600 }}>🛡️ 安全保护策略启用</span>：系统已强制屏蔽正常活跃关系客户 (zombie_type=1) 的删除通道。任务启动前会自动进行待删除人数估算，以防误操作。
        </div>
      </div>

      {/* 2. Real-time Live Terminal Console */}
      <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--border-glass)' }}>
        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: 'var(--accent-cyan)' }}>
          <TermIcon size={20} /> 实时清理监控台
        </h4>
        <div className="console" ref={consoleRef} style={{ height: '350px', overflowY: 'auto' }}>
          {clearLogs.map((log: string, i: number) => {
            let logClass = "log-info";
            if (log.includes("❌") || log.includes("🛑") || log.includes("错误")) logClass = "log-error";
            else if (log.includes("✅") || log.includes("执行完毕")) logClass = "log-success";
            
            return <div key={i} className={logClass}>{log}</div>;
          })}
          {clearLogs.length === 0 && (
            <div style={{ color: 'var(--text-dim)', opacity: 0.5, textAlign: 'center', paddingTop: '6rem' }}>
              <TermIcon size={36} style={{ opacity: 0.1, margin: '0 auto 1rem' }} />
              <div>等待客户清理任务启动... [SYSTEM READY]</div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Cleanup History List */}
      <div className="card" style={{ border: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-purple)' }}>
            <FileText size={20} /> 清理任务执行历史
          </h4>
          <button className="btn btn-outline" onClick={() => fetchHistory()} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            <RefreshCw size={14} style={{ marginRight: '0.4rem' }} /> 刷新
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="preview-table">
            <thead>
              <tr>
                <th>任务标识</th>
                <th>清理目标与企业</th>
                <th>启动时间</th>
                <th>清理进度</th>
                <th>运行状态</th>
                <th style={{ textAlign: 'center' }}>管理操作</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.map((task: any) => {
                const isTaskRunningNow = task.status === 'running';
                const deletedCount = task.stats?.sent || 0;
                return (
                  <tr key={task.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-dim)' }}>{task.id}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>{task.filename}</span>
                    </td>
                    <td>{new Date(task.created_at).toLocaleString('zh-CN')}</td>
                    <td>
                      <span className="badge badge-purple" style={{ fontFamily: 'monospace' }}>
                        已清理: {deletedCount} 人
                      </span>
                    </td>
                    <td>
                      {task.status === 'running' && <span className="badge badge-cyan">● 清理中</span>}
                      {task.status === 'completed' && <span className="badge badge-success">已完成</span>}
                      {task.status === 'stopped' && <span className="badge badge-gray">已停止</span>}
                      {task.status === 'failed' && <span className="badge badge-gray">执行失败</span>}
                    </td>
                    <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => viewHistoryLogs(task.id)}
                      >
                        查看日志
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderColor: 'var(--border-glass)' }}
                        onClick={() => downloadHistoryLogs(task.id)}
                      >
                        导出日志
                      </button>
                      {isTaskRunningNow ? (
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => stopTask(task.id)}
                        >
                          停止
                        </button>
                      ) : (
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                          onClick={() => deleteHistoryTask(task.id)}
                        >
                          删除
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    暂无已流失客户清理历史任务记录。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginTop: '1.5rem', 
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-glass)',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              显示第 {(currentPage - 1) * pageSize + 1} 到 {Math.min(currentPage * pageSize, totalItems)} 条，共 {totalItems} 条记录
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                className="btn btn-outline" 
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                上一页
              </button>
              <span style={{ fontSize: '0.85rem', color: 'white', padding: '0 0.5rem' }}>
                {currentPage} / {totalPages}
              </span>
              <button 
                className="btn btn-outline" 
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
