import type { DashboardSnapshot } from '../../shared/types';

interface Props {
  snapshot: DashboardSnapshot;
  onSelect?: (uid: string) => void;
}

const levelLabel: Record<string, string> = {
  info: '提示',
  warning: '预警',
  critical: '紧急',
};

const levelClass: Record<string, string> = {
  info: 'badge-active',
  warning: 'badge-acknowledged',
  critical: 'badge-active',
};

export default function AlertsTable({ snapshot, onSelect }: Props) {
  const activeAlerts = snapshot.alerts.filter((a) => a.status !== 'closed');

  return (
    <div className="table-card">
      <div className="table-title">活跃告警</div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>等级</th>
              <th>告警标题</th>
              <th>状态</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {activeAlerts.map((alert) => (
              <tr key={alert.id} style={{ cursor: onSelect ? 'pointer' : undefined }} onClick={() => onSelect?.(alert.cylinderUid)}>
                <td>
                  <span className={`badge ${levelClass[alert.level]}`} style={{ background: alert.level === 'warning' ? 'rgba(245,158,11,0.15)' : undefined }}>
                    {levelLabel[alert.level]}
                  </span>
                </td>
                <td title={alert.title} style={{ maxWidth: 260, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', lineHeight: '1.5', whiteSpace: 'normal' }}>
                  {alert.title}
                </td>
                <td>
                  <span className={`badge ${alert.status === 'active' ? 'badge-active' : alert.status === 'acknowledged' ? 'badge-acknowledged' : 'badge-closed'}`}>
                    {alert.status === 'active' ? '待处理' : alert.status === 'acknowledged' ? '已确认' : '已关闭'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-dimmed)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{new Date(alert.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
              </tr>
            ))}
            {activeAlerts.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dimmed)', padding: 16 }}>暂无活跃告警</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
