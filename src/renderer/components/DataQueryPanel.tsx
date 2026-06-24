import { useState, useMemo, useCallback } from 'react';
import type { DashboardSnapshot } from '../../shared/types';

interface Props {
  snapshot: DashboardSnapshot;
}

interface QueryResult {
  date: string;
  time: string;
  cylinderUid: string;
  cylinderName: string;
  executionTimeMs: number;
  status: 'normal' | 'high' | 'low' | 'invalid';
  baselineMs: number;
  max?: number;
  min?: number;
  invalidCount?: number;
}

function generateQueryResults(
  snapshot: DashboardSnapshot,
  deviceFilter: string,
  cylinderFilter: string,
  dataType: 'raw' | 'summary',
  timeRange: string,
): QueryResult[] {
  const results: QueryResult[] = [];
  const now = Date.now();
  const rangeMs = timeRange === 'today' ? 86400000 : timeRange === '7d' ? 604800000 : 2592000000;
  const bucketCount = dataType === 'raw' ? 48 : 15;

  snapshot.topRisks
    .filter((r) => !deviceFilter || r.deviceName.includes(deviceFilter) || r.cylinderUid.includes(deviceFilter))
    .filter((r) => !cylinderFilter || r.cylinderUid.includes(cylinderFilter) || r.name.includes(cylinderFilter))
    .forEach((risk) => {
      for (let i = 0; i < bucketCount; i++) {
        const t = now - rangeMs + (rangeMs / bucketCount) * i;
        const baseVal = risk.latestExecutionTimeMs + (Math.random() - 0.5) * 40;
        const status: QueryResult['status'] = Math.random() > 0.95
          ? 'invalid'
          : baseVal > risk.baselineMs * 1.15 ? 'high'
            : baseVal < risk.baselineMs * 0.8 ? 'low' : 'normal';
        results.push({
          date: new Date(t).toLocaleDateString('zh-CN'),
          time: new Date(t).toLocaleTimeString('zh-CN', { hour12: false }),
          cylinderUid: risk.cylinderUid,
          cylinderName: risk.name,
          executionTimeMs: status === 'invalid' ? -(Math.floor(Math.random() * 20 + 1)) : Math.round(baseVal),
          status,
          baselineMs: risk.baselineMs,
        });
      }
    });

  if (dataType === 'summary') {
    const grouped = new Map<string, { sum: number; max: number; min: number; count: number; invalidCount: number; cylinderUid: string; cylinderName: string; date: string }>();
    results.forEach((r) => {
      const key = `${r.date}-${r.cylinderUid}`;
      if (!grouped.has(key)) {
        grouped.set(key, { sum: 0, max: 0, min: Infinity, count: 0, invalidCount: 0, cylinderUid: r.cylinderUid, cylinderName: r.cylinderName, date: r.date });
      }
      const g = grouped.get(key)!;
      if (r.status === 'invalid') { g.invalidCount++; }
      else { g.sum += r.executionTimeMs; g.max = Math.max(g.max, r.executionTimeMs); g.min = Math.min(g.min, r.executionTimeMs); g.count++; }
    });
    return Array.from(grouped.values()).map((g) => ({
      date: g.date, time: '', cylinderUid: g.cylinderUid, cylinderName: g.cylinderName,
      executionTimeMs: g.count > 0 ? Math.round(g.sum / g.count) : 0,
      baselineMs: snapshot.topRisks.find((r) => r.cylinderUid === g.cylinderUid)?.baselineMs ?? 0,
      status: g.invalidCount > 0 ? 'invalid' as const : 'normal' as const,
      max: g.max, min: g.min === Infinity ? 0 : g.min, invalidCount: g.invalidCount,
    }));
  }
  return results;
}

