import { useMemo, useState } from 'react';
import type { DashboardSnapshot } from '../../shared/types';

interface Props {
  snapshot: DashboardSnapshot;
  onSelectCylinder?: (uid: string) => void;
}

export default function QuickQuery({ snapshot, onSelectCylinder }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof snapshot.cylinders>([]);
  const [alertResults, setAlertResults] = useState<typeof snapshot.alerts>([]);
  const [searchMode, setSearchMode] = useState<'device' | 'alert'>('device');
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) { setResults([]); setAlertResults([]); setSearched(false); return; }
    if (searchMode === 'device') {
      const matched = snapshot.cylinders.filter(c =>
        c.uid.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.deviceName.toLowerCase().includes(q) ||
        c.stationId.toLowerCase().includes(q) ||
        c.lineId.toLowerCase().includes(q)
      );
      setResults(matched);
      setAlertResults([]);
    } else {
      const matched = snapshot.alerts.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.level.toLowerCase().includes(q) ||
        a.cylinderUid.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q)
      );
      setAlertResults(matched);
      setResults([]);
    }
    setSearched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const criticalCount = snapshot.cylinders.filter(c => c.healthScore < 40).length;
  const warningCount = snapshot.cylinders.filter(c => c.healthScore >= 40 && c.healthScore <= 70).length;
  const avgHealth = Math.round(snapshot.cylinders.reduce((s, c) => s + c.healthScore, 0) / snapshot.cylinders.length);

  return (
    <div className="quick-query" style={{
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Quick stats bar */}
      <div style={{
        display: 'flex', gap: 16, fontSize: 11, fontWeight: 600,
        color: 'var(--text-secondary)', flexWrap: 'wrap',
        padding: '8px 14px', borderRadius: 'var(--radius-md)',
        background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
      }}>
        <span>📊 设备数 <b style={{ color: 'var(--accent)', fontFamily: 'var(--font-data)' }}>{snapshot.cylinders.length}</b></span>
        <span style={{ color: 'var(--border-color)' }}>|</span>
        <span>均健康分 <b style={{ color: avgHealth > 70 ? 'var(--level-normal)' : 'var(--level-warning)', fontFamily: 'var(--font-data)' }}>{avgHealth}</b></span>
        <span style={{ color: 'var(--border-color)' }}>|</span>
        <span>🔴 紧急 <b style={{ color: 'var(--level-critical)' }}>{criticalCount}</b></span>
        <span>🟡 预警 <b style={{ color: 'var(--level-warning)' }}>{warningCount}</b></span>
      </div>

      {/* Search mode tabs */}
      <div style={{ display: 'flex', gap: 4 }}>
        <span onClick={() => { setSearchMode('device'); setQuery(''); setSearched(false); }}
          style={{ padding: '4px 12px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer',
            background: searchMode === 'device' ? 'var(--accent-dim)' : 'transparent',
            color: searchMode === 'device' ? 'var(--accent)' : 'var(--text-dimmed)', border: '1px solid var(--border-color)' }}>
          🔍 查设备
        </span>
        <span onClick={() => { setSearchMode('alert'); setQuery(''); setSearched(false); }}
          style={{ padding: '4px 12px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer',
            background: searchMode === 'alert' ? 'var(--accent-dim)' : 'transparent',
            color: searchMode === 'alert' ? 'var(--accent)' : 'var(--text-dimmed)', border: '1px solid var(--border-color)' }}>
          🚨 查告警
        </span>
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{
            flex: 1, padding: '8px 14px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)', background: 'var(--bg-elevated)',
            color: 'var(--text-bright)', fontSize: 13, fontFamily: 'var(--font-sans)',
            outline: 'none', fontWeight: 500,
          }}
          placeholder={searchMode === 'device' ? '快速查设备：输入 UID / 名称 / 工位 / 产线...' : '快速查告警：输入标题 / 等级 / 设备...'}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSearched(false); }}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={handleSearch}
          style={{
            padding: '8px 18px', borderRadius: 'var(--radius-md)',
            border: 'none', background: 'var(--gradient-accent)',
            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          🔍 查询
        </button>
      </div>

      {/* Device results */}
      {searched && searchMode === 'device' && (
        <div style={{
          border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card)', overflow: 'hidden',
        }}>
          {results.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-dimmed)' }}>
              未找到匹配设备，请尝试其他关键词
            </div>
          ) : (
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>UID</th><th>名称</th><th>设备</th><th>工位</th><th>健康分</th><th>故障率</th><th>等级</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 8).map(c => (
                  <tr key={c.uid}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectCylinder?.(c.uid)}
                  >
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{c.uid.slice(-10)}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.deviceName}</td>
                    <td>{c.stationId}</td>
                    <td style={{
                      fontWeight: 700,
                      color: c.healthScore > 70 ? 'var(--level-normal)' : c.healthScore > 40 ? 'var(--level-warning)' : 'var(--level-critical)',
                    }}>{c.healthScore}</td>
                    <td>{c.faultProbability}%</td>
                    <td>
                      <span className={`badge ${c.alertLevel === 'critical' ? 'badge-active' : c.alertLevel === 'warning' ? 'badge-acknowledged' : 'badge-closed'}`}>
                        {c.alertLevel === 'critical' ? '紧急' : c.alertLevel === 'warning' ? '预警' : '正常'}
                      </span>
                    </td>
                  </tr>
                ))}
                {results.length > 8 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dimmed)', fontSize: 10, padding: 8 }}>
                    还有 {results.length - 8} 条结果，请缩小搜索范围
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Alert results */}
      {searched && searchMode === 'alert' && (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', overflow: 'hidden' }}>
          {alertResults.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-dimmed)' }}>未找到匹配告警，请尝试其他关键词</div>
          ) : (
            <table className="data-table" style={{ width: '100%' }}>
              <thead><tr><th>等级</th><th>标题</th><th>状态</th><th>关联气缸</th><th>时间</th></tr></thead>
              <tbody>
                {alertResults.slice(0, 8).map(a => (
                  <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => onSelectCylinder?.(a.cylinderUid)}>
                    <td><span className={`badge ${a.level === 'critical' ? 'badge-active' : a.level === 'warning' ? 'badge-acknowledged' : 'badge-info'}`}>{a.level === 'critical' ? '紧急' : a.level === 'warning' ? '预警' : '提示'}</span></td>
                    <td style={{ fontSize: 12 }}>{a.title}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-dimmed)' }}>{a.status === 'active' ? '待处理' : a.status === 'acknowledged' ? '已确认' : '已关闭'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dimmed)' }}>{a.cylinderUid.slice(-10)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dimmed)' }}>{new Date(a.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
