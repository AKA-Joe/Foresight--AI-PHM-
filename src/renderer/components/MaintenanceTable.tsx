import type { DashboardSnapshot } from '../../shared/types';

const typeLabel: Record<string, string> = {
  inspection: '计划点检',
  seal_replacement: '更换密封圈',
  lubrication: '润滑保养',
  air_pressure_check: '气源压力检查',
};

interface Props {
  snapshot: DashboardSnapshot;
}

export default function MaintenanceTable({ snapshot }: Props) {
  const recent = snapshot.maintenance.slice(0, 8);

  return (
    <div className="table-card">
      <div className="table-title">最近维护记录</div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>维护内容</th>
              <th>状态</th>
              <th>操作人</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                    {typeLabel[item.type] || item.type}
                  </span>
                </td>
                <td title={item.result} style={{ maxWidth: 280, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', lineHeight: '1.5', whiteSpace: 'normal' }}>
                  {item.result}
                </td>
                <td>
                  <span className={`badge ${item.completedAt ? 'badge-closed' : 'badge-active'}`}>
                    {item.completedAt ? '已完成' : '进行中'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{item.operator}</td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dimmed)', padding: 16 }}>暂无维护记录</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
