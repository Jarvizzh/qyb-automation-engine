import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BookOpen, RefreshCw, Loader2 } from 'lucide-react';
import { useSession } from '../../../contexts/SessionContext';

export const SopTab: React.FC = () => {
  const { selectedMobile } = useSession();
  const {
    sopTemplates,
    selectedSopTemplateId,
    setSelectedSopTemplateId,
    sopUrls,
    sopCurUrl,
    setSopCurUrl,
    sopNewUrl,
    setSopNewUrl,
    sopTitle,
    setSopTitle,
    sopImage,
    setSopImage,
    sopDesc,
    setSopDesc,
    sopStyle,
    setSopStyle,
    isSopLoading,
    isSopActionRunning,
    fetchSopTemplates,
    fetchSopUrls,
    handleSopUpdate
  } = useOutletContext<any>();

  // Active pull of SOP templates on mount or selectedMobile changes
  useEffect(() => {
    if (selectedMobile) {
      fetchSopTemplates();
    }
  }, [selectedMobile]);


  return (
    <div>
      <div className="input-group" style={{ marginBottom: '2rem' }}>
        <select 
          value={selectedSopTemplateId} 
          onChange={e => {
            const val = e.target.value ? Number(e.target.value) : '';
            setSelectedSopTemplateId(val);
            if (val) fetchSopUrls(val);
          }}
        >
          <option value="">-- 请选择 SOP 模板 --</option>
          {sopTemplates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {isSopLoading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>正在拉取 SOP 模板节点详情，请稍候...</p>
        </div>
      )}

      {!isSopLoading && selectedSopTemplateId && (
        <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
            {/* Left: Nodes Table */}
            <div>
              <h4 style={{ color: 'var(--accent-purple)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={20} /> 1. 模板详情清单 ({sopUrls.length} 个节点)
              </h4>
              <div style={{ maxHeight: '554px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th style={{ padding: '0.75rem' }}>时间节点</th>
                      <th style={{ padding: '0.75rem' }}>附件类型</th>
                      <th style={{ padding: '0.75rem' }}>原网页标题/URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sopUrls.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                          <span className="badge badge-purple">第 {item.day} 天</span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className="badge badge-gray">{item.type}</span>
                        </td>
                        <td style={{ padding: '0.75rem', maxWidth: '220px', wordBreak: 'break-all' }}>
                          <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.2rem' }}>{item.title || '（未命名附件）'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>{item.url}</div>
                        </td>
                      </tr>
                    ))}
                    {sopUrls.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                          该模板内无任何带有网页或小程序的SOP节点
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Governance Actions */}
            <div>
              <h4 style={{ color: 'var(--accent-pink)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={20} /> 2. 批量替换内容
              </h4>

              {sopUrls.length > 0 && (
                <div className="input-group">
                  <label>待治理的源 URL</label>
                  <select 
                    value={sopCurUrl} 
                    onChange={e => setSopCurUrl(e.target.value)} 
                    style={{ marginBottom: '0.75rem' }}
                  >
                    {Array.from(new Set(sopUrls.map((u: any) => u.url))).map((url: any, i) => (
                      <option key={i} value={url}>{url}</option>
                    ))}
                  </select>
                  <input 
                    type="text" 
                    value={sopCurUrl} 
                    readOnly 
                    placeholder="暂未选择源 URL"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'rgba(255, 255, 255, 0.4)', cursor: 'not-allowed', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                  />
                </div>
              )}

              <div className="input-group">
                <label>替换后新 URL</label>
                <input 
                  type="text" 
                  value={sopNewUrl} 
                  onChange={e => setSopNewUrl(e.target.value)} 
                  placeholder="请输入新跳转的网页 URL (不填则仅批量更新属性)"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>批量覆盖标题 (可选)</label>
                  <input 
                    type="text" 
                    value={sopTitle} 
                    onChange={e => setSopTitle(e.target.value)} 
                    placeholder="留空则不覆盖"
                  />
                </div>

                <div className="input-group">
                  <label>批量覆盖描述 (可选)</label>
                  <input 
                    type="text" 
                    value={sopDesc} 
                    onChange={e => setSopDesc(e.target.value)} 
                    placeholder="留空则不覆盖"
                  />
                </div>
              </div>

              <div className="input-group">
                <label>批量覆盖封面图 URL (可选)</label>
                <input 
                  type="text" 
                  value={sopImage} 
                  onChange={e => setSopImage(e.target.value)} 
                  placeholder="输入封面图 CDN 地址"
                />
              </div>

              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label>标题风格</label>
                <select value={sopStyle} onChange={e => setSopStyle(e.target.value)}>
                  <option value="Original">原版标题（仅做链接治理）</option>
                  <option value="Default">都市风格随机</option>
                  <option value="Fantasy">玄幻风格随机</option>
                </select>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '1rem' }} 
                onClick={handleSopUpdate}
                disabled={isSopActionRunning || sopUrls.length === 0}
              >
                {isSopActionRunning ? (
                  <><Loader2 className="animate-spin" size={20} /> 正在执行治理算法...</>
                ) : (
                  <><RefreshCw size={20} /> 一键执行 SOP 内容深度治理</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isSopLoading && !selectedSopTemplateId && (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-dim)', border: '1px dashed var(--border-glass)', borderRadius: '16px', marginTop: '2rem' }}>
          <BookOpen size={48} style={{ opacity: 0.15, marginBottom: '1.5rem', color: 'var(--accent-cyan)', margin: '0 auto 1.5rem' }} />
          <p style={{ fontSize: '1.1rem', color: 'white' }}>请选择 SOP 模板进行治理</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>
            系统支持从列表中选择账号内全部 SOP 模板，可视化列出全部跳转网页，提供一键批量防封及链接替换。
          </p>
        </div>
      )}
    </div>
  );
};
