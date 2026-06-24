import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import type { DashboardSnapshot } from '../../shared/types';

interface Props {
  snapshot: DashboardSnapshot;
  onSelectLevel?: (level: 'info' | 'warning' | 'critical' | null) => void;
  onSelectStation?: (stationId: string | null) => void;
}

export default function AlertDistributionChart({ snapshot, onSelectLevel, onSelectStation }: Props) {
  const donutRef = useRef<HTMLDivElement>(null);
  const matrixRef = useRef<HTMLDivElement>(null);
  const trendRef = useRef<HTMLDivElement>(null);
  const [activeLevel, setActiveLevel] = useState<'info' | 'warning' | 'critical' | null>(null);
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);

  const { info, warning, critical, total, stationMap, trend24h } = useMemo(() => {
    const info = snapshot.kpis.infoAlerts;
    const warning = snapshot.kpis.warningAlerts;
    const critical = snapshot.kpis.criticalAlerts;
    const total = info + warning + critical;

    // 15 stations x 3 levels matrix
    const map = new Map<string, { info: number; warning: number; critical: number; total: number }>();
    for (let i = 1; i <= 15; i++) {
      map.set(`ST-${String(i).padStart(2, '0')}`, { info: 0, warning: 0, critical: 0, total: 0 });
    }
    for (const a of snapshot.alerts) {
      const cyl = snapshot.cylinders.find((c) => c.uid === a.cylinderUid);
      if (!cyl) continue;
      const entry = map.get(cyl.stationId);
      if (!entry) continue;
      if (a.level === 'info') entry.info++;
      else if (a.level === 'warning') entry.warning++;
      else if (a.level === 'critical') entry.critical++;
      entry.total++;
    }

    // 24h trend — generate realistic synthetic data with daily patterns
    const now = new Date();
    const currentHour = now.getHours();
    const trend24h = Array.from({ length: 24 }, (_, i) => {
      // Shift: hour 0 = 24h ago, hour 23 = now
      const h = (currentHour - 23 + i + 24) % 24;
      // Daily pattern: peak at 10am and 3pm, trough at 3am
      const hourFactor = Math.sin((h - 6) * Math.PI / 12) * 0.5 + 0.7;
      // Random walk with mean reversion
      const baseInfo = 3 + Math.floor(hourFactor * 3 + Math.random() * 2);
      const baseWarning = 1 + Math.floor(hourFactor * 1.8 + Math.random() * 1.5);
      const baseCritical = Math.floor(hourFactor * 0.6 + (Math.random() > 0.85 ? 1 : 0));
      return {
        info: Math.max(0, baseInfo),
        warning: Math.max(0, baseWarning),
        critical: Math.max(0, baseCritical),
      };
    });

    // Smooth with moving average to avoid jagged lines
    const smoothed = trend24h.map((_, i) => {
      const window = trend24h.slice(Math.max(0, i - 1), Math.min(24, i + 2));
      const len = window.length;
      return {
        info: Math.round(window.reduce((s, b) => s + b.info, 0) / len * 10) / 10,
        warning: Math.round(window.reduce((s, b) => s + b.warning, 0) / len * 10) / 10,
        critical: Math.round(window.reduce((s, b) => s + b.critical, 0) / len * 10) / 10,
      };
    });

    return { info, warning, critical, total, stationMap: map, trend24h: smoothed };
  }, [snapshot]);

  // 环比计算（模拟）
  const momInfo = -2;
  const momWarning = +1;
  const momCritical = 0;

  const handleLevelClick = useCallback((level: 'info' | 'warning' | 'critical') => {
    const next = activeLevel === level ? null : level;
    setActiveLevel(next);
    onSelectLevel?.(next);
  }, [activeLevel, onSelectLevel]);

  const handleStationClick = useCallback((stationId: string) => {
    const next = activeStation === stationId ? null : stationId;
    setActiveStation(next);
    onSelectStation?.(next);
  }, [activeStation, onSelectStation]);

  // --- Donut chart ---
  useEffect(() => {
    if (!donutRef.current) return;
    const chart = echarts.init(donutRef.current);
    chart.setOption({
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(8,20,40,0.95)',
        borderColor: '#1a3a5c',
        textStyle: { color: '#e0eaf5', fontSize: 12 },
        formatter: (p: any) => `<b>${p.name}</b><br/>数量: ${p.value} 条<br/>占比: ${p.percent}%`,
      },
      series: [{
        type: 'pie',
        radius: ['50%', '78%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        padAngle: 3,
        itemStyle: {
          borderRadius: 6,
          borderColor: 'rgba(4,13,26,0.9)',
          borderWidth: 2,
        },
        emphasis: {
          scale: true,
          scaleSize: 10,
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
          itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.5)' },
        },
        label: { show: false },
        data: [
          {
            value: info,
            name: '提示',
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#60a5fa' },
                { offset: 1, color: '#3b82f6' },
              ]),
              shadowBlur: 15,
              shadowColor: 'rgba(59,130,246,0.4)',
            },
          },
          {
            value: warning,
            name: '预警',
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#fbbf24' },
                { offset: 1, color: '#f59e0b' },
              ]),
              shadowBlur: 15,
              shadowColor: 'rgba(245,158,11,0.4)',
            },
          },
          {
            value: critical,
            name: '紧急',
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#f87171' },
                { offset: 1, color: '#ef4444' },
              ]),
              shadowBlur: 15,
              shadowColor: 'rgba(239,68,68,0.4)',
            },
          },
        ],
      }],
      graphic: total === 0 ? undefined : [
        {
          type: 'text',
          left: 'center',
          top: '42%',
          style: {
            text: `${total}`,
            fill: '#e0eaf5',
            fontSize: 32,
            fontWeight: 800,
            fontFamily: 'Orbitron, JetBrains Mono, monospace',
            textAlign: 'center',
          },
        },
        {
          type: 'text',
          left: 'center',
          top: '58%',
          style: {
            text: '告警总数',
            fill: '#6b8ab5',
            fontSize: 11,
            textAlign: 'center',
          },
        },
      ],
    });
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { chart.dispose(); window.removeEventListener('resize', handleResize); };
  }, [info, warning, critical, total]);

  // --- 24h trend with realistic synthetic data ---
  useEffect(() => {
    if (!trendRef.current) return;
    const chart = echarts.init(trendRef.current);
    const hours = Array.from({ length: 24 }, (_, i) => {
      const d = new Date(Date.now() - (23 - i) * 3600_000);
      return `${d.getHours().toString().padStart(2, '0')}:00`;
    });
    chart.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(8,20,40,0.95)',
        borderColor: '#1a3a5c',
        textStyle: { color: '#e0eaf5', fontSize: 11 },
        axisPointer: { type: 'cross', crossStyle: { color: 'rgba(59,130,246,0.3)' } },
      },
      grid: { left: 8, right: 12, top: 8, bottom: 22 },
      xAxis: {
        type: 'category',
        data: hours,
        axisLabel: { color: '#506a90', fontSize: 8, interval: 3 },
        axisLine: { lineStyle: { color: 'rgba(59,130,246,0.15)' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#506a90', fontSize: 8 },
        splitLine: { lineStyle: { color: 'rgba(59,130,246,0.06)' } },
        axisLine: { show: false },
      },
      series: [
        {
          type: 'line', name: '提示', data: trend24h.map((b) => b.info),
          smooth: 0.4, symbol: 'none', lineStyle: { color: '#3b82f6', width: 2.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59,130,246,0.25)' },
              { offset: 1, color: 'rgba(59,130,246,0)' },
            ]),
          },
        },
        {
          type: 'line', name: '预警', data: trend24h.map((b) => b.warning),
          smooth: 0.4, symbol: 'none', lineStyle: { color: '#f59e0b', width: 2.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(245,158,11,0.2)' },
              { offset: 1, color: 'rgba(245,158,11,0)' },
            ]),
          },
        },
        {
          type: 'line', name: '紧急', data: trend24h.map((b) => b.critical),
          smooth: 0.4, symbol: 'none', lineStyle: { color: '#ef4444', width: 2.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(239,68,68,0.2)' },
              { offset: 1, color: 'rgba(239,68,68,0)' },
            ]),
          },
        },
      ],
    });
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { chart.dispose(); window.removeEventListener('resize', handleResize); };
  }, [trend24h]);

  const stationArray = useMemo(() => {
    return Array.from(stationMap.entries()).map(([stationId, counts]) => ({
      stationId,
      ...counts,
    }));
  }, [stationMap]);

  const getLevelColor = (level: 'info' | 'warning' | 'critical') => {
    if (level === 'critical') return '#ef4444';
    if (level === 'warning') return '#f59e0b';
    return '#3b82f6';
  };

  const getLevelOpacity = (stationId: string, level: 'info' | 'warning' | 'critical', count: number) => {
    if (activeStation && activeStation !== stationId) return 0.15;
    if (activeLevel && activeLevel !== level) return 0.15;
    if (count === 0) return 0.08;
    return Math.min(1, 0.25 + count * 0.15);
  };

  return (
    <div className="chart-card wide">
      <div className="chart-title">
        告警等级分布
        {(activeLevel || activeStation) && (
          <button
            onClick={() => { setActiveLevel(null); setActiveStation(null); onSelectLevel?.(null); onSelectStation?.(null); }}
            style={{ marginLeft: 8, fontSize: 10, padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', cursor: 'pointer' }}
          >
            清除筛选
          </button>
        )}
      </div>
      <span className="corner-tl" />
      <span className="corner-tr" />
      <span className="corner-bl" />
      <span className="corner-br" />

      {/* Top KPI row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        {[
          { key: 'info' as const, label: '提示告警', value: info, color: '#3b82f6', mom: momInfo },
          { key: 'warning' as const, label: '预警告警', value: warning, color: '#f59e0b', mom: momWarning },
          { key: 'critical' as const, label: '紧急告警', value: critical, color: '#ef4444', mom: momCritical },
        ].map((item) => (
          <div
            key={item.key}
            onClick={() => handleLevelClick(item.key)}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 8,
              border: `1.5px solid ${activeLevel === item.key ? item.color : 'rgba(59,130,246,0.15)'}`,
              background: activeLevel === item.key ? `${item.color}10` : 'rgba(15,35,65,0.4)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {activeLevel === item.key && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: item.color, boxShadow: `0 0 8px ${item.color}60`,
              }} />
            )}
            <div style={{ fontSize: 10, color: '#6b8ab5', marginBottom: 4 }}>{item.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: item.color, fontFamily: 'var(--font-data)' }}>
                {item.value}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: item.mom > 0 ? '#f59e0b' : item.mom < 0 ? '#22c55e' : '#6b8ab5',
              }}>
                {item.mom > 0 ? '↑' : item.mom < 0 ? '↓' : '→'} {Math.abs(item.mom)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Middle: donut + station matrix */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
        {/* Donut */}
        <div style={{ flex: '0 0 38%', position: 'relative' }}>
          <div ref={donutRef} style={{ width: '100%', height: 200 }} />
          {/* Legend pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: -8 }}>
            {[
              { label: '提示', value: info, color: '#3b82f6' },
              { label: '预警', value: warning, color: '#f59e0b' },
              { label: '紧急', value: critical, color: '#ef4444' },
            ].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#8aa8d0' }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: l.color }} />
                {l.label} {l.value}
              </div>
            ))}
          </div>
        </div>

        {/* Station matrix */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, color: '#6b8ab5', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>工站告警热力矩阵（15工站 × 3等级）</span>
            <span style={{ fontSize: 9 }}>点击方块筛选</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Header */}
            <div style={{ display: 'flex', gap: 3, paddingLeft: 36 }}>
              {['提示', '预警', '紧急'].map((h, i) => (
                <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: ['#3b82f6', '#f59e0b', '#ef4444'][i] }}>{h}</div>
              ))}
            </div>
            {/* Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 170, overflowY: 'auto' }}>
              {stationArray.map((s) => (
                <div key={s.stationId} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: 32, fontSize: 9, color: activeStation === s.stationId ? '#e0eaf5' : '#6b8ab5', fontWeight: activeStation === s.stationId ? 700 : 400, textAlign: 'right' }}>
                    {s.stationId}
                  </div>
                  {(['info', 'warning', 'critical'] as const).map((level) => {
                    const count = s[level];
                    const opacity = getLevelOpacity(s.stationId, level, count);
                    const color = getLevelColor(level);
                    return (
                      <div
                        key={level}
                        onClick={() => handleStationClick(s.stationId)}
                        onMouseEnter={() => setHoveredStation(`${s.stationId}-${level}`)}
                        onMouseLeave={() => setHoveredStation(null)}
                        style={{
                          flex: 1,
                          height: 18,
                          borderRadius: 3,
                          background: count > 0 ? color : 'rgba(59,130,246,0.06)',
                          opacity,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: count > 0 ? 9 : 0,
                          fontWeight: 700,
                          color: '#fff',
                          boxShadow: hoveredStation === `${s.stationId}-${level}` && count > 0 ? `0 0 6px ${color}60` : 'none',
                          transform: hoveredStation === `${s.stationId}-${level}` ? 'scale(1.05)' : 'scale(1)',
                        }}
                        title={`${s.stationId} ${level === 'info' ? '提示' : level === 'warning' ? '预警' : '紧急'}: ${count}条`}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: 24h trend */}
      <div style={{ borderTop: '1px solid rgba(59,130,246,0.08)', paddingTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: '#506a90', fontWeight: 600 }}>24H 告警趋势</span>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { name: '提示', color: '#3b82f6' },
              { name: '预警', color: '#f59e0b' },
              { name: '紧急', color: '#ef4444' },
            ].map((l) => (
              <span key={l.name} style={{ fontSize: 9, color: '#6b8ab5', display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 8, height: 2, borderRadius: 1, background: l.color }} />
                {l.name}
              </span>
            ))}
          </div>
        </div>
        <div ref={trendRef} style={{ width: '100%', height: 90 }} />
      </div>
    </div>
  );
}
