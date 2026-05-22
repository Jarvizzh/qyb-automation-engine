import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BarChart2, Loader2, RefreshCw, Users } from 'lucide-react';

export const RetentionReportsTab: React.FC = () => {
  const {
    retentionReports,
    isReportsLoading,
    fetchRetentionReports,
    selectedMobile
  } = useOutletContext<any>();

  // Auto-fetch retention reports on mount or selectedMobile account change (only if not already loaded)
  useEffect(() => {
    if (selectedMobile && retentionReports.length === 0) {
      fetchRetentionReports();
    }
  }, [selectedMobile, retentionReports.length]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h4 style={{ color: 'var(--accent-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart2 size={20} /> 全企业留存分析看板
        </h4>
        <button 
          className="btn btn-primary" 
          onClick={fetchRetentionReports} 
          disabled={isReportsLoading}
        >
          {isReportsLoading ? (
            <><Loader2 className="animate-spin" size={16} /> 正在分析...</>
          ) : (
            <><RefreshCw size={16} /> 开始分析</>
          )}
        </button>
      </div>

      {isReportsLoading && (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-dim)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 1.5rem' }}></div>
          <p style={{ fontSize: '1.1rem', color: 'white' }}>正在实时扫描已授权企业客户库...</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>
            系统正在分别拉取每家企业的：正常关系客户、已流失关系客户、以及去重总好友数...
          </p>
        </div>
      )}

      {!isReportsLoading && retentionReports.length > 0 && (
        <>
          {/* Stats mini card grid */}
          <div className="stats-card-grid">
            <div className="stats-mini-card">
              <h4>企业账户总数</h4>
              <div className="value" style={{ color: 'var(--accent-purple)' }}>{retentionReports.length} <span style={{ fontSize: '1rem', fontWeight: 500 }}>家</span></div>
            </div>
            <div className="stats-mini-card">
              <h4>覆盖客户总量</h4>
              <div className="value" style={{ color: 'var(--accent-cyan)' }}>
                {retentionReports.reduce((acc: number, curr: any) => acc + curr.total, 0).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 500 }}>人</span>
              </div>
            </div>
            <div className="stats-mini-card">
              <h4>留存正常客户总量</h4>
              <div className="value" style={{ color: '#10b981' }}>
                {retentionReports.reduce((acc: number, curr: any) => acc + curr.normal, 0).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 500 }}>人</span>
              </div>
            </div>
            <div className="stats-mini-card">
              <h4>流失客户总量</h4>
              <div className="value" style={{ color: '#ef4444' }}>
                {retentionReports.reduce((acc: number, curr: any) => acc + curr.lost, 0).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 500 }}>人</span>
              </div>
            </div>
          </div>

          {/* Retention details list/grid */}
          <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} /> 企业客户流失率与留存百分比排行
          </h4>
          <div className="retention-grid">
            {([...retentionReports].sort((a, b) => b.retention_rate - a.retention_rate)).map((corp, index) => {
              const churnRate = Math.max(0, 100 - corp.retention_rate).toFixed(2);
              const isTopThree = index < 3;
              const rankMedal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;
              
              return (
                <div key={index} className={`retention-card ${isTopThree ? 'top-rank' : ''}`} style={{
                  position: 'relative',
                  border: isTopThree 
                    ? index === 0 
                      ? '1px solid rgba(234, 179, 8, 0.4)' 
                      : index === 1 
                        ? '1px solid rgba(148, 163, 184, 0.4)' 
                        : '1px solid rgba(180, 83, 9, 0.4)' 
                    : '1px solid var(--border-glass)',
                  background: isTopThree
                    ? index === 0 
                      ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.05) 0%, rgba(255,255,255,0.02) 100%)'
                      : index === 1
                        ? 'linear-gradient(135deg, rgba(148, 163, 184, 0.05) 0%, rgba(255,255,255,0.02) 100%)'
                        : 'linear-gradient(135deg, rgba(180, 83, 9, 0.05) 0%, rgba(255,255,255,0.02) 100%)'
                    : 'rgba(255,255,255,0.01)'
                }}>
                  <div className="card-header">
                    <span className="corp-name">{rankMedal} {corp.name}</span>
                    <span className="rate-value" style={{ color: corp.retention_rate > 70 ? '#10b981' : corp.retention_rate > 40 ? '#f59e0b' : '#ef4444' }}>
                      留存: {corp.retention_rate.toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className="metrics-row">
                    <span>正常客户</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{corp.normal} 人</span>
                  </div>
                  <div className="metrics-row">
                    <span>已流失数</span>
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>{corp.lost} 人</span>
                  </div>
                  <div className="metrics-row">
                    <span>客户总量</span>
                    <span style={{ color: 'white', fontWeight: 600 }}>{corp.total} 人</span>
                  </div>

                  <div className="progress-bar-container" style={{ marginTop: '1rem' }}>
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${corp.retention_rate}%`,
                        background: corp.retention_rate > 70 ? '#10b981' : corp.retention_rate > 40 ? '#f59e0b' : '#ef4444'
                      }}
                    ></div>
                  </div>
                  
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'right', marginTop: '0.5rem' }}>
                    流失率: {churnRate}%
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!isReportsLoading && retentionReports.length === 0 && (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-dim)', border: '1px dashed var(--border-glass)', borderRadius: '16px' }}>
          <BarChart2 size={48} style={{ opacity: 0.15, marginBottom: '1.5rem', color: 'var(--accent-cyan)', margin: '0 auto 1.5rem' }} />
          <p style={{ fontSize: '1.1rem', color: 'white' }}>大盘留存分析未拉取</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>
            系统支持对当前企微账号下绑定的全部企业的客户留存率和关系链状态进行一键聚合拉取，提供深度排行和高危流失分析。
          </p>
        </div>
      )}
    </div>
  );
};
