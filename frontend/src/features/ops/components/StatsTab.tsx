import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BarChart2, Search, Download, Loader2 } from 'lucide-react';
import { useSession } from '../../../contexts/SessionContext';

export const StatsTab: React.FC = () => {
  const { selectedMobile } = useSession();
  const {
    corps,
    selectedCorp,
    setSelectedCorp,
    tagType,
    setTagType,
    tagName,
    setTagName,
    statsResults,
    isStatsQuerying,
    fetchCorps,
    handleQueryStats
  } = useOutletContext<any>();

  // Fetch corps list when selected mobile or mount changes
  useEffect(() => {
    if (selectedMobile) {
      fetchCorps();
    }
  }, [selectedMobile]);

  const handleExportCSV = () => {
    if (statsResults.length === 0) return;
    const csv = [
      "员工名,标签名字,用户数",
      ...statsResults.map((r: any) => `${r.employee_name},${r.tag_name},${r.user_count}`)
    ].join('\n');
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stats-${selectedCorp || 'unknown'}-${tagName || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Query Form Card */}
      <div style={{
        padding: '1.5rem',
        marginBottom: '2rem',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-glass)',
        borderRadius: '16px'
      }}>
        <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart2 size={18} /> 企业标签用户统计查询
        </h4>
        
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          alignItems: 'flex-end',
          flexWrap: 'wrap'
        }}>
          <div className="input-group" style={{ width: '280px', marginBottom: 0 }}>
            <label>企业简称</label>
            <select value={selectedCorp} onChange={e => setSelectedCorp(e.target.value)}>
              <option value="">请选择企业</option>
              {corps.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <div className="input-group" style={{ width: 'auto', marginBottom: 0 }}>
            <label>标签类型</label>
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              height: '42px',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.03)',
              padding: '0 1.5rem',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: 0, fontSize: '0.9rem' }}>
                <input type="radio" checked={tagType === 'smart'} onChange={() => setTagType('smart')} /> 智能标签
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: 0, fontSize: '0.9rem' }}>
                <input type="radio" checked={tagType === 'enterprise'} onChange={() => setTagType('enterprise')} /> 企业标签
              </label>
            </div>
          </div>

          <div className="input-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label>标签名称</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={tagName} 
                onChange={e => setTagName(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleQueryStats()}
                placeholder="请输入完整的标签名字" 
                style={{ paddingRight: '2.5rem' }}
              />
              <Search size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
            </div>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ height: '42px', padding: '0 2rem' }} 
            onClick={handleQueryStats}
            disabled={isStatsQuerying}
          >
            {isStatsQuerying ? (
              <><Loader2 className="animate-spin" size={18} style={{ marginRight: '0.5rem' }} /> 查询中...</>
            ) : (
              <><BarChart2 size={18} style={{ marginRight: '0.5rem' }} /> 开始统计</>
            )}
          </button>
        </div>
      </div>

      {/* Results Card */}
      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h4 style={{ color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📊 查询结果 {statsResults.length > 0 && <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>({statsResults.length} 条记录)</span>}
          </h4>
          {statsResults.length > 0 && (
            <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={handleExportCSV}>
              <Download size={14} style={{ marginRight: '0.4rem' }} /> 导出 CSV
            </button>
          )}
        </div>
        
        <div style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
          <table className="preview-table">
            <thead>
              <tr>
                <th>员工名</th>
                <th>标签名字</th>
                <th>用户数</th>
              </tr>
            </thead>
            <tbody>
              {statsResults.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td>{item.employee_name}</td>
                  <td>
                    <span className="status-badge" style={{
                      backgroundColor: 'rgba(168, 85, 247, 0.1)', 
                      color: 'var(--accent-purple)', 
                      border: '1px solid rgba(168, 85, 247, 0.2)'
                    }}>
                      {item.tag_name}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{item.user_count}</td>
                </tr>
              ))}
              {statsResults.length === 0 && !isStatsQuerying && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
                    <BarChart2 size={48} style={{ opacity: 0.1, marginBottom: '1rem', margin: '0 auto 1rem' }} />
                    <p>暂无统计数据，请在上方输入条件后点击开始统计</p>
                  </td>
                </tr>
              )}
              {isStatsQuerying && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                    <p>正在拉取企微宝数据，请稍候...</p>
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
