import { useState, useMemo, useCallback } from 'react';
import type { DashboardSnapshot } from '../../shared/types';

interface Props {
  snapshot: DashboardSnapshot;
  selectedCylinderUid?: string;
}

interface CylinderSubInfo {
  subId: string;
  stroke: number;
  theoreticalTimeMs: number;
  actualTimeMs: number;
  deviationMs: number;
  status: 'normal' | 'attention' | 'alarm';
  lastCheckDate: string;
  serviceHours: number;
  maintenanceCount: number;
}

function generateSubCylinders(risk: DashboardSnapshot['topRisks'][number]): CylinderSubInfo[] {
  const count = 3 + Math.floor(Math.random() * 4);
  return Array.from({ length: count }, (_, i) => {
    const baseMs = risk.baselineMs + (Math.random() - 0.4) * 60;
    const actMs = baseMs + (Math.random() - 0.3) * 80;
    const devMs = Math.round(actMs - baseMs);
    const status: CylinderSubInfo['status'] = devMs > 30 ? 'alarm' : devMs > 15 ? 'attention' : 'normal';
    return {
      subId: `${risk.cylinderUid}-${String(i + 1).padStart(2, '0')}`,
      stroke: [80, 100, 120, 150, 180, 200][Math.floor(Math.random() * 6)],
      theoreticalTimeMs: Math.round(baseMs),
      actualTimeMs: Math.round(actMs),
      deviationMs: devMs,
      status,
      lastCheckDate: new Date(Date.now() - Math.floor(Math.random() * 90 * 86400000)).toLocaleDateString('zh-CN'),
      serviceHours: Math.floor(Math.random() * 5000 + 1000),
      maintenanceCount: Math.floor(Math.random() * 8),
    };
  });
}

