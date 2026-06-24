import { useMemo, useState } from 'react';
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
  info: 'badge-info',
  warning: 'badge-acknowledged',
  critical: 'badge-active',
};

type FilterKey = 'all' | 'critical' | 'warning' | 'info' | 'station' | 'device';

const filterChips: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'critical', label: '🔴 紧急' },
  { key: 'warning', label: '🟡 预警' },
  { key: 'info', label: '🔵 提示' },
  { key: 'station', label: '按工位' },
  { key: 'device', label: '按设备类型' },
];

export default function AlertsTable({ snapshot, onSelect }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  // Collect unique stations and devices for drill-down
  const stations = useMemo(
    () => [...new Set(snapshot.cylinders.map((c) => c.stationId))].sort(),
    [snapshot],
  );
  const devices = useMemo(
    () => [...new Set(snapshot.cylinders.map((c) => c.deviceName))].sort(),
    [snapshot],
  );

  // Current sub-filter for station/device mode
  const [subFilter, setSubFilter] = useState<string | null>(null);

  const filteredAlerts = useMemo(() => {
    const active = snapshot.alerts.filter((a) => a.status !== 'closed');

    switch (activeFilter) {
      case 'critical':
        return active.filter((a) => a.level === 'critical');
      case 'warning':
        return active.filter((a) => a.level === 'warning');
      case 'info':
        return active.filter((a) => a.level === 'info');
      case 'station': {
        if (!subFilter) return active; // show all until a station is picked
        const uids = new Set(
          snapshot.cylinders.filter((c) => c.stationId === subFilter).map((c) => c.uid),
        );
        return active.filter((a) => uids.has(a.cylinderUid));
      }
      case 'device': {
        if (!subFilter) return active;
        const uids = new Set(
          snapshot.cylinders.filter((c) => c.deviceName === subFilter).map((c) => c.uid),
        );
        return active.filter((a) => uids.has(a.cylinderUid));
      }
      default:
        return active;
    }
  }, [snapshot, activeFilter, subFilter]);

  return (
    <div className="table-card">
      <div className="table-title">活跃告警</div>
      <div className="filter-bar">
        {filterChips.map((chip) => (
          <button
            key={chip.key}
            className={`filter-chip${activeFilter === chip.key ? ' active' : ''}`}
            onClick={() => {
              setActiveFilter(chip.key);
              setSubFilter(null);
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Sub-filter dropdown for station/device */}
      {(activeFilter === 'station' || activeFilter === 'device') && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {(activeFilter === 'station' ? stations : devices).map((item) => (
            <button
              key={item}
              className={`filter-chip${subFilter === item ? ' active' : ''}`}
              style={{ fontSize: 10, padding: '2px 8px' }}
              onClick={() => setSubFilter(subFilter === item ? null : item)}
            >
              {item}
            </button>
          ))}
        </div>
      )}

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
            {filteredAlerts.map((alert) => (
              <tr key={alert.id} style={{ cursor: onSelect ? 'pointer' : undefined }} onClick={() => onSelect?.(alert.cylinderUid)}>
                <td>
                  <span className={`badge ${levelClass[alert.level]}`}>
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
            {filteredAlerts.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dimmed)', padding: 16 }}>
                  {subFilter ? `该分类下暂无告警` : '暂无活跃告警'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
