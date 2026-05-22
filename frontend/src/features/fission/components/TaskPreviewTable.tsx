import React from 'react';
import type { TaskPreview } from '../../../types';

interface TaskPreviewTableProps {
  previewTasks: TaskPreview[];
}

export const TaskPreviewTable: React.FC<TaskPreviewTableProps> = React.memo(({ previewTasks }) => {
  if (previewTasks.length === 0) return null;

  return (
    <div style={{ marginTop: '2rem' }}>
      <h4 style={{ color: 'var(--accent-purple)', marginBottom: '1rem' }}>数据预览 ({previewTasks.length} 条任务)</h4>
      <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
        <table className="preview-table">
          <thead>
            <tr>
              <th>发送人</th>
              <th>智能标签</th>
              <th>接收人</th>
              <th>接收人是否为内部员工</th>
              <th>起始位置</th>
              <th>发送数量</th>
            </tr>
          </thead>
          <tbody>
            {previewTasks.map((t, idx) => (
              <tr key={idx}>
                <td>{t.sender}</td>
                <td>{t.tag}</td>
                <td>{t.receiver}</td>
                <td>{t.internal ? <span style={{ color: 'var(--accent-cyan)' }}>是</span> : '否'}</td>
                <td>{t.start}</td>
                <td>{t.limit === -1 ? '全部' : t.limit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

TaskPreviewTable.displayName = 'TaskPreviewTable';

