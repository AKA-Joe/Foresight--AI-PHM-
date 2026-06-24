import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import type { DashboardSnapshot } from '../../shared/types';

interface Props {
  snapshot: DashboardSnapshot;
  onSelect?: (uid: string) => void;
}

const LEVEL_CONFIG = {
  normal: { color: '#22c55e', label: '正常', glowColor: 'rgba(34,197,94,0.5)' },
  info: { color: '#3b82f6', label: '提示', glowColor: 'rgba(59,130,246,0.5)' },
  warning: { color: '#f59e0b', label: '预警', glowColor: 'rgba(245,158,11,0.5)' },
  critical: { color: '#ef4444', label: '紧急', glowColor: 'rgba(239,68,68,0.5)' },
} as const;

export default function EquipmentHeatmap({ snapshot, onSelect }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const matrixRef = useRef<HTMLDivElement>(null);
  const [activeQuadrant, setActiveQuadrant] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'scatter' | 'matrix'>('scatter');
  const [hoveredCylinder, setHoveredCylinder] = useState<string | null>(null);
  const pulseRef = useRef<number>(0);

  const scatterData = useMemo(() => {
    return snapshot.topRisks.map((risk) => {
      const latestRec = snapshot.records
        .filter((r) => r.cylinderUid === risk.cylinderUid)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      const deviationPct = risk.baselineMs > 0
        ? ((risk.latestExecutionTimeMs - risk.baselineMs) / risk.baselineMs) * 100
        : 0;
      const bubbleSize = Math.max(10, Math.sqrt(Math.max(0, deviationPct) * risk.faultProbability / 100) * 8 + 12);
      return {
        name: risk.name,
        deviceName: risk.deviceName,
        stationId: risk.stationId,
        cylinderUid: risk.cylinderUid,
        healthScore: risk.healthScore,
        faultProbability: risk.faultProbability,
        alertLevel: risk.alertLevel,
        latestExecutionTimeMs: risk.latestExecutionTimeMs,
        baselineMs: risk.baselineMs,
        deviationPct: Math.max(0, deviationPct),
        bubbleSize,
        quadrant: risk.healthScore >= 50
          ? (risk.faultProbability >= 50 ? '关注区' : '健康区')
          : (risk.faultProbability >= 50 ? '危险区' : '劣化区'),
      };
    });
  }, [snapshot.topRisks, snapshot.records]);

  const quadrantStats = useMemo(() => {
    const stats: Record<string, number> = { 健康区: 0, 关注区: 0, 劣化区: 0, 危险区: 0 };
    scatterData.forEach((d) => { stats[d.quadrant] = (stats[d.quadrant] || 0) + 1; });
    return stats;
  }, [scatterData]);

  // Pulse animation for critical items
  useEffect(() => {
    if (viewMode !== 'scatter') return;
    const timer = setInterval(() => {
      pulseRef.current = (pulseRef.current + 1) % 60;
    }, 50);
    return () => clearInterval(timer);
  }, [viewMode]);

  // --- Scatter chart ---
  useEffect(() => {
    if (!chartRef.current || scatterData.length === 0 || viewMode !== 'scatter') return;
    const chart = echarts.init(chartRef.current);

    const filtered = activeQuadrant
      ? scatterData.filter((d) => d.quadrant === activeQuadrant)
      : scatterData;

    chart.setOption({
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(8,20,40,0.95)',
        borderColor: '#1a3a5c',
        textStyle: { color: '#e0eaf5', fontSize: 11 },
        padding: [12, 16],
        formatter: (p: any) => {
          const d = scatterData[p.dataIndex];
          if (!d) return '';
          const cfg = LEVEL_CONFIG[d.alertLevel];
          return `<div style="font-size:12px;line-height:1.9">
            <b style="color:#e0eaf5;font-size:14px">${d.name}</b>
            <span style="color:${cfg.color};margin-left:8px;font-size:10px;border:1px solid ${cfg.color}40;border-radius:4px;padding:1px 6px">${cfg.label}</span><br/>
            设备: ${d.deviceName} | 工位: ${d.stationId}<br/>
            健康评分: <b style="color:${cfg.color}">${d.healthScore}/100</b> &nbsp; 故障概率: <b>${d.faultProbability}%</b><br/>
            执行偏离: <b>+${d.deviationPct.toFixed(1)}%</b> (${d.latestExecutionTimeMs}ms / ${d.baselineMs}ms)<br/>
            所属区域: <b>${d.quadrant}</b>
          </div>`;
        },
      },
      grid: { left: 55, right: 25, top: 16, bottom: 50 },
      xAxis: {
        type: 'value',
        name: '健康评分 →',
        nameLocation: 'center',
        nameGap: 30,
        nameTextStyle: { color: '#6b8ab5', fontSize: 10 },
        min: 0, max: 100,
        axisLabel: { color: '#506a90', fontSize: 9 },
        splitLine: { lineStyle: { color: 'rgba(59,130,246,0.06)' } },
        axisLine: { lineStyle: { color: 'rgba(59,130,246,0.15)' } },
      },
      yAxis: {
        type: 'value',
        name: '故障概率 %',
        nameTextStyle: { color: '#6b8ab5', fontSize: 10 },
        min: 0, max: 100,
        axisLabel: { color: '#506a90', fontSize: 9 },
        splitLine: { lineStyle: { color: 'rgba(59,130,246,0.06)' } },
        axisLine: { lineStyle: { color: 'rgba(59,130,246,0.15)' } },
      },
      series: [{
        type: 'scatter',
        data: filtered.map((d) => ({
          value: [d.healthScore, d.faultProbability],
          symbolSize: d.bubbleSize,
          itemStyle: {
            color: LEVEL_CONFIG[d.alertLevel].color,
            shadowBlur: d.alertLevel === 'critical' ? 20 : 8,
            shadowColor: LEVEL_CONFIG[d.alertLevel].glowColor,
            borderColor: 'rgba(4,13,26,0.8)',
            borderWidth: 2,
            opacity: 0.9,
          },
          emphasis: {
            scale: 1.5,
            itemStyle: { shadowBlur: 30, opacity: 1 },
            label: {
              show: true,
              formatter: '{b}',
              position: 'top',
              color: '#e0eaf5',
              fontSize: 12,
              fontWeight: 700,
              backgroundColor: 'rgba(8,20,40,0.8)',
              padding: [4, 8],
              borderRadius: 4,
            },
          },
        })),
        // Quadrant guide lines
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: 'rgba(59,130,246,0.12)', type: 'dashed', width: 1.5 },
          data: [
            {
              xAxis: 50,
              label: { formatter: '健康阈值 50', position: 'start', color: '#506a90', fontSize: 9 },
            },
            {
              yAxis: 50,
              label: { formatter: '风险阈值 50%', position: 'start', color: '#506a90', fontSize: 9 },
            },
          ],
        },
        label: {
          show: true,
          formatter: (p: any) => {
            const d = scatterData[p.dataIndex];
            if (!d || (d.alertLevel !== 'critical' && d.alertLevel !== 'warning')) return '';
            return d.name.length > 7 ? d.name.slice(0, 7) + '…' : d.name;
          },
          position: 'top',
          color: '#8aa8d0',
          fontSize: 9,
          offset: [0, 8],
        },
      }],
      animationDelay: (idx: number) => idx * 30,
    });

    chart.on('click', (params: any) => {
      const d = scatterData[params.dataIndex];
      if (d && onSelect) onSelect(d.cylinderUid);
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { chart.dispose(); window.removeEventListener('resize', handleResize); };
  }, [scatterData, onSelect, activeQuadrant, viewMode]);

  return (
    <div className="chart-card">
      <div className="chart-title">
        设备健康概览
        <div style={{ display: 'inline-flex', gap: 4, marginLeft: 12 }}>
          {([
            { mode: 'scatter' as const, label: '四象限' },
            { mode: 'matrix' as const, label: '矩阵' },
          ]).map((opt) => (
            <button
              key={opt.mode}
              onClick={(e) => { e.stopPropagation(); setViewMode(opt.mode); setActiveQuadrant(null); }}
              style={{
                fontSize: 9, padding: '2px 8px', borderRadius: 3,
                border: `1px solid ${viewMode === opt.mode ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.1)'}`,
                background: viewMode === opt.mode ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: viewMode === opt.mode ? '#60a5fa' : '#6b8ab5',
                cursor: 'pointer', fontWeight: viewMode === opt.mode ? 700 : 400,
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

      {/* Quadrant quick filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {[
          { key: '危险区', label: '危险区', color: '#ef4444', count: quadrantStats.危险区 },
          { key: '劣化区', label: '劣化区', color: '#f59e0b', count: quadrantStats.劣化区 },
          { key: '关注区', label: '关注区', color: '#3b82f6', count: quadrantStats.关注区 },
          { key: '健康区', label: '健康区', color: '#22c55e', count: quadrantStats.健康区 },
        ].map((q) => (
          <button
            key={q.key}
            onClick={(e) => {
              e.stopPropagation();
              setActiveQuadrant(activeQuadrant === q.key ? null : q.key);
            }}
            style={{
              flex: 1, padding: '5px 6px', borderRadius: 5, fontSize: 9, cursor: 'pointer',
              border: `1px solid ${activeQuadrant === q.key ? q.color : 'rgba(59,130,246,0.1)'}`,
              background: activeQuadrant === q.key ? `${q.color}15` : 'transparent',
              color: activeQuadrant === q.key ? q.color : '#6b8ab5',
              fontWeight: activeQuadrant === q.key ? 700 : 400,
              transition: 'all 0.2s',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span>{q.label}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-data)',
              color: q.count > 0 ? q.color : '#3a5a80',
            }}>
              {q.count}
            </span>
          </button>
        ))}
      </div>

      {/* Scatter mode */}
      {viewMode === 'scatter' && (
        <div ref={chartRef} style={{ width: '100%', height: 250 }} />
      )}

      {/* Matrix mode */}
      {viewMode === 'matrix' && (
        <div ref={matrixRef} style={{
          padding: '4px 4px 12px',
          maxHeight: 250,
          overflowY: 'auto',
        }}>
          {/* Grid header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '32px 50px 1fr 1fr 1fr 1fr', gap: 4,
            padding: '2px 0', marginBottom: 2, borderBottom: '1px solid rgba(59,130,246,0.08)',
          }}>
            {['#', '等级', '气缸', '健康', '故障%', '偏离%'].map((h) => (
              <div key={h} style={{ fontSize: 9, color: '#506a90', fontWeight: 600 }}>{h}</div>
            ))}
          </div>
          {/* Rows */}
          {scatterData.map((d, idx) => {
            const cfg = LEVEL_CONFIG[d.alertLevel];
            return (
              <div
                key={d.cylinderUid}
                onClick={() => onSelect?.(d.cylinderUid)}
                onMouseEnter={() => setHoveredCylinder(d.cylinderUid)}
                onMouseLeave={() => setHoveredCylinder(null)}
                style={{
                  display: 'grid', gridTemplateColumns: '32px 50px 1fr 1fr 1fr 1fr', gap: 4,
                  padding: '7px 4px', borderRadius: 4, cursor: 'pointer',
                  background: hoveredCylinder === d.cylinderUid ? 'rgba(59,130,246,0.08)' : 'transparent',
                  borderBottom: '1px solid rgba(59,130,246,0.04)',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: 10, color: '#506a90', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
                  {idx + 1}
                </span>
                <span style={{
                  fontSize: 9, padding: '1px 5px', borderRadius: 8, textAlign: 'center',
                  background: `${cfg.color}20`, color: cfg.color, fontWeight: 600,
                  border: `1px solid ${cfg.color}30`,
                }}>
                  {cfg.label}
                </span>
                <span style={{ fontSize: 10, color: '#e0eaf5', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={`${d.name} | ${d.deviceName} | ${d.stationId}`}>
                  {d.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(59,130,246,0.1)', overflow: 'hidden' }}>
                    <div style={{ width: `${d.healthScore}%`, height: '100%', borderRadius: 2, background: cfg.color, transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize: 9, color: cfg.color, fontWeight: 700, fontFamily: 'var(--font-mono)', minWidth: 24, textAlign: 'right' }}>
                    {d.healthScore}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(245,158,11,0.1)', overflow: 'hidden' }}>
                    <div style={{ width: `${d.faultProbability}%`, height: '100%', borderRadius: 2, background: '#f59e0b', transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700, fontFamily: 'var(--font-mono)', minWidth: 24, textAlign: 'right' }}>
                    {d.faultProbability}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    color: d.deviationPct > 20 ? '#ef4444' : d.deviationPct > 10 ? '#f59e0b' : '#22c55e',
                  }}>
                    +{d.deviationPct.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: 9, color: d.deviationPct > 15 ? '#ef4444' : '#22c55e' }}>
                    {d.deviationPct > 15 ? '↑' : d.deviationPct > 5 ? '→' : '↓'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend ribbon */}
      <div style={{
        marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 10px', borderRadius: 6, background: 'rgba(15,35,65,0.4)',
        border: '1px solid rgba(59,130,246,0.08)',
      }}>
        <div style={{ display: 'flex', gap: 14 }}>
          {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => (
            <span key={key} style={{ fontSize: 9, color: '#6b8ab5', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 6px ${cfg.glowColor}` }} />
              {cfg.label}
            </span>
          ))}
        </div>
        <span style={{ fontSize: 9, color: '#506a90' }}>
          气泡大小 = 执行偏离 | 点击筛选象限 | 悬停查看详情
        </span>
      </div>
    </div>
  );
}
