import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, RefreshCw, Loader2, Play, Terminal } from 'lucide-react';
import { useSession } from '../../../contexts/SessionContext';

export const GroupSendTab: React.FC = () => {
  const { selectedMobile } = useSession();
  const {
    gsModule,
    setGsModule,
    gsGroups,
    selectedGsGroupId,
    setSelectedGsGroupId,
    gsTasks,
    selectedGsTaskId,
    setSelectedGsTaskId,
    randomizeStyle,
    setRandomizeStyle,
    replaceSourceUrl,
    setReplaceSourceUrl,
    replaceNewUrl,
    setReplaceNewUrl,
    replaceStyle,
    setReplaceStyle,
    isGsLoading,
    isGsActionRunning,
    fetchGsGroups,
    fetchGsTasks,
    handleStartRandomize,
    handleStartReplacement,
    historyTasks,
    viewHistoryLogs,
    downloadHistoryLogs,
    deleteHistoryTask,
    stopTask,
    fetchHistory
  } = useOutletContext<any>();

  // Active pull of group lists on mount or selectedMobile changes
  useEffect(() => {
    if (selectedMobile) {
      fetchGsGroups();
    }
  }, [selectedMobile]);


  const filteredHistory = historyTasks.filter((t: any) => 
    t.filename && t.filename.startsWith("运营群发治理")
  );

  return (
    <div>
      {/* Controls Row */}
      <div className="card" style={{
        padding: '1.5rem',
        marginBottom: '2rem',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-glass)',
        borderRadius: '16px'
      }}>
        <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={18} /> 目标群发任务筛选
        </h4>
        <div style={{
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '1.5rem', 
          alignItems: 'flex-end'
        }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>群发模式</label>
            <select 
              value={gsModule} 
              onChange={e => {
                const val = Number(e.target.value);
                setGsModule(val);
                fetchGsGroups(val);
              }}
            >
              <option value={19}>极速群发</option>
              <option value={7}>高级群发</option>
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>任务分组</label>
            <select 
              value={selectedGsGroupId} 
              onChange={e => {
                const val = e.target.value;
                if (val === 'ALL') {
                  setSelectedGsGroupId('ALL');
                  setSelectedGsTaskId('ALL');
                } else {
                  const numVal = val ? Number(val) : '';
                  setSelectedGsGroupId(numVal);
                  setSelectedGsTaskId('');
                  if (numVal) {
                    fetchGsTasks(numVal);
                  }
                }
              }}
            >
              <option value="">请选择分组</option>
              <option value="ALL">ALL (所有分组)</option>
              {gsGroups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>目标任务</label>
            <select 
              value={selectedGsTaskId} 
              disabled={selectedGsGroupId === 'ALL'}
              onChange={e => {
                const val = e.target.value;
                if (val === 'ALL') {
                  setSelectedGsTaskId('ALL');
                } else {
                  setSelectedGsTaskId(val ? Number(val) : '');
                }
              }}
            >
              {selectedGsGroupId === 'ALL' ? (
                <option value="ALL">ALL (所有分组下的所有任务)</option>
              ) : (
                <>
                  <option value="">请选择任务</option>
                  <option value="ALL">ALL (当前分组下的所有任务)</option>
                  {gsTasks.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </>
              )}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-outline" 
              style={{ height: '42px', width: '42px', padding: 0, minWidth: 'auto' }} 
              onClick={() => {
                fetchGsGroups();
                if (selectedGsGroupId && selectedGsGroupId !== 'ALL') {
                  fetchGsTasks(Number(selectedGsGroupId));
                }
              }}
              disabled={isGsLoading}
              title="刷新列表"
            >
              <RefreshCw className={isGsLoading ? "animate-spin" : ""} size={18} />
            </button>
          </div>
        </div>
      </div>

      {isGsLoading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>正在读取企微宝群发配置，请稍候...</p>
        </div>
      )}

      {!isGsLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          {/* Card A: 任务标题/封面自动随机更换 */}
          <div className="card" style={{
            padding: '2rem',
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid var(--border-glass)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <h4 style={{ color: 'var(--accent-purple)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🎨 1. 任务标题/封面自动随机更换
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                针对已筛选的目标群发任务，系统将自动且随机地更换任务标题与封面。<br />选择 <strong>ALL</strong> 可一次性更新所有分组/任务。
              </p>

              <div className="input-group">
                <label>风格类型</label>
                <select 
                  value={randomizeStyle} 
                  onChange={e => setRandomizeStyle(e.target.value)}
                >
                  <option value="Default">都市风格随机</option>
                  <option value="Fantasy">玄幻风格随机</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={handleStartRandomize}
                disabled={isGsActionRunning}
              >
                {isGsActionRunning ? (
                  <><Loader2 className="animate-spin" size={18} /> 正在启动异步任务...</>
                ) : (
                  <><Play size={18} /> 启动随机更换任务</>
                )}
              </button>
            </div>
          </div>

          {/* Card B: 链接批量替换 */}
          <div className="card" style={{
            padding: '2rem',
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid var(--border-glass)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🔗 2. 附件链接全局替换
              </h4>

              <div className="input-group">
                <label>待替换的源 URL</label>
                <input 
                  type="text" 
                  value={replaceSourceUrl} 
                  onChange={e => setReplaceSourceUrl(e.target.value)} 
                  placeholder="请输入待替换的旧链接，例如: http://old.domain.com/abc"
                />
              </div>

              <div className="input-group">
                <label>替换后的新 URL</label>
                <input 
                  type="text" 
                  value={replaceNewUrl} 
                  onChange={e => setReplaceNewUrl(e.target.value)} 
                  placeholder="请输入替换后的新链接，例如: http://new.domain.com/xyz"
                />
              </div>

              <div className="input-group">
                <label>标题封面风格策略</label>
                <select 
                  value={replaceStyle} 
                  onChange={e => setReplaceStyle(e.target.value)}
                >
                  <option value="Original">保持原版标题与封面</option>
                  <option value="Default">都市风格随机</option>
                  <option value="Fantasy">玄幻风格随机</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={handleStartReplacement}
                disabled={isGsActionRunning}
              >
                {isGsActionRunning ? (
                  <><Loader2 className="animate-spin" size={18} /> 正在启动异步任务...</>
                ) : (
                  <><Play size={18} /> 启动批量替换任务</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asynchronous Operations Task History & Controls */}
      <div className="card" style={{ marginTop: '2rem', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={20} style={{ color: 'var(--accent-cyan)' }} />
            运营群发治理 - 历史任务列表
          </h3>
          <button className="btn btn-outline" onClick={() => fetchHistory()} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            <RefreshCw size={14} style={{ marginRight: '0.4rem' }} /> 刷新记录
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="preview-table">
            <thead>
              <tr>
                <th>任务标识</th>
                <th>治理类型</th>
                <th>启动时间</th>
                <th>运行状态</th>
                <th style={{ textAlign: 'center' }}>管理操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((task: any) => {
                const isTaskRunningNow = task.status === 'running';
                return (
                  <tr key={task.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-dim)' }}>{task.id.substring(0, 8)}...</td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'white' }}>{task.filename}</span>
                    </td>
                    <td>{new Date(task.created_at).toLocaleString('zh-CN')}</td>
                    <td>
                      {task.status === 'running' && <span className="badge badge-cyan">● 运行中</span>}
                      {task.status === 'completed' && <span className="badge badge-success">已完成</span>}
                      {task.status === 'stopped' && <span className="badge badge-gray">已停止</span>}
                      {task.status === 'failed' && <span className="badge badge-danger">失败</span>}
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
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    暂无运营群发治理任务记录，您可在上方配置参数并启动治理任务。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