export default function EquipmentDetailPanel({ snapshot, selectedCylinderUid }: Props) {
  const [searchText, setSearchText] = useState('');
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'info' | 'warning' | 'critical'>('all');
  const [sortKey, setSortKey] = useState<'name' | 'health' | 'fault'>('health');
  const [selectedForDetail, setSelectedForDetail] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleViewTrend = useCallback((device: DashboardSnapshot['topRisks'][number]) => {
    window.dispatchEvent(new CustomEvent('selectCylinder', { detail: device.cylinderUid }));
    showToast(`已选中 ${device.name}，查看下方趋势图`, 'info');
  }, [showToast]);

  const handleDispatchWorkOrder = useCallback((device: DashboardSnapshot['topRisks'][number]) => {
    showToast(`工单已派发：${device.name} 检查维护`, 'success');
    window.dispatchEvent(new CustomEvent('switchPanel', { detail: 'workorder' }));
  }, [showToast]);

  const handleEditDevice = useCallback((device: DashboardSnapshot['topRisks'][number]) => {
    showToast(`编辑设备信息：${device.name}（模拟）`, 'info');
  }, [showToast]);

  const filteredDevices = useMemo(() => {
    let list = [...snapshot.topRisks];
    if (filterStatus !== 'all') {
      list = list.filter((r) => r.alertLevel === filterStatus);
    }
    if (searchText) {
      list = list.filter((r) =>
        r.name.toLowerCase().includes(searchText.toLowerCase())
        || r.deviceName.toLowerCase().includes(searchText.toLowerCase())
        || r.cylinderUid.toLowerCase().includes(searchText.toLowerCase()),
      );
    }
    switch (sortKey) {
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'health': list.sort((a, b) => a.healthScore - b.healthScore); break;
      case 'fault': list.sort((a, b) => b.faultProbability - a.faultProbability); break;
    }
    return list.slice(0, 20);
  }, [snapshot.topRisks, filterStatus, searchText, sortKey]);

  const getAlertCfg = (level: string) => {
    const cfg: Record<string, { dot: string; color: string; bg: string; label: string }> = {
      critical: { dot: '🔴', color: '#f87171', bg: '#ef444415', label: '异常' },
      warning: { dot: '🟡', color: '#fbbf24', bg: '#f59e0b10', label: '关注' },
      info: { dot: '🔵', color: '#60a5fa', bg: '#3b82f610', label: '提示' },
      normal: { dot: '🟢', color: '#4ade80', bg: '#22c55e10', label: '正常' },
    };
    return cfg[level] || cfg.normal;
  };

  const expandedDeviceData = useMemo(() => {
    if (!expandedDevice) return null;
    const device = snapshot.topRisks.find((r) => r.cylinderUid === expandedDevice);
    if (!device) return null;
    return {
      ...device,
      subCylinders: generateSubCylinders(device),
    };
  }, [expandedDevice, snapshot.topRisks]);

  return (
    <div style={{ padding: 12, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
          padding: '7px 16px', borderRadius: 20, fontSize: 10, fontWeight: 600,
          background: toast.type === 'success' ? '#22c55e20' : toast.type === 'warning' ? '#f59e0b20' : '#3b82f620',
          border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.4)' : toast.type === 'warning' ? 'rgba(245,158,11,0.4)' : 'rgba(59,130,246,0.4)'}`,
          color: toast.type === 'success' ? '#4ade80' : toast.type === 'warning' ? '#fbbf24' : '#60a5fa',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {toast.type === 'success' ? '✓' : toast.type === 'warning' ? '⚠' : 'ℹ'} {toast.text}
        </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 15 }}>🔧</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#eef5ff' }}>设备详情</span>
        <span style={{ fontSize: 9, color: '#6b8ab5', marginLeft: 'auto' }}>
          {snapshot.topRisks.length} 台设备
        </span>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          type="text"
          placeholder="搜索设备UID / 名称..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            flex: 1, padding: '6px 10px', borderRadius: 5, border: '1px solid rgba(59,130,246,0.2)',
            background: 'rgba(8,20,40,0.6)', color: '#e0eaf5', fontSize: 10, outline: 'none',
          }}
        />
        <button
          onClick={() => setSortKey(sortKey === 'health' ? 'fault' : sortKey === 'fault' ? 'name' : 'health')}
          style={{
            padding: '4px 10px', borderRadius: 5, fontSize: 9,
            border: '1px solid rgba(59,130,246,0.15)', background: 'transparent', color: '#6b8ab5', cursor: 'pointer',
          }}
          title={`排序: ${sortKey === 'health' ? '健康' : sortKey === 'fault' ? '概率' : '名称'}`}
        >
          ↕ {sortKey === 'health' ? '健康' : sortKey === 'fault' ? '概率' : '名称'}
        </button>
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 4 }}>
        {([
          { key: 'all' as const, label: '全部', color: '#6b8ab5' },
          { key: 'critical' as const, label: '紧急', color: '#f87171' },
          { key: 'warning' as const, label: '预警', color: '#fbbf24' },
          { key: 'info' as const, label: '提示', color: '#60a5fa' },
          { key: 'normal' as const, label: '正常', color: '#4ade80' },
        ]).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilterStatus(opt.key)}
            style={{
              flex: 1, padding: '4px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 9, fontWeight: 600,
              border: `1.5px solid ${filterStatus === opt.key ? opt.color + '40' : 'rgba(59,130,246,0.12)'}`,
              background: filterStatus === opt.key ? opt.color + '15' : 'transparent',
              color: filterStatus === opt.key ? opt.color : '#6b8ab5',
              transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Device list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filteredDevices.map((device) => {
          const cfg = getAlertCfg(device.alertLevel);
          const isExpanded = expandedDevice === device.cylinderUid;
          const isSelected = selectedCylinderUid === device.cylinderUid;

          return (
            <div key={device.cylinderUid}>
              {/* Row */}
              <div
                onClick={() => {
                  setExpandedDevice(isExpanded ? null : device.cylinderUid);
                  if (!isExpanded) {
                    window.dispatchEvent(new CustomEvent('selectCylinder', { detail: device.cylinderUid }));
                  }
                }}
                style={{
                  padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                  background: isSelected ? 'rgba(59,130,246,0.1)' : isExpanded ? 'rgba(59,130,246,0.06)' : 'transparent',
                  border: `1px solid ${isSelected ? 'rgba(59,130,246,0.3)' : isExpanded ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.06)'}`,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 10 }}>{cfg.dot}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#e0eaf5' }}>{device.name}</span>
                        <span style={{
                          fontSize: 8, padding: '1px 6px', borderRadius: 8,
                          background: cfg.bg, color: cfg.color, fontWeight: 600,
                        }}>
                          {cfg.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 9, color: '#6b8ab5', marginTop: 1 }}>
                        {device.deviceName} · {device.stationId}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-data)', color: cfg.color }}>
                        {device.healthScore}
                      </div>
                      <div style={{ fontSize: 8, color: '#506a90' }}>健康分</div>
                    </div>
                    <span style={{ fontSize: 10, color: '#506a90' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && expandedDeviceData && (
                <div style={{
                  marginTop: 4, marginBottom: 4, padding: '10px 12px', borderRadius: 6,
                  background: 'rgba(15,35,65,0.5)', border: '1px solid rgba(59,130,246,0.15)',
                  animation: 'fadeSlideIn 0.25s ease',
                }}>
                  {/* Device summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 8, color: '#506a90' }}>设备编号</div>
                      <div style={{ fontSize: 10, color: '#e0eaf5', fontFamily: 'var(--font-mono)' }}>{device.cylinderUid}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 8, color: '#506a90' }}>所属产线</div>
                      <div style={{ fontSize: 10, color: '#e0eaf5' }}>{device.stationId.replace('ST-', '')}号线</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 8, color: '#506a90' }}>故障概率</div>
                      <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>{device.faultProbability}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 8, color: '#506a90' }}>执行时间</div>
                      <div style={{ fontSize: 10, color: '#e0eaf5' }}>{device.latestExecutionTimeMs}ms / 基线{device.baselineMs}ms</div>
                    </div>
                  </div>

                  {/* Sub-cylinders table */}
                  <div style={{ fontSize: 10, color: '#6b8ab5', fontWeight: 600, marginBottom: 6 }}>
                    气缸参数（{expandedDeviceData.subCylinders.length} 个子缸）
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '50px 40px 55px 55px 55px 1fr', gap: 2, paddingBottom: 3, borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
                      {['子缸ID', '行程mm', '理论ms', '实际ms', '偏差ms', '状态'].map((h) => (
                        <div key={h} style={{ fontSize: 8, color: '#506a90' }}>{h}</div>
                      ))}
                    </div>
                    {expandedDeviceData.subCylinders.map((sub) => {
                      const subStatus = sub.status === 'alarm' ? { color: '#f87171', bg: '#ef444415', text: '异常' }
                        : sub.status === 'attention' ? { color: '#fbbf24', bg: '#f59e0b10', text: '关注' }
                          : { color: '#4ade80', bg: '#22c55e10', text: '正常' };
                      return (
                        <div
                          key={sub.subId}
                          onClick={(e) => { e.stopPropagation(); }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.06)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          style={{
                            display: 'grid', gridTemplateColumns: '50px 40px 55px 55px 55px 1fr', gap: 2,
                            padding: '4px 2px', borderRadius: 3, cursor: 'default', transition: 'background 0.1s',
                          }}
                          title={`上次点检: ${sub.lastCheckDate} · 运行: ${sub.serviceHours}h · 维护: ${sub.maintenanceCount}次`}
                        >
                          <span style={{ fontSize: 9, color: '#8aa8d0', fontFamily: 'var(--font-mono)' }}>{sub.subId.split('-').pop()}</span>
                          <span style={{ fontSize: 9, color: '#a0b8d0' }}>{sub.stroke}</span>
                          <span style={{ fontSize: 9, color: '#6b8ab5', fontFamily: 'var(--font-mono)' }}>{sub.theoreticalTimeMs}</span>
                          <span style={{ fontSize: 9, color: '#e0eaf5', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{sub.actualTimeMs}</span>
                          <span style={{
                            fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600,
                            color: sub.deviationMs > 30 ? '#f87171' : sub.deviationMs > 15 ? '#fbbf24' : '#4ade80',
                          }}>
                            {sub.deviationMs > 0 ? '+' : ''}{sub.deviationMs}
                          </span>
                          <span style={{
                            fontSize: 8, padding: '1px 6px', borderRadius: 3, textAlign: 'center',
                            background: subStatus.bg, color: subStatus.color, fontWeight: 600,
                          }}>
                            {sub.deviationMs > 30 ? '⚠️' : sub.deviationMs > 15 ? '🔔' : '✓'} {subStatus.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button onClick={() => handleViewTrend(device)}
                      style={{ flex: 1, padding: '5px 0', borderRadius: 5, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', cursor: 'pointer', fontWeight: 600, fontSize: 10 }}>
                      📈 查看趋势
                    </button>
                    <button onClick={() => handleDispatchWorkOrder(device)}
                      style={{ flex: 1, padding: '5px 0', borderRadius: 5, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#fbbf24', cursor: 'pointer', fontWeight: 600, fontSize: 10 }}>
                      📋 派发工单
                    </button>
                    <button onClick={() => handleEditDevice(device)}
                      style={{ flex: 1, padding: '5px 0', borderRadius: 5, border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.06)', color: '#6b8ab5', cursor: 'pointer', fontWeight: 600, fontSize: 10 }}>
                      ✏️ 编辑
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
