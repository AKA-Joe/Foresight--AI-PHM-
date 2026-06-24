import { useState } from 'react';

interface WorkOrder {
  id: string;
  source: string;
  device: string;
  type: string;
  typeLevel: 'critical' | 'warning' | 'info';
  status: string;
  statusLevel: 'warning' | 'good' | 'info';
  spareStatus: string;
  spareOk: boolean;
  schedule: string;
  progress: number;
}

const MOCK_ORDERS: WorkOrder[] = [
  {
    id: 'WO-2024', source: 'AI 预测', device: '注塑机A-3#',
    type: '紧急更换', typeLevel: 'critical', status: '待执行', statusLevel: 'warning',
    spareStatus: '密封圈 充足', spareOk: true, schedule: '06/15 14:00', progress: 25,
  },
  {
    id: 'WO-2023', source: 'AI 预测', device: '冲压机B-1#',
    type: '预防维护', typeLevel: 'warning', status: '已排程', statusLevel: 'good',
    spareStatus: '润滑油 充足', spareOk: true, schedule: '06/16 09:00', progress: 60,
  },
  {
    id: 'WO-2022', source: 'AI 预测', device: '焊接机器人',
    type: '传感器校准', typeLevel: 'info', status: '待审批', statusLevel: 'warning',
    spareStatus: '工具 需调拨', spareOk: false, schedule: '06/17 10:30', progress: 10,
  },
  {
    id: 'WO-2021', source: '定期巡检', device: 'AGV-07',
    type: '常规保养', typeLevel: 'info', status: '已完成', statusLevel: 'good',
    spareStatus: '滤芯 充足', spareOk: true, schedule: '06/13 16:00', progress: 100,
  },
  {
    id: 'WO-2020', source: 'AI 预测', device: '空压机C-2#',
    type: '趋势劣化', typeLevel: 'warning', status: '执行中', statusLevel: 'good',
    spareStatus: '皮带 充足', spareOk: true, schedule: '06/14 08:00', progress: 78,
  },
];

function typeBadgeStyle(level: string): React.CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    critical: { bg: 'rgba(239,68,68,0.12)', color: 'var(--level-critical)' },
    warning: { bg: 'rgba(245,158,11,0.12)', color: 'var(--level-warning)' },
    info: { bg: 'rgba(59,130,246,0.1)', color: 'var(--level-info)' },
  };
  const s = map[level] || map.info;
  return {
    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
    background: s.bg, color: s.color, fontFamily: 'var(--font-mono)',
  };
}

function statusColor(status: string): string {
  if (status === '已完成' || status === '已排程' || status === '执行中') return 'var(--level-normal)';
  if (status === '待审批') return 'var(--level-warning)';
  return 'var(--level-warning)';
}

function progressColor(progress: number): string {
  if (progress >= 100) return 'var(--level-normal)';
  if (progress >= 60) return 'var(--accent)';
  if (progress >= 25) return 'var(--level-warning)';
  return 'var(--text-dimmed)';
}

interface WorkOrderPanelProps {
  compact?: boolean;
}

type FilterKey = 'all' | 'critical' | 'warning' | 'info';

