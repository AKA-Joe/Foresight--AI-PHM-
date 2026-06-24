import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import type { DashboardSnapshot } from '../../shared/types';

interface Props {
  snapshot: DashboardSnapshot;
  onSelect?: (uid: string) => void;
}

export default function RiskRankingChart({ snapshot, onSelect }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<'health' | 'fault' | 'deviation'>('health');
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());

  const enriched = useMemo(() => {
    const sorted = [...snapshot.topRisks];
    switch (sortKey) {
      case 'health': sorted.sort((a, b) => a.healthScore - b.healthScore); break;
      case 'fault': sorted.sort((a, b) => b.faultProbability - a.faultProbability); break;
      case 'deviation':
        sorted.sort((a, b) => {
          const devA = a.baselineMs > 0 ? (a.latestExecutionTimeMs - a.baselineMs) / a.baselineMs : 0;
          const devB = b.baselineMs > 0 ? (b.latestExecutionTimeMs - b.baselineMs) / b.baselineMs : 0;
          return devB - devA;
        });
        break;
    }
    return sorted.slice(0, 10).map((risk) => {
      const recs = snapshot.records
        .filter((r) => r.cylinderUid === risk.cylinderUid)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .slice(-20);
      const sparkData = recs.map((r) => r.executionTimeMs);
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (sparkData.length >= 8) {
        const firstHalf = sparkData.slice(0, 8).reduce((s, v) => s + v, 0) / 8;
        const lastHalf = sparkData.slice(-8).reduce((s, v) => s + v, 0) / 8;
        if (lastHalf - firstHalf > 8) trend = 'up';
        else if (firstHalf - lastHalf > 8) trend = 'down';
      }
      if (risk.healthScore < 35) trend = 'up';
      const deviationPct = risk.baselineMs > 0 ? ((risk.latestExecutionTimeMs - risk.baselineMs) / risk.baselineMs) * 100 : 0;
      let barColor: string;
      if (risk.healthScore > 70) barColor = '#22c55e';
      else if (risk.healthScore > 50) barColor = '#eab308';
      else if (risk.healthScore > 35) barColor = '#f59e0b';
      else barColor = '#ef4444';
      return { ...risk, sparkData, trend, barColor, deviationPct: Math.max(0, deviationPct) };
    });
  }, [snapshot.topRisks, snapshot.records, sortKey]);

  const toggleSelect = useCallback((uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  }, []);

  // Renko-style bar chart with embedded info
  useEffect(() => {
    if (!chartRef.current || enriched.length === 0) return;
    const chart = echarts.init(chartRef.current);
    const names = enriched.map((r, i) => {
      const sel = selectedUids.has(r.cylinderUid) ? '☑ ' : '☐ ';
      const highlight = i === expandedIdx ? '▸ ' : '';
      return `${sel}${highlight}${r.name}`;
    });
    const scores = enriched.map((r) => r.healthScore);

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(8,20,40,0.95)',
        borderColor: '#1a3a5c',
        textStyle: { color: '#e0eaf5', fontSize: 11 },
        formatter: (params: any) => {
          const idx = params[0]?.dataIndex;
          if (idx === undefined) return '';
          const item = enriched[idx];
          if (!item) return '';
          const trendLabel = item.trend === 'up' ? '<span style="color:#ef4444">↑ 劣化中</span>' : item.trend === 'down' ? '<span style="color:#22c55e">↓ 恢复中</span>' : '<span style="color:#6b8ab5">→ 稳定</span>';
          return `
            <div style="font-size:12px;line-height:1.8">
              <b style="color:#e0eaf5;font-size:14px">${item.name}</b><br/>
              设备: ${item.deviceName} | 工位: ${item.stationId}<br/>
              健康评分: <b style="color:${item.barColor}">${item.healthScore}/100</b><br/>
              故障概率: <b style="color:#f59e0b">${item.faultProbability}%</b><br/>
              执行时间: <b>${item.latestExecutionTimeMs}ms</b> / 基线 ${item.baselineMs}ms<br/>
              偏离: <b>+${item.deviationPct.toFixed(1)}%</b><br/>
              趋势: ${trendLabel}
            </div>`;
        },
      },
      grid: { left: 8, right: 105, top: 8, bottom: 8 },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: { show: false },
        splitLine: { show: false },
        axisLine: { lineStyle: { color: 'rgba(59,130,246,0.1)' } },
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLabel: {
          color: '#8aa8d0',
          fontSize: 10,
          width: 95,
          overflow: 'truncate',
          fontFamily: 'JetBrains Mono, monospace',
        },
        axisLine: { show: false },
        axisTick: { show: false },
        triggerEvent: true,
      },
      series: [{
        type: 'bar',
        data: enriched.map((r, i) => ({
          value: r.healthScore,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: r.barColor },
              { offset: 1, color: r.barColor + '50' },
            ]),
            borderRadius: [0, 7, 7, 0],
            shadowBlur: expandedIdx === i ? 16 : 4,
            shadowColor: expandedIdx === i ? r.barColor + '80' : r.barColor + '20',
          },
        })),
        barWidth: 15,
        label: {
          show: true,
          position: 'right',
          distance: 8,
          formatter: (params: any) => {
            const item = enriched[params.dataIndex];
            const arrow = item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→';
            return `{health|${item.healthScore}}{sep|  }{arrow|${arrow}} {fp|${item.faultProbability}%}`;
          },
          rich: {
            health: { fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#e0eaf5' },
            sep: { fontSize: 8, color: '#6b8ab5' },
            arrow: { fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#ffac33' },
            fp: { fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: '#6b8ab5' },
          },
        },
        showBackground: true,
        backgroundStyle: {
          color: 'rgba(59,130,246,0.04)',
          borderRadius: [0, 7, 7, 0],
        },
      }],
      animationDuration: 600,
      animationEasing: 'cubicOut',
    });

    chart.on('click', (params: any) => {
      if (params.componentType === 'yAxis') {
        const idx = params.targetDataIndex ?? params.dataIndex;
        if (idx !== undefined && enriched[idx]) {
          if (expandedIdx === idx) {
            setExpandedIdx(null);
          } else {
            setExpandedIdx(idx);
            onSelect?.(enriched[idx].cylinderUid);
          }
        }
      } else if (params.componentType === 'series' && enriched[params.dataIndex]) {
        setExpandedIdx(params.dataIndex);
        onSelect?.(enriched[params.dataIndex].cylinderUid);
      }
    });

    chart.on('mouseover', (params: any) => {
      if (params.componentType === 'series') setHoveredIdx(params.dataIndex);
    });
    chart.on('mouseout', () => setHoveredIdx(null));

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      chart.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [enriched, expandedIdx, onSelect, selectedUids]);

  const expandedItem = expandedIdx !== null ? enriched[expandedIdx] : null;

  return (
    <div className="chart-card">
      <div className="chart-title">
        高风险气缸排行
        <div style={{ display: 'inline-flex', gap: 4, marginLeft: 12 }}>
          {[
            { key: 'health' as const, label: '健康' },
            { key: 'fault' as const, label: '概率' },
            { key: 'deviation' as const, label: '偏离' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={(e) => { e.stopPropagation(); setSortKey(opt.key); }}
              style={{
                fontSize: 9, padding: '2px 8px', borderRadius: 3,
                border: `1px solid ${sortKey === opt.key ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.1)'}`,
                background: sortKey === opt.key ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: sortKey === opt.key ? '#60a5fa' : '#6b8ab5',
                cursor: 'pointer', fontWeight: sortKey === opt.key ? 700 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <span className="corner-tl" />
      <span className="corner-tr" />
      <span className="corner-bl" />
      <span className="corner-br" />

      <div ref={chartRef} className="chart-container" style={{ height: expandedItem ? 180 : 280 }} />

      {/* Expanded detail card */}
      {expandedItem && (
        <div style={{
          marginTop: 4, padding: '10px 14px', borderRadius: 8,
          border: `1.5px solid ${expandedItem.barColor}40`,
          background: `${expandedItem.barColor}0a`,
          animation: 'fadeSlideIn 0.3s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#e0eaf5' }}>{expandedItem.name}</span>
              <span style={{ fontSize: 10, color: '#6b8ab5' }}>{expandedItem.deviceName} · {expandedItem.stationId}</span>
              <span style={{
                fontSize: 9, padding: '2px 8px', borderRadius: 10,
                background: expandedItem.alertLevel === 'critical' ? '#ef444420' : expandedItem.alertLevel === 'warning' ? '#f59e0b20' : '#3b82f620',
                color: expandedItem.barColor, fontWeight: 600,
              }}>
                {expandedItem.alertLevel === 'critical' ? '紧急' : expandedItem.alertLevel === 'warning' ? '预警' : expandedItem.alertLevel === 'info' ? '提示' : '正常'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => toggleSelect(expandedItem.cylinderUid)}
                style={{
                  fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                  border: `1px solid ${selectedUids.has(expandedItem.cylinderUid) ? '#22c55e' : 'rgba(59,130,246,0.2)'}`,
                  background: selectedUids.has(expandedItem.cylinderUid) ? '#22c55e15' : 'transparent',
                  color: selectedUids.has(expandedItem.cylinderUid) ? '#4ade80' : '#6b8ab5',
                }}
              >
                {selectedUids.has(expandedItem.cylinderUid) ? '✓ 已选中' : '选择对比'}
              </button>
              <button onClick={() => setExpandedIdx(null)}
                style={{
                  fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                  border: '1px solid rgba(59,130,246,0.2)', background: 'transparent', color: '#6b8ab5',
                }}>
                收起
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: '健康评分', value: `${expandedItem.healthScore}/100`, color: expandedItem.barColor },
              { label: '故障概率', value: `${expandedItem.faultProbability}%`, color: '#f59e0b' },
              { label: '执行时间', value: `${expandedItem.latestExecutionTimeMs}ms`, color: '#60a5fa' },
              { label: '基线偏离', value: `+${expandedItem.deviationPct.toFixed(1)}%`, color: expandedItem.deviationPct > 15 ? '#ef4444' : '#f59e0b' },
            ].map((m) => (
              <div key={m.label} style={{ textAlign: 'center', padding: '6px 4px', borderRadius: 6, background: 'rgba(15,35,65,0.5)', border: '1px solid rgba(59,130,246,0.08)' }}>
                <div style={{ fontSize: 9, color: '#6b8ab5' }}>{m.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: m.color, fontFamily: 'var(--font-data)' }}>{m.value}</div>
              </div>
            ))}
          </div>
          {/* Sparkline */}
          {expandedItem.sparkData.length >= 2 && (
            <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(8,20,40,0.5)', border: '1px solid rgba(59,130,246,0.08)' }}>
              <div style={{ fontSize: 9, color: '#6b8ab5', marginBottom: 4 }}>最近 20 次执行时间</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 40 }}>
                {expandedItem.sparkData.map((v, i) => {
                  const minV = Math.min(...expandedItem.sparkData);
                  const maxV = Math.max(...expandedItem.sparkData);
                  const range = maxV - minV || 1;
                  const h = Math.max(3, ((v - minV) / range) * 38 + 2);
                  const isLast = i >= expandedItem.sparkData.length - 4;
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${h}px`,
                        background: isLast && expandedItem.trend === 'up' ? expandedItem.barColor : `${expandedItem.barColor}60`,
                        borderRadius: 1,
                        transition: 'height 0.2s',
                      }}
                      title={`第${i + 1}次: ${v}ms`}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#506a90', marginTop: 2 }}>
                <span>最早</span>
                <span>趋势：{expandedItem.trend === 'up' ? '↑ 上升' : expandedItem.trend === 'down' ? '↓ 下降' : '→ 稳定'}</span>
                <span>最新</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected count */}
      {selectedUids.size > 0 && (
        <div style={{
          marginTop: 6, fontSize: 10, color: '#4ade80',
          padding: '4px 10px', borderRadius: 4, background: '#22c55e10',
          border: '1px solid #22c55e30',
        }}>
          已选择 {selectedUids.size} 个气缸用于对比 · <button onClick={() => setSelectedUids(new Set())} style={{ fontSize: 9, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>清空</button>
        </div>
      )}
    </div>
  );
}