export default function DataQueryPanel({ snapshot }: Props) {
  const [deviceFilter, setDeviceFilter] = useState('');
  const [cylinderFilter, setCylinderFilter] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d'>('7d');
  const [dataType, setDataType] = useState<'raw' | 'summary'>('raw');
  const [queried, setQueried] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const pageSize = 12;

  const results = useMemo(() => {
    if (!queried) return [];
    return generateQueryResults(snapshot, deviceFilter, cylinderFilter, dataType, timeRange);
  }, [snapshot, deviceFilter, cylinderFilter, dataType, timeRange, queried]);

  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return results.slice(start, start + pageSize);
  }, [results, currentPage]);

  const totalPages = Math.ceil(results.length / pageSize);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleQuery = useCallback(() => {
    setQueried(true);
    setCurrentPage(1);
    showToast(`查询完成，共 ${results.length || '--'} 条记录`, 'success');
  }, [results.length, showToast]);

  const handleExport = useCallback(() => {
    if (!queried || results.length === 0) { showToast('请先查询数据', 'warning'); return; }
    setIsExporting(true);
    const headers = dataType === 'raw'
      ? ['日期', '时间', '气缸UID', '气缸名称', '执行时间(ms)', '状态', '偏离(%)']
      : ['日期', '气缸UID', '气缸名称', '平均值(ms)', '最大值(ms)', '最小值(ms)', '非法数据数', '偏离(%)'];
    const rows: string[][] = [headers];
    results.forEach((r) => {
      const devPct = r.baselineMs > 0 ? ((r.executionTimeMs - r.baselineMs) / r.baselineMs * 100).toFixed(1) : '--';
      if (dataType === 'raw') {
        rows.push([r.date, r.time, r.cylinderUid, r.cylinderName, String(r.executionTimeMs), r.status, r.status === 'invalid' ? '--' : devPct]);
      } else {
        const s = r as any;
        rows.push([r.date, r.cylinderUid, r.cylinderName, String(r.executionTimeMs), String(s.max || ''), String(s.min || ''), String(s.invalidCount || 0), r.status === 'invalid' ? '--' : devPct]);
      }
    });
    const csv = '﻿' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `数据查询_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}_${timeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => { setIsExporting(false); showToast('CSV 文件已下载', 'success'); }, 300);
  }, [queried, results, dataType, timeRange, showToast]);

  const invalidCount = useMemo(() => results.filter((r) => r.status === 'invalid').length, [results]);
  const highCount = useMemo(() => results.filter((r) => r.status === 'high').length, [results]);
  const totalCount = results.length;

  const getStatusTag = (status: string) => {
    const cfg: Record<string, { bg: string; color: string; text: string }> = {
      normal: { bg: '#22c55e15', color: '#4ade80', text: '正常' },
      high: { bg: '#f59e0b15', color: '#fbbf24', text: '偏高' },
      low: { bg: '#3b82f615', color: '#60a5fa', text: '偏低' },
      invalid: { bg: '#ef444415', color: '#f87171', text: '非法数据' },
    };
    return cfg[status] || cfg.normal;
  };

  return (
    <div style={{ padding: 12, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 15 }}>📊</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#eef5ff' }}>数据查询</span>
        {queried && <span style={{ fontSize: 9, color: '#4ade80', marginLeft: 'auto' }}>✓ 已查询</span>}
      </div>

      <div style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)', background: 'rgba(15,35,65,0.4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 5 }}>
          <div>
            <div style={{ fontSize: 8, color: '#6b8ab5', marginBottom: 2 }}>设备筛选</div>
            <input type="text" placeholder="设备UID/名称..." value={deviceFilter} onChange={(e) => setDeviceFilter(e.target.value)}
              style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(8,20,40,0.6)', color: '#e0eaf5', fontSize: 9, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize: 8, color: '#6b8ab5', marginBottom: 2 }}>气缸筛选</div>
            <input type="text" placeholder="气缸UID/名称..." value={cylinderFilter} onChange={(e) => setCylinderFilter(e.target.value)}
              style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(8,20,40,0.6)', color: '#e0eaf5', fontSize: 9, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 8, color: '#6b8ab5', marginBottom: 2 }}>时间</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {(['today', '7d', '30d'] as const).map((opt) => (
                <button key={opt} onClick={() => setTimeRange(opt)}
                  style={{ flex: 1, padding: '3px 4px', borderRadius: 3, cursor: 'pointer', fontSize: 9, border: `1px solid ${timeRange === opt ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.12)'}`, background: timeRange === opt ? 'rgba(59,130,246,0.15)' : 'transparent', color: timeRange === opt ? '#60a5fa' : '#6b8ab5', fontWeight: timeRange === opt ? 600 : 400 }}>
                  {opt === 'today' ? '今日' : opt === '7d' ? '7天' : '30天'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 8, color: '#6b8ab5', marginBottom: 2 }}>类型</div>
            <div style={{ display: 'flex', gap: 3 }}>
              <button onClick={() => setDataType('raw')}
                style={{ flex: 1, padding: '3px 4px', borderRadius: 3, cursor: 'pointer', fontSize: 9, border: `1px solid ${dataType === 'raw' ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.12)'}`, background: dataType === 'raw' ? 'rgba(59,130,246,0.15)' : 'transparent', color: dataType === 'raw' ? '#60a5fa' : '#6b8ab5', fontWeight: dataType === 'raw' ? 600 : 400 }}>原始</button>
              <button onClick={() => setDataType('summary')}
                style={{ flex: 1, padding: '3px 4px', borderRadius: 3, cursor: 'pointer', fontSize: 9, border: `1px solid ${dataType === 'summary' ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.12)'}`, background: dataType === 'summary' ? 'rgba(59,130,246,0.15)' : 'transparent', color: dataType === 'summary' ? '#60a5fa' : '#6b8ab5', fontWeight: dataType === 'summary' ? 600 : 400 }}>汇总</button>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={handleQuery}
            style={{ flex: 1, padding: '6px 0', borderRadius: 5, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 10 }}>🔍 查询</button>
          <button onClick={handleExport} disabled={!queried || results.length === 0 || isExporting}
            style={{ padding: '6px 12px', borderRadius: 5, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)', color: queried && results.length > 0 ? '#4ade80' : '#3a5a80', cursor: queried && results.length > 0 ? 'pointer' : 'default', fontWeight: 600, fontSize: 10, opacity: queried ? 1 : 0.5 }}>
            {isExporting ? '⏳' : '📥'} 导出
          </button>
        </div>
      </div>

      {queried && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '5px 8px', borderRadius: 6, background: 'rgba(15,35,65,0.4)', border: '1px solid rgba(59,130,246,0.08)' }}>
          <span style={{ fontSize: 9, color: '#e0eaf5', fontWeight: 600 }}>共 {totalCount} 条</span>
          {highCount > 0 && <span style={{ fontSize: 9, color: '#fbbf24', padding: '1px 4px', borderRadius: 3, background: '#f59e0b15' }}>⚠ {highCount} 偏高</span>}
          {invalidCount > 0 && <span style={{ fontSize: 9, color: '#f87171', padding: '1px 4px', borderRadius: 3, background: '#ef444415' }}>❌ {invalidCount} 非法</span>}
          <span style={{ fontSize: 7, color: '#506a90', marginLeft: 'auto' }}>📌 非法数据已标记并记录日志</span>
        </div>
      )}

      {queried && results.length > 0 && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: dataType === 'summary' ? '60px 1fr 50px 50px 50px 45px' : '60px 50px 1fr 48px 40px',
            gap: 1, padding: '3px 0', borderBottom: '1px solid rgba(59,130,246,0.12)', marginBottom: 1,
          }}>
            <span style={{ fontSize: 8, color: '#6b8ab5', fontWeight: 600 }}>日期</span>
            {dataType === 'raw' && <span style={{ fontSize: 8, color: '#6b8ab5', fontWeight: 600 }}>时间</span>}
            <span style={{ fontSize: 8, color: '#6b8ab5', fontWeight: 600 }}>{dataType === 'raw' ? '时间ms' : '气缸'}</span>
            {dataType === 'summary' && (<><span style={{ fontSize: 8, color: '#6b8ab5', fontWeight: 600, textAlign: 'right' }}>均值</span><span style={{ fontSize: 8, color: '#6b8ab5', fontWeight: 600, textAlign: 'right' }}>最大</span><span style={{ fontSize: 8, color: '#6b8ab5', fontWeight: 600, textAlign: 'right' }}>最小</span></>)}
            {dataType === 'raw' && <span style={{ fontSize: 8, color: '#6b8ab5', fontWeight: 600, textAlign: 'right' }}>状态</span>}
            <span style={{ fontSize: 8, color: '#6b8ab5', fontWeight: 600, textAlign: 'right' }}>偏离</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', fontSize: 9 }}>
            {paginatedResults.map((row, idx) => {
              const statusCfg = getStatusTag(row.status);
              const baseline = (row as any).baselineMs || row.baselineMs;
              const devPct = baseline > 0 ? ((row.executionTimeMs - baseline) / baseline * 100).toFixed(1) : '--';
              const summaryRow = row as any;
              return (
                <div key={`${row.date}-${idx}`}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(59,130,246,0.02)'; }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: dataType === 'summary' ? '60px 1fr 50px 50px 50px 45px' : '60px 50px 1fr 48px 40px',
                    gap: 1, padding: '4px 0', cursor: row.status === 'invalid' ? 'pointer' : 'default',
                    borderBottom: '1px solid rgba(59,130,246,0.04)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(59,130,246,0.02)',
                    transition: 'background 0.1s',
                  }}
                  title={row.status === 'invalid' ? `非法数据：${row.executionTimeMs < 0 ? '负数值（传感器异常）' : '超出合理范围'} · 不参与统计` : ''}
                >
                  <span style={{ color: '#6b8ab5', fontFamily: 'var(--font-mono)', fontSize: 8 }}>{row.date}</span>
                  {dataType === 'raw' && <span style={{ color: '#506a90', fontFamily: 'var(--font-mono)', fontSize: 8 }}>{row.time}</span>}
                  <span style={{ color: row.status === 'invalid' ? '#6b8ab5' : '#e0eaf5', fontWeight: dataType === 'summary' ? 600 : 400, fontSize: 9 }}>
                    {dataType === 'summary' ? row.cylinderName : `${Math.abs(row.executionTimeMs)}ms`}
                  </span>
                  {dataType === 'summary' && (
                    <>
                      <span style={{ color: '#e0eaf5', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 8 }}>{summaryRow.executionTimeMs}ms</span>
                      <span style={{ color: '#60a5fa', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 8 }}>{summaryRow.max}ms</span>
                      <span style={{ color: '#4ade80', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 8 }}>{summaryRow.min === 0 ? '--' : `${summaryRow.min}ms`}</span>
                    </>
                  )}
                  {dataType === 'raw' && (
                    <span style={{ textAlign: 'right', fontSize: 8, padding: '1px 3px', borderRadius: 3, background: statusCfg.bg, color: statusCfg.color }}>{statusCfg.text}</span>
                  )}
                  <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 8, color: row.status === 'invalid' ? '#6b8ab5' : Number(devPct) > 10 ? '#ef4444' : Number(devPct) > 5 ? '#f59e0b' : '#4ade80' }}>
                    {row.status === 'invalid' ? '--' : `${devPct}%`}
                  </span>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, padding: '6px 0', borderTop: '1px solid rgba(59,130,246,0.08)' }}>
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ padding: '2px 6px', borderRadius: 3, cursor: currentPage === 1 ? 'default' : 'pointer', fontSize: 9, border: '1px solid rgba(59,130,246,0.12)', background: 'transparent', color: currentPage === 1 ? '#3a5a80' : '#6b8ab5', opacity: currentPage === 1 ? 0.5 : 1 }}>‹</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p = i + 1;
                if (totalPages > 5 && currentPage > 3) p = currentPage - 2 + i;
                if (p > totalPages) return null;
                return (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    style={{ padding: '2px 6px', borderRadius: 3, cursor: 'pointer', fontSize: 9, border: `1px solid ${p === currentPage ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.08)'}`, background: p === currentPage ? 'rgba(59,130,246,0.15)' : 'transparent', color: p === currentPage ? '#60a5fa' : '#6b8ab5', fontWeight: p === currentPage ? 700 : 400 }}>{p}</button>
                );
              })}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                style={{ padding: '2px 6px', borderRadius: 3, cursor: currentPage === totalPages ? 'default' : 'pointer', fontSize: 9, border: '1px solid rgba(59,130,246,0.12)', background: 'transparent', color: currentPage === totalPages ? '#3a5a80' : '#6b8ab5', opacity: currentPage === totalPages ? 0.5 : 1 }}>›</button>
            </div>
          )}
        </div>
      )}

      {queried && results.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 11, color: '#6b8ab5' }}>无匹配数据</div>
            <div style={{ fontSize: 9, color: '#506a90', marginTop: 4 }}>尝试调整筛选条件或扩大时间范围</div>
          </div>
        </div>
      )}

      {!queried && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 11, color: '#6b8ab5' }}>设置查询条件</div>
            <div style={{ fontSize: 9, color: '#506a90', marginTop: 4 }}>选择设备和时间范围后点击"查询"</div>
          </div>
        </div>
      )}
    </div>
  );
}