export default function WorkOrderPanel({ compact }: WorkOrderPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<FilterKey>('all');
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const getProgress = (wo: typeof MOCK_ORDERS[0]) => progressMap[wo.id] ?? wo.progress;

  const advanceProgress = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setProgressMap(prev => ({ ...prev, [id]: Math.min(100, (prev[id] ?? MOCK_ORDERS.find(w => w.id === id)!.progress) + 25) }));
  };

  const typeFilters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'critical', label: '🔴 紧急' },
    { key: 'warning', label: '🟡 预警' },
    { key: 'info', label: '🔵 常规' },
  ];

  const filtered = MOCK_ORDERS.filter(w => {
    if (dismissed.has(w.id)) return false;
    if (typeFilter !== 'all' && w.typeLevel !== typeFilter) return false;
    return true;
  });

  // Compact mode for right panel tab
  if (compact) {
    const activeOrders = filtered.filter(w => getProgress(w) < 100);
    const completedOrders = filtered.filter(w => getProgress(w) >= 100);
    return (
      <div style={{ padding: 12, overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-bright)' }}>🤖 工单调度</span>
          <span style={{ fontSize: 10, color: 'var(--text-dimmed)', fontFamily: 'var(--font-mono)' }}>
            {activeOrders.length}/{filtered.length} 活跃
          </span>
        </div>

        {/* Type filter chips */}
        <div style={{ display: 'flex', gap: 3 }}>
          {typeFilters.map(f => (
            <span key={f.key} onClick={() => setTypeFilter(f.key)} style={{
              padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: 'pointer',
              background: typeFilter === f.key ? 'var(--accent-dim)' : 'transparent',
              color: typeFilter === f.key ? 'var(--accent)' : 'var(--text-dimmed)',
              border: '1px solid ' + (typeFilter === f.key ? 'var(--accent)' : 'var(--border-color)'),
            }}>{f.label}</span>
          ))}
        </div>

        {activeOrders.map(wo => {
          const p = getProgress(wo);
          const isSelected = selectedId === wo.id;
          return (
            <div key={wo.id}
              onClick={() => setSelectedId(isSelected ? null : wo.id)}
              style={{
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid ' + (isSelected ? 'var(--accent)' : 'var(--border-color)'),
                borderLeft: '3px solid ' + (wo.typeLevel === 'critical' ? '#ef4444' : wo.typeLevel === 'warning' ? '#f59e0b' : '#3b82f6'),
                background: 'var(--bg-elevated)', transition: 'all 0.2s',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800, color: 'var(--text-bright)' }}>{wo.id}</span>
                <span style={typeBadgeStyle(wo.typeLevel)}>{wo.type}</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{wo.device}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: statusColor(p >= 100 ? '已完成' : wo.status), fontWeight: 600 }}>
                  {p >= 100 ? '✅ 已完成' : wo.status}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-dimmed)' }}>{wo.spareOk ? '✅' : '⚠️'} {wo.spareStatus}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--bg-card)', overflow: 'hidden' }}>
                  <div style={{ width: p + '%', height: '100%', borderRadius: 2, background: p >= 100 ? '#22c55e' : progressColor(p), transition: 'width 0.4s ease' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: p >= 100 ? '#22c55e' : progressColor(p), fontWeight: 700 }}>{p}%</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dimmed)' }}>{wo.schedule}</span>
              </div>
              {isSelected && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  {p < 100 && (
                    <button onClick={(e) => advanceProgress(e, wo.id)}
                      style={{ flex: 1, padding: '5px 0', borderRadius: 4, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 10 }}>
                      + 推进进度
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setDismissed(prev => new Set(prev).add(wo.id)); }}
                    style={{ padding: '5px 10px', borderRadius: 4, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: 10 }}>
                    关闭
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {activeOrders.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-dimmed)' }}>
            ✅ 所有工单已完成
          </div>
        )}
      </div>
    );
  }

  // Full page mode
  return (
    <div style={{ padding: 'var(--space-5)', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={{
          fontSize: 20, fontWeight: 700, letterSpacing: '0.5px',
          background: 'linear-gradient(90deg, #3b82f6, #f59e0b)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 'var(--space-2)',
        }}>
          🤖 自动化工单调度
        </h2>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          AI 预测生成维护建议后，自动检查备件库存并生成最优排程方案，通过 MES 接口下发执行工单。
        </p>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap',
        padding: '8px 14px', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)', background: 'var(--bg-elevated)',
        fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
      }}>
        <span><span style={{
          width: 6, height: 6, borderRadius: '50%', background: 'var(--level-normal)',
          display: 'inline-block', marginRight: 4, boxShadow: '0 0 6px rgba(16,185,129,0.5)',
        }}></span>调度引擎运行中</span>
        <span style={{ color: 'var(--border-color)' }}>|</span>
        <span>MES API <span style={{ color: 'var(--accent)', fontWeight: 700 }}>已对接</span></span>
        <span style={{ color: 'var(--border-color)' }}>|</span>
        <span>WMS 联动 <span style={{ color: 'var(--accent)', fontWeight: 700 }}>已对接</span></span>
        <span style={{ color: 'var(--border-color)' }}>|</span>
        <span>排程算法 <span style={{ color: 'var(--accent)', fontWeight: 700 }}>最优排程</span></span>
      </div>

      <div style={{
        border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-card)', overflow: 'hidden', marginBottom: 16,
      }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>工单编号</th><th>来源</th><th>设备</th><th>维护类型</th>
              <th>状态</th><th>备件状态</th><th>排程窗口</th><th>进度</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ORDERS.map((wo) => (
              <tr key={wo.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 12 }}>{wo.id}</td>
                <td style={{ fontSize: 12 }}>{wo.source}</td>
                <td style={{ fontWeight: 600, fontSize: 12 }}>{wo.device}</td>
                <td><span style={typeBadgeStyle(wo.typeLevel)}>{wo.type}</span></td>
                <td><span style={{ fontSize: 11, fontWeight: 600, color: statusColor(wo.status) }}>{wo.status}</span></td>
                <td>
                  <span style={{ fontSize: 10, fontWeight: 700, color: wo.spareOk ? 'var(--level-normal)' : 'var(--level-warning)' }}>
                    {wo.spareStatus}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11 }}>{wo.schedule}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${wo.progress}%`, height: '100%', borderRadius: 2,
                        background: progressColor(wo.progress),
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: progressColor(wo.progress), fontWeight: 700 }}>
                      {wo.progress}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, fontWeight: 600,
        color: 'var(--text-dimmed)', flexWrap: 'wrap',
      }}>
        <span>📊 今日自动生成 <span style={{ color: 'var(--accent)', fontWeight: 800, fontFamily: 'var(--font-data)' }}>{MOCK_ORDERS.length}</span> 张工单</span>
        <span style={{ color: 'var(--border-color)' }}>|</span>
        <span>备件满足率 <span style={{ color: 'var(--level-normal)', fontWeight: 800, fontFamily: 'var(--font-data)' }}>87%</span></span>
        <span style={{ color: 'var(--border-color)' }}>|</span>
        <span>平均排程提前 <span style={{ color: 'var(--accent)', fontWeight: 800, fontFamily: 'var(--font-data)' }}>72h</span></span>
        <span style={{ color: 'var(--border-color)' }}>|</span>
        <span>预计减少停机 <span style={{ color: 'var(--level-normal)', fontWeight: 800 }}>46%</span></span>
      </div>

      <div style={{
        marginTop: 20, padding: '16px 20px', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)', background: 'var(--bg-elevated)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
          🔄 调度流程
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          flexWrap: 'wrap', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
        }}>
          {['AI 预测告警', '备件库存检查', '最优排程计算', 'MES 工单下发', '执行确认反馈'].map((step, i) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                padding: '8px 14px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                color: 'var(--text-primary)', textAlign: 'center', whiteSpace: 'nowrap',
              }}>
                {step}
              </div>
              {i < 4 && (
                <span style={{ color: 'var(--accent)', fontSize: 16, fontWeight: 700 }}>→</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
