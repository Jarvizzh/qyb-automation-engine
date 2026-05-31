import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, RefreshCw, Loader2, Play, Terminal, Calendar, Clock, Pause, Trash2 } from 'lucide-react';
import { useSession } from '../../../contexts/SessionContext';
import { useToast } from '../../../components/Toast/ToastContext';

export const GroupSendTab: React.FC = () => {
  const { selectedMobile } = useSession();
  const { addToast } = useToast();
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
    fetchHistory,

    // Scheduled tasks hooks from useOpsCenter
    scheduledTasks,
    isSchedulesLoading,
    fetchScheduledTasks,
    handleCreateScheduleTask,
    handleToggleScheduleTask,
    handleTriggerScheduleTaskNow,
    handleDeleteScheduleTask
  } = useOutletContext<any>();

  // Card A scheduling states
  const [cardAExecMode, setCardAExecMode] = useState<'now' | 'schedule'>('now');
  const [cardASchedType, setCardASchedType] = useState<'once' | 'recurring'>('once');
  const [cardARecurrence, setCardARecurrence] = useState<'once' | 'daily' | 'interval'>('daily');
  const [cardAOnceTime, setCardAOnceTime] = useState<string>('');
  const [cardADailyTime, setCardADailyTime] = useState<string>('12:00');
  const [cardAIntervalVal, setCardAIntervalVal] = useState<number>(1);
  const [cardAIntervalUnit, setCardAIntervalUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');

  // Card B scheduling states
  const [cardBExecMode, setCardBExecMode] = useState<'now' | 'schedule'>('now');
  const [cardBSchedType, setCardBSchedType] = useState<'once' | 'recurring'>('once');
  const [cardBRecurrence, setCardBRecurrence] = useState<'once' | 'daily' | 'interval'>('daily');
  const [cardBOnceTime, setCardBOnceTime] = useState<string>('');
  const [cardBDailyTime, setCardBDailyTime] = useState<string>('12:00');
  const [cardBIntervalVal, setCardBIntervalVal] = useState<number>(1);
  const [cardBIntervalUnit, setCardBIntervalUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');

  // Active pull of group lists on mount or selectedMobile changes
  useEffect(() => {
    if (selectedMobile) {
      fetchGsGroups();
    }
  }, [selectedMobile]);

  const filteredHistory = historyTasks.filter((t: any) => 
    t.filename && (
      (t.filename.startsWith("运营群发治理") && !t.filename.startsWith("运营群发治理-清理已")) || 
      t.filename.startsWith("⏰定时运营") || 
      t.filename.startsWith("⏰手动定时运营")
    )
  );

  // Frontend Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;
  const totalItems = filteredHistory.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  useEffect(() => {
    if (currentPage > 1 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedTasks = filteredHistory.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const onScheduleCardA = async () => {
    if (!selectedMobile) return addToast("请选择企微宝账号", "warning");
    if (!selectedGsGroupId) return addToast("请选择任务分组", "warning");
    if (!selectedGsTaskId) return addToast("请选择任务", "warning");

    const scheduleConfig: any = {
      schedule_type: cardASchedType,
      recurrence: cardASchedType === 'once' ? 'once' : cardARecurrence,
    };

    if (cardASchedType === 'once') {
      if (!cardAOnceTime) {
        addToast("请选择定时执行的具体时间", "warning");
        return;
      }
      const ts = Math.floor(new Date(cardAOnceTime).getTime() / 1000);
      if (ts < Math.floor(Date.now() / 1000)) {
        addToast("定时执行时间不能早于当前时间", "warning");
        return;
      }
      scheduleConfig.timestamp = ts;
    } else {
      if (cardARecurrence === 'daily') {
        if (!cardADailyTime) {
          addToast("请选择每日执行的具体时间", "warning");
          return;
        }
        scheduleConfig.run_time = cardADailyTime;
      } else {
        if (!cardAIntervalVal || cardAIntervalVal < 1) {
          addToast("请输入有效的间隔数值(>=1)", "warning");
          return;
        }
        scheduleConfig.interval_value = cardAIntervalVal;
        scheduleConfig.interval_unit = cardAIntervalUnit;
      }
    }

    await handleCreateScheduleTask('title_randomize', scheduleConfig);
  };

  const onScheduleCardB = async () => {
    if (!selectedMobile) return addToast("请选择企微宝账号", "warning");
    if (!selectedGsGroupId) return addToast("请选择任务分组", "warning");
    if (!selectedGsTaskId) return addToast("请选择任务", "warning");
    if (!replaceSourceUrl.trim()) return addToast("请填写待替换的源链接", "warning");
    if (!replaceNewUrl.trim()) return addToast("请填写替换后的新链接", "warning");

    const scheduleConfig: any = {
      schedule_type: cardBSchedType,
      recurrence: cardBSchedType === 'once' ? 'once' : cardBRecurrence,
    };

    if (cardBSchedType === 'once') {
      if (!cardBOnceTime) {
        addToast("请选择定时执行的具体时间", "warning");
        return;
      }
      const ts = Math.floor(new Date(cardBOnceTime).getTime() / 1000);
      if (ts < Math.floor(Date.now() / 1000)) {
        addToast("定时执行时间不能早于当前时间", "warning");
        return;
      }
      scheduleConfig.timestamp = ts;
    } else {
      if (cardBRecurrence === 'daily') {
        if (!cardBDailyTime) {
          addToast("请选择每日执行的具体时间", "warning");
          return;
        }
        scheduleConfig.run_time = cardBDailyTime;
      } else {
        if (!cardBIntervalVal || cardBIntervalVal < 1) {
          addToast("请输入有效的间隔数值(>=1)", "warning");
          return;
        }
        scheduleConfig.interval_value = cardBIntervalVal;
        scheduleConfig.interval_unit = cardBIntervalUnit;
      }
    }

    await handleCreateScheduleTask('url_replacement', scheduleConfig);
  };

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

              {/* Card A Execution Schedule */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
                  🕒 执行方式
                </label>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input 
                      type="radio" 
                      name="cardAExecMode" 
                      value="now" 
                      checked={cardAExecMode === 'now'}
                      onChange={() => setCardAExecMode('now')} 
                      style={{ cursor: 'pointer' }}
                    />
                    <span>立即执行</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input 
                      type="radio" 
                      name="cardAExecMode" 
                      value="schedule" 
                      checked={cardAExecMode === 'schedule'}
                      onChange={() => setCardAExecMode('schedule')} 
                      style={{ cursor: 'pointer' }}
                    />
                    <span>定时执行</span>
                  </label>
                </div>

                {cardAExecMode === 'schedule' && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>定时类型</label>
                      <select 
                        value={cardASchedType} 
                        onChange={e => {
                          const val = e.target.value as 'once' | 'recurring';
                          setCardASchedType(val);
                        }}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      >
                        <option value="once">单次定时</option>
                        <option value="recurring">循环定时</option>
                      </select>
                    </div>

                    {cardASchedType === 'once' ? (
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>执行时间</label>
                        <input 
                          type="datetime-local" 
                          value={cardAOnceTime} 
                          onChange={e => setCardAOnceTime(e.target.value)} 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>循环周期</label>
                          <select 
                            value={cardARecurrence} 
                            onChange={e => setCardARecurrence(e.target.value as 'daily' | 'interval')}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                          >
                            <option value="daily">每日定时</option>
                            <option value="interval">每隔时间</option>
                          </select>
                        </div>

                        {cardARecurrence === 'daily' ? (
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>每日执行时间</label>
                            <input 
                              type="time" 
                              value={cardADailyTime} 
                              onChange={e => setCardADailyTime(e.target.value)} 
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            />
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>间隔数值</label>
                              <input 
                                type="number" 
                                min={1} 
                                value={cardAIntervalVal} 
                                onChange={e => setCardAIntervalVal(Number(e.target.value))} 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                              />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>间隔单位</label>
                              <select 
                                value={cardAIntervalUnit} 
                                onChange={e => setCardAIntervalUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                              >
                                <option value="minutes">分钟</option>
                                <option value="hours">小时</option>
                                <option value="days">天</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: cardAExecMode === 'schedule' ? 'linear-gradient(135deg, var(--accent-purple) 0%, #6366f1 100%)' : undefined }}
                onClick={cardAExecMode === 'schedule' ? onScheduleCardA : handleStartRandomize}
                disabled={isGsActionRunning}
              >
                {isGsActionRunning ? (
                  <><Loader2 className="animate-spin" size={18} /> 正在启动异步任务...</>
                ) : cardAExecMode === 'schedule' ? (
                  <><Calendar size={18} /> 创建定时更换任务</>
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

              {/* Card B Execution Schedule */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
                  🕒 执行方式
                </label>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input 
                      type="radio" 
                      name="cardBExecMode" 
                      value="now" 
                      checked={cardBExecMode === 'now'}
                      onChange={() => setCardBExecMode('now')} 
                      style={{ cursor: 'pointer' }}
                    />
                    <span>立即执行</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input 
                      type="radio" 
                      name="cardBExecMode" 
                      value="schedule" 
                      checked={cardBExecMode === 'schedule'}
                      onChange={() => setCardBExecMode('schedule')} 
                      style={{ cursor: 'pointer' }}
                    />
                    <span>定时执行</span>
                  </label>
                </div>

                {cardBExecMode === 'schedule' && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>定时类型</label>
                      <select 
                        value={cardBSchedType} 
                        onChange={e => {
                          const val = e.target.value as 'once' | 'recurring';
                          setCardBSchedType(val);
                        }}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      >
                        <option value="once">单次定时</option>
                        <option value="recurring">循环定时</option>
                      </select>
                    </div>

                    {cardBSchedType === 'once' ? (
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>执行时间</label>
                        <input 
                          type="datetime-local" 
                          value={cardBOnceTime} 
                          onChange={e => setCardBOnceTime(e.target.value)} 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>循环周期</label>
                          <select 
                            value={cardBRecurrence} 
                            onChange={e => setCardBRecurrence(e.target.value as 'daily' | 'interval')}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                          >
                            <option value="daily">每日定时</option>
                            <option value="interval">每隔时间</option>
                          </select>
                        </div>

                        {cardBRecurrence === 'daily' ? (
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>每日执行时间</label>
                            <input 
                              type="time" 
                              value={cardBDailyTime} 
                              onChange={e => setCardBDailyTime(e.target.value)} 
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            />
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>间隔数值</label>
                              <input 
                                type="number" 
                                min={1} 
                                value={cardBIntervalVal} 
                                onChange={e => setCardBIntervalVal(Number(e.target.value))} 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                              />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>间隔单位</label>
                              <select 
                                value={cardBIntervalUnit} 
                                onChange={e => setCardBIntervalUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                              >
                                <option value="minutes">分钟</option>
                                <option value="hours">小时</option>
                                <option value="days">天</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: cardBExecMode === 'schedule' ? 'linear-gradient(135deg, var(--accent-cyan) 0%, #3b82f6 100%)' : undefined }}
                onClick={cardBExecMode === 'schedule' ? onScheduleCardB : handleStartReplacement}
                disabled={isGsActionRunning}
              >
                {isGsActionRunning ? (
                  <><Loader2 className="animate-spin" size={18} /> 正在启动异步任务...</>
                ) : cardBExecMode === 'schedule' ? (
                  <><Calendar size={18} /> 创建定时替换任务</>
                ) : (
                  <><Play size={18} /> 启动批量替换任务</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Tasks Management Queue */}
      <div className="card" style={{ marginTop: '2rem', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} style={{ color: 'var(--accent-purple)' }} />
            定时运营任务队列
          </h3>
          <button className="btn btn-outline" onClick={() => fetchScheduledTasks()} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} disabled={isSchedulesLoading}>
            <RefreshCw size={14} className={isSchedulesLoading ? "animate-spin" : ""} style={{ marginRight: '0.4rem' }} /> 刷新
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="preview-table">
            <thead>
              <tr>
                <th>治理任务</th>
                <th>群发模式</th>
                <th>目标范围</th>
                <th>策略/参数</th>
                <th>调度规则</th>
                <th>下次执行时间</th>
                <th>上次执行</th>
                <th>状态</th>
                <th style={{ textAlign: 'center' }}>管理操作</th>
              </tr>
            </thead>
            <tbody>
              {scheduledTasks.map((task: any) => {
                const getGroupName = (id: string) => {
                  if (id === 'ALL') return '所有分组';
                  const g = gsGroups.find((x: any) => String(x.id) === id);
                  return g ? g.name : `分组: ${id}`;
                };
                const getTaskName = (id: string) => {
                  if (id === 'ALL') return '所有任务';
                  const t = gsTasks.find((x: any) => String(x.id) === id);
                  return t ? t.title : `任务: ${id}`;
                };

                return (
                  <tr key={task.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: task.task_type === 'title_randomize' ? 'var(--accent-purple)' : 'var(--accent-cyan)' }}>
                        {task.task_type === 'title_randomize' ? '🎨 标题/封面随机更换' : '🔗 附件链接全局替换'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${task.module === 7 ? 'badge-pink' : 'badge-cyan'}`} style={{ fontSize: '0.8rem' }}>
                        {task.module === 7 ? '高级群发' : '极速群发'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>
                        <div>{getGroupName(task.group_id)}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{getTaskName(task.task_id)}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>
                        {task.task_type === 'title_randomize' ? (
                          <span>风格: {task.style === 'Default' ? '都市风格' : '玄幻风格'}</span>
                        ) : (
                          <div>
                            <div>风格: {task.style === 'Original' ? '保持原版' : task.style === 'Default' ? '都市风格' : '玄幻风格'}</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.8, color: 'var(--accent-cyan)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={`${task.params?.cur_url} ➔ ${task.params?.new_url}`}>
                              {task.params?.cur_url} ➔ {task.params?.new_url}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'white' }}>
                        {task.schedule_type === 'once' ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> 单次定时</span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <RefreshCw size={12} />
                            {task.recurrence === 'daily' ? `每日 ${task.run_time}` : `每隔 ${task.interval_value} ${task.interval_unit === 'minutes' ? '分钟' : task.interval_unit === 'hours' ? '小时' : '天'}`}
                          </span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: task.status === 'active' ? 'var(--accent-cyan)' : 'var(--text-dim)' }}>
                        {task.status === 'active' && task.next_run_at ? new Date(task.next_run_at).toLocaleString('zh-CN') : '--'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                        {task.last_run_at ? new Date(task.last_run_at).toLocaleString('zh-CN') : '从未执行'}
                      </span>
                    </td>
                    <td>
                      {task.status === 'active' && <span className="badge badge-cyan">生效中</span>}
                      {task.status === 'paused' && <span className="badge badge-gray">已暂停</span>}
                      {task.status === 'completed' && <span className="badge badge-success">已结束</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        {task.status !== 'completed' && (
                          <button 
                            className={`btn ${task.status === 'active' ? 'btn-outline' : 'btn-primary'}`}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', minWidth: '55px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                            onClick={() => handleToggleScheduleTask(task.id)}
                          >
                            {task.status === 'active' ? (
                              <><Pause size={10} /> 暂停</>
                            ) : (
                              <><Play size={10} /> 恢复</>
                            )}
                          </button>
                        )}
                        <button 
                          className="btn btn-outline"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                          onClick={() => handleTriggerScheduleTaskNow(task.id)}
                          title="立即手动触发一次执行"
                        >
                          <Play size={10} /> 触发
                        </button>
                        <button 
                          className="btn btn-outline"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                          onClick={() => handleDeleteScheduleTask(task.id)}
                        >
                          <Trash2 size={10} /> 删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {scheduledTasks.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    暂无定时运营治理任务，您可以在上方配置参数并创建定时任务。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asynchronous Operations Task History & Controls */}
      <div className="card" style={{ marginTop: '2rem', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={20} style={{ color: 'var(--accent-cyan)' }} />
            运营任务执行记录
          </h3>
          <button className="btn btn-outline" onClick={() => fetchHistory()} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            <RefreshCw size={14} style={{ marginRight: '0.4rem' }} /> 刷新
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
              {paginatedTasks.map((task: any) => {
                const isTaskRunningNow = task.status === 'running';
                return (
                  <tr key={task.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-dim)' }}>{task.id}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-dim)' }}>{task.filename}</span>
                    </td>
                    <td>{new Date(task.created_at).toLocaleString('zh-CN')}</td>
                    <td>
                      {task.status === 'running' && <span className="badge badge-cyan">● 运行中</span>}
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
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    暂无运营群发治理任务记录，您可在上方配置参数并启动治理任务。
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

