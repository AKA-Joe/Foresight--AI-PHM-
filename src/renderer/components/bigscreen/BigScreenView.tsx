import { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import 'echarts-gl';
import { useMockRealtimeData } from './useMockRealtimeData';

interface Props {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export default function BigScreenView({ isFullscreen, onToggleFullscreen }: Props) {
  const [viewMode, setViewMode] = useState<'global' | 'region' | 'device'>('global');
  const { traffic, alerts, health, stats } = useMockRealtimeData();

  return (
    <div className={`bigscreen-view ${isFullscreen ? 'bigscreen-fullscreen' : ''}`}>
      <ParticleBackground />
      <div className="bigscreen-header">
        <h2 className="bigscreen-title">5G+AI 设备数字孪生态势感知</h2>
        <div className="bigscreen-tabs">
          {(['global', 'region', 'device'] as const).map((mode) => (
            <button
              key={mode}
              className={`bs-tab ${viewMode === mode ? 'active' : ''}`}
              onClick={() => setViewMode(mode)}
            >
              {mode === 'global' ? '全局拓扑' : mode === 'region' ? '区域对比' : '设备散点'}
            </button>
          ))}
        </div>
        <div className="bigscreen-live">
          <span className="live-dot" />
          <span>实时数据流</span>
        </div>
      </div>

      <div className="bigscreen-grid">
        <div className="bs-left-col">
          <TrafficPanel data={traffic} />
          <StatsCards stats={stats} />
        </div>
        <div className="bs-center">
          <Globe3D viewMode={viewMode} />
        </div>
        <div className="bs-right-col">
          <AssetHealthPanel health={health} />
          <AlertEventsPanel alerts={alerts} />
        </div>
      </div>
    </div>
  );
}

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.15,
        size: 1 + Math.random(),
        alpha: 0.3 + Math.random() * 0.3,
      });
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.parentElement?.addEventListener('mousemove', onMouseMove);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const parallax = Math.min(dist * 0.02, 8);
        const drawX = p.x + (dx / (dist || 1)) * parallax * 0.3;
        const drawY = p.y + (dy / (dist || 1)) * parallax * 0.3;

        ctx.beginPath();
        ctx.arc(drawX, drawY, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${p.alpha})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvas.parentElement?.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="bs-particles" />;
}

function TrafficPanel({ data }: { data: number[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    instanceRef.current = chart;
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, []);

  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart) return;
    const max = Math.max(...data);
    const avg = Math.round(data.reduce((a, b) => a + b, 0) / data.length);
    chart.setOption({
      grid: { top: 20, right: 12, bottom: 24, left: 42 },
      xAxis: {
        type: 'category',
        data: data.map((_, i) => `${i}s`),
        axisLine: { lineStyle: { color: '#0f2847' } },
        axisLabel: { color: '#6b8ab5', fontSize: 10 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(15,40,71,0.3)' } },
        axisLabel: { color: '#6b8ab5', fontSize: 10 },
      },
      series: [{
        type: 'line',
        data,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#3b82f6', width: 2.5, shadowBlur: 6, shadowColor: 'rgba(59,130,246,0.4)' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59,130,246,0.35)' },
            { offset: 0.7, color: 'rgba(59,130,246,0.08)' },
            { offset: 1, color: 'rgba(59,130,246,0)' },
          ]),
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#f59e0b', type: 'dashed', width: 1 },
          data: [{ yAxis: avg, label: { show: true, color: '#f59e0b', fontSize: 9, formatter: `avg ${avg}` } }],
        },
        markPoint: {
          data: [{ type: 'max', symbolSize: 32, label: { color: '#fff', fontSize: 9 }, itemStyle: { color: '#3b82f6' } }],
        },
      }],
    });
  }, [data]);

  return (
    <div className="glass-panel bs-panel bs-traffic-panel">
      <div className="bs-panel-title">实时数据流量</div>
      <div className="bs-traffic-summary">
        <span className="bs-traffic-value">{data[data.length - 1] || 0}<span className="bs-traffic-unit">Mbps</span></span>
        <span className="bs-traffic-peak">峰值 {Math.max(...data)}</span>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: 130 }} />
    </div>
  );
}

const STAT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];
const STAT_TRENDS = [2.3, 0, 5.1, -1.2];

function StatsCards({ stats }: { stats: { label: string; value: number; unit: string }[] }) {
  return (
    <div className="bs-stats-grid">
      {stats.map((s, i) => (
        <div key={s.label} className="glass-panel bs-stat-card" style={{ borderLeftColor: STAT_COLORS[i] }}>
          <div className="bs-stat-header">
            <span className="bs-stat-label">{s.label}</span>
            {STAT_TRENDS[i] !== 0 && (
              <span className={`bs-stat-trend ${STAT_TRENDS[i] > 0 ? 'up' : 'down'}`}>
                {STAT_TRENDS[i] > 0 ? '▲' : '▼'}{Math.abs(STAT_TRENDS[i])}%
              </span>
            )}
          </div>
          <div className="bs-stat-value" key={`${s.label}-${s.value}`}>
            {s.value}<span className="bs-stat-unit">{s.unit}</span>
          </div>
          <div className="bs-stat-bar" style={{ width: `${Math.min(s.value, 100)}%`, background: STAT_COLORS[i] }} />
        </div>
      ))}
    </div>
  );
}

const HUD_LABELS: Record<string, string> = {
  global: 'VIEW: GLOBAL TOPOLOGY',
  region: 'VIEW: REGION COMPARE',
  device: 'VIEW: DEVICE SCATTER',
};

function Globe3D({ viewMode }: { viewMode: 'global' | 'region' | 'device' }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [error, setError] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);

  const initChart = useCallback(() => {
    if (!chartRef.current) return;
    const { clientWidth, clientHeight } = chartRef.current;
    if (clientWidth === 0 || clientHeight === 0) {
      setTimeout(initChart, 100);
      return;
    }
    try {
      if (instanceRef.current) {
        instanceRef.current.dispose();
      }
      const chart = echarts.init(chartRef.current);
      instanceRef.current = chart;
      applyOption(chart, viewMode);
    } catch (e) {
      console.error('Globe3D init failed:', e);
      setError(true);
    }
  }, [viewMode]);

  useEffect(() => {
    setHudVisible(false);
    const t = setTimeout(() => setHudVisible(true), 100);
    initChart();
    const onResize = () => instanceRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, [initChart]);

  if (error) {
    return (
      <div className="glass-panel bs-globe-panel bs-globe-fallback">
        <div className="bs-fallback-text">3D 渲染不可用，请检查 WebGL 支持</div>
      </div>
    );
  }

  return (
    <div className="glass-panel bs-globe-panel">
      <div ref={chartRef} className="bs-globe-chart" />
      <span
        className="bs-globe-hud-label"
        style={{ opacity: hudVisible ? 1 : 0 }}
      >
        {HUD_LABELS[viewMode]}
      </span>
    </div>
  );
}

function applyOption(chart: echarts.ECharts, viewMode: string) {
  try {
    if (viewMode === 'global') {
      chart.setOption(getNetworkTopologyOption(), true);
    } else if (viewMode === 'region') {
      chart.setOption(getBar3DOption(), true);
    } else {
      chart.setOption(getScatter3DOption(), true);
    }
  } catch (e) {
    console.error('Globe3D setOption failed:', e);
  }
}

function getNetworkTopologyOption(): any {
  const LINE_COLORS: Record<string, string> = {
    'LINE-A': '#3b82f6',
    'LINE-B': '#8b5cf6',
    'LINE-C': '#10b981',
    'LINE-D': '#f59e0b',
  };

  const LINES = [
    { id: 'LINE-A', name: '装配一线', y: 80 },
    { id: 'LINE-B', name: '压装二线', y: 200 },
    { id: 'LINE-C', name: '检测封装线', y: 320 },
    { id: 'LINE-D', name: '上料单元', y: 440 },
  ];

  const STATIONS = [
    { id: 'ST-01', name: '夹爪专机', line: 'LINE-A', x: 250 },
    { id: 'ST-02', name: '推送工位', line: 'LINE-A', x: 450 },
    { id: 'ST-03', name: '压装机构', line: 'LINE-B', x: 350 },
    { id: 'ST-04', name: '检测转台', line: 'LINE-C', x: 250 },
    { id: 'ST-05', name: '封装测试', line: 'LINE-C', x: 450 },
    { id: 'ST-06', name: '上料单元', line: 'LINE-D', x: 350 },
  ];

  const CYLINDERS = [
    { id: 'CYL-A01', name: '夹爪缩回', station: 'ST-01', health: 68, alert: 'warning' },
    { id: 'CYL-A02', name: '推送伸出', station: 'ST-02', health: 93, alert: 'normal' },
    { id: 'CYL-B01', name: '升降复位', station: 'ST-03', health: 41, alert: 'critical' },
    { id: 'CYL-C01', name: '旋转到位', station: 'ST-04', health: 76, alert: 'normal' },
    { id: 'CYL-C02', name: '封口压紧', station: 'ST-05', health: 89, alert: 'normal' },
    { id: 'CYL-D01', name: '上料推出', station: 'ST-06', health: 82, alert: 'normal' },
  ];

  function healthColor(score: number): string {
    if (score > 70) return '#22c55e';
    if (score > 40) return '#f59e0b';
    return '#ef4444';
  }

  const categories = LINES.map((l) => ({ name: l.name, itemStyle: { color: LINE_COLORS[l.id] } }));

  const nodes: any[] = [];
  const links: any[] = [];

  LINES.forEach((line, lineIdx) => {
    nodes.push({
      id: line.id,
      name: line.name,
      x: 80,
      y: line.y,
      symbolSize: [60, 24],
      symbol: 'roundRect',
      category: lineIdx,
      itemStyle: { color: LINE_COLORS[line.id], borderColor: LINE_COLORS[line.id], borderWidth: 2, opacity: 0.9 },
      label: { show: true, color: '#eef5ff', fontSize: 11, fontWeight: 'bold' },
    });
  });

  STATIONS.forEach((station) => {
    const line = LINES.find((l) => l.id === station.line)!;
    const lineIdx = LINES.indexOf(line);
    nodes.push({
      id: station.id,
      name: station.name,
      x: station.x,
      y: line.y,
      symbolSize: 30,
      category: lineIdx,
      itemStyle: { color: LINE_COLORS[station.line], opacity: 0.85, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1 },
      label: { show: true, position: 'bottom', color: '#c0d4e8', fontSize: 10, distance: 8 },
    });
    links.push({
      source: station.line,
      target: station.id,
      lineStyle: { color: LINE_COLORS[station.line], width: 2, opacity: 0.5, type: 'dashed' },
    });
  });

  const lineStations: Record<string, string[]> = {};
  STATIONS.forEach((s) => {
    if (!lineStations[s.line]) lineStations[s.line] = [];
    lineStations[s.line].push(s.id);
  });
  Object.values(lineStations).forEach((stationIds) => {
    for (let i = 0; i < stationIds.length - 1; i++) {
      const srcLine = STATIONS.find((s) => s.id === stationIds[i])!.line;
      links.push({
        source: stationIds[i],
        target: stationIds[i + 1],
        lineStyle: { color: LINE_COLORS[srcLine], width: 3, type: 'solid', opacity: 0.8 },
        symbol: ['none', 'arrow'],
        symbolSize: [0, 12],
      });
    }
  });

  LINES.forEach((lineA, i) => {
    if (i < LINES.length - 1) {
      const lineB = LINES[i + 1];
      const stationsA = STATIONS.filter((s) => s.line === lineA.id);
      const stationsB = STATIONS.filter((s) => s.line === lineB.id);
      if (stationsA.length > 0 && stationsB.length > 0) {
        links.push({
          source: stationsA[stationsA.length - 1].id,
          target: stationsB[0].id,
          lineStyle: { color: '#1e4a6f', width: 1.5, type: 'dotted', opacity: 0.4, curveness: 0.3 },
          symbol: ['none', 'arrow'],
          symbolSize: [0, 8],
        });
      }
    }
  });

  CYLINDERS.forEach((cyl) => {
    const station = STATIONS.find((s) => s.id === cyl.station)!;
    const line = LINES.find((l) => l.id === station.line)!;
    const lineIdx = LINES.indexOf(line);
    const color = healthColor(cyl.health);
    const isCritical = cyl.alert === 'critical';

    nodes.push({
      id: cyl.id,
      name: `${cyl.name} [${cyl.health}%]`,
      x: station.x + 50,
      y: line.y + 50,
      symbolSize: isCritical ? 18 : 14,
      symbol: 'diamond',
      category: lineIdx,
      itemStyle: {
        color,
        shadowBlur: isCritical ? 20 : 0,
        shadowColor: isCritical ? 'rgba(239,68,68,0.9)' : undefined,
        borderColor: isCritical ? '#ef4444' : 'rgba(255,255,255,0.1)',
        borderWidth: isCritical ? 2 : 1,
      },
      label: { show: true, position: 'right', color: '#6b8ab5', fontSize: 9, distance: 4 },
    });
    links.push({
      source: cyl.station,
      target: cyl.id,
      lineStyle: { color: '#0f2847', width: 1, type: 'dashed', opacity: 0.4 },
    });
  });

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(10,25,47,0.95)',
      borderColor: '#0f2847',
      textStyle: { color: '#eef5ff', fontSize: 11 },
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const cyl = CYLINDERS.find((c) => c.id === params.data.id);
          if (cyl) return `<b>${cyl.name}</b><br/>健康度: ${cyl.health}%<br/>状态: ${cyl.alert === 'critical' ? '⚠ 告警' : cyl.alert === 'warning' ? '预警' : '正常'}`;
          return `<b>${params.name}</b>`;
        }
        return '';
      },
    },
    legend: {
      data: categories.map((c) => c.name),
      top: 5,
      right: 10,
      textStyle: { color: '#6b8ab5', fontSize: 10 },
      itemWidth: 12,
      itemHeight: 12,
    },
    animationDuration: 1200,
    animationEasingUpdate: 'quinticInOut',
    series: [
      {
        type: 'graph',
        layout: 'none',
        roam: true,
        categories,
        data: nodes,
        links,
        left: 0,
        right: 0,
        top: 30,
        bottom: 10,
        lineStyle: { curveness: 0.05 },
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: [0, 8],
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 4 },
          itemStyle: { shadowBlur: 15, shadowColor: 'rgba(59,130,246,0.5)' },
        },
      },
    ],
  };
}

function getBar3DOption(): any {
  const regions = ['华东', '华南', '华北', '西南', '西北', '中部'];
  const healthData = [85, 72, 91, 63, 78, 88];
  const availData = [92, 88, 95, 78, 85, 91];
  const faultData = [12, 25, 8, 35, 18, 15];
  const mtbfData = [320, 180, 410, 120, 260, 380];
  const avgHealth = Math.round(healthData.reduce((a, b) => a + b, 0) / healthData.length);

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(10,25,47,0.95)',
      borderColor: '#0f2847',
      textStyle: { color: '#eef5ff', fontSize: 12 },
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(59,130,246,0.05)' } },
      formatter: (params: any) => {
        let tip = `<b style="color:#3b82f6">${params[0].axisValue}</b><br/>`;
        params.forEach((p: any) => {
          const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:4px;"></span>`;
          tip += `${dot}${p.seriesName}: <b>${p.value}</b>${p.seriesName === 'MTBF' ? ' h' : '%'}<br/>`;
        });
        return tip;
      },
    },
    legend: {
      data: ['健康度', '稼动率', '故障率', 'MTBF'],
      top: 8,
      right: 16,
      textStyle: { color: '#6b8ab5', fontSize: 11 },
      itemWidth: 14,
      itemHeight: 8,
    },
    grid: { top: 55, right: 60, bottom: 36, left: 55 },
    xAxis: {
      type: 'category',
      data: regions,
      axisLine: { lineStyle: { color: '#0f2847' } },
      axisLabel: { color: '#c0d4e8', fontSize: 12, fontWeight: 'bold' },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '健康/稼动 %',
        min: 0,
        max: 100,
        nameTextStyle: { color: '#6b8ab5', fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { color: '#6b8ab5', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(15,40,71,0.3)' } },
      },
      {
        type: 'value',
        name: '故障/MTBF',
        min: 0,
        max: 500,
        nameTextStyle: { color: '#6b8ab5', fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { color: '#6b8ab5', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '健康度',
        type: 'bar',
        barWidth: '18%',
        data: healthData,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#3b82f6' },
            { offset: 0.6, color: 'rgba(59,130,246,0.5)' },
            { offset: 1, color: 'rgba(59,130,246,0.1)' },
          ]),
        },
        emphasis: { itemStyle: { shadowBlur: 16, shadowColor: 'rgba(59,130,246,0.5)' } },
        label: {
          show: true,
          position: 'top',
          color: '#3b82f6',
          fontSize: 10,
          fontWeight: 'bold',
          formatter: '{c}%',
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#22c55e', type: 'dashed', width: 1, opacity: 0.6 },
          data: [{ yAxis: avgHealth, label: { show: true, position: 'insideEndTop', color: '#22c55e', fontSize: 9, formatter: `均值 ${avgHealth}%` } }],
        },
      },
      {
        name: '稼动率',
        type: 'bar',
        barWidth: '18%',
        data: availData,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#8b5cf6' },
            { offset: 0.6, color: 'rgba(139,92,246,0.5)' },
            { offset: 1, color: 'rgba(139,92,246,0.1)' },
          ]),
        },
        emphasis: { itemStyle: { shadowBlur: 16, shadowColor: 'rgba(139,92,246,0.5)' } },
        label: {
          show: true,
          position: 'top',
          color: '#a855f7',
          fontSize: 10,
          fontWeight: 'bold',
          formatter: '{c}%',
        },
      },
      {
        name: '故障率',
        type: 'line',
        yAxisIndex: 1,
        data: faultData.map((v) => v * 10),
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#ef4444', width: 2.5, shadowBlur: 6, shadowColor: 'rgba(239,68,68,0.4)' },
        itemStyle: { color: '#ef4444', borderColor: '#fff', borderWidth: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(239,68,68,0.25)' },
            { offset: 1, color: 'rgba(239,68,68,0)' },
          ]),
        },
        markPoint: {
          data: [
            { type: 'max', name: '最大值', symbolSize: 40, label: { color: '#fff', fontSize: 9 }, itemStyle: { color: '#ef4444' } },
          ],
        },
        markArea: {
          silent: true,
          data: [[
            { yAxis: 250, itemStyle: { color: 'rgba(239,68,68,0.04)' } },
            { yAxis: 500 },
          ]],
        },
      },
      {
        name: 'MTBF',
        type: 'line',
        yAxisIndex: 1,
        data: mtbfData,
        smooth: 0.4,
        symbol: 'diamond',
        symbolSize: 10,
        lineStyle: { color: '#34d399', width: 2, type: 'dashed', shadowBlur: 4, shadowColor: 'rgba(52,211,153,0.3)' },
        itemStyle: { color: '#34d399', borderColor: 'rgba(255,255,255,0.8)', borderWidth: 1.5 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(52,211,153,0.15)' },
            { offset: 1, color: 'rgba(52,211,153,0)' },
          ]),
        },
      },
    ],
  };
}

function getScatter3DOption(): any {
  const DEVICE_TYPES = [
    { name: '夹爪气缸', color: '#3b82f6', count: 25 },
    { name: '推送气缸', color: '#8b5cf6', count: 20 },
    { name: '升降气缸', color: '#10b981', count: 18 },
    { name: '旋转气缸', color: '#f59e0b', count: 17 },
  ];

  const series: any[] = DEVICE_TYPES.map((type) => {
    const data = Array.from({ length: type.count }, () => {
      const health = 20 + Math.random() * 80;
      return [
        30 + Math.random() * 60,
        100 + Math.random() * 900,
        health,
      ];
    });
    return {
      type: 'scatter3D',
      name: type.name,
      data,
      symbolSize: (val: number[]) => {
        const h = val[2];
        return h < 40 ? 18 : h < 70 ? 12 : 9;
      },
      itemStyle: {
        color: type.color,
        opacity: 0.92,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
      },
      emphasis: {
        itemStyle: { opacity: 1, borderColor: '#ffffff', borderWidth: 2 },
      },
    };
  });

  return {
    backgroundColor: 'transparent',
    tooltip: {
      show: true,
      backgroundColor: 'rgba(10,25,47,0.95)',
      borderColor: '#0f2847',
      textStyle: { color: '#eef5ff', fontSize: 12 },
      formatter: (params: any) => {
        const [temp, pressure, health] = params.value;
        return `<b>${params.seriesName}</b><br/>温度: ${temp.toFixed(1)}°C<br/>压力: ${pressure.toFixed(0)} kPa<br/>健康度: ${health.toFixed(0)}%`;
      },
    },
    legend: {
      data: DEVICE_TYPES.map((t) => t.name),
      top: 8,
      right: 16,
      textStyle: { color: '#c0d4e8', fontSize: 12, fontWeight: 'bold' },
      itemWidth: 14,
      itemHeight: 10,
    },
    grid3D: {
      boxWidth: 130,
      boxHeight: 90,
      boxDepth: 100,
      viewControl: { alpha: 20, beta: 40, distance: 180, autoRotate: true, autoRotateSpeed: 3 },
      postEffect: {
        enable: true,
        bloom: { enable: true, intensity: 0.08 },
      },
      light: {
        main: { intensity: 1.2, shadow: false, alpha: 35, beta: 45 },
        ambient: { intensity: 0.6 },
      },
      environment: 'transparent',
    },
    xAxis3D: {
      type: 'value',
      name: '温度 °C',
      min: 25,
      max: 95,
      axisLabel: { color: '#c0d4e8', fontSize: 11 },
      nameTextStyle: { color: '#3b82f6', fontSize: 12, fontWeight: 'bold' },
      axisLine: { lineStyle: { color: '#0f2847' } },
      splitLine: { lineStyle: { color: 'rgba(15,40,71,0.3)' } },
    },
    yAxis3D: {
      type: 'value',
      name: '压力 kPa',
      min: 50,
      max: 1050,
      axisLabel: { color: '#c0d4e8', fontSize: 11 },
      nameTextStyle: { color: '#8b5cf6', fontSize: 12, fontWeight: 'bold' },
      axisLine: { lineStyle: { color: '#0f2847' } },
      splitLine: { lineStyle: { color: 'rgba(15,40,71,0.3)' } },
    },
    zAxis3D: {
      type: 'value',
      name: '健康度 %',
      min: 0,
      max: 100,
      axisLabel: { color: '#c0d4e8', fontSize: 11 },
      nameTextStyle: { color: '#34d399', fontSize: 12, fontWeight: 'bold' },
      axisLine: { lineStyle: { color: '#0f2847' } },
      splitLine: { lineStyle: { color: 'rgba(15,40,71,0.3)' } },
    },
    series,
  };
}

function AssetHealthPanel({ health }: { health: { name: string; score: number }[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    instanceRef.current = chart;
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, []);

  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart) return;
    const avgScore = Math.round(health.reduce((a, h) => a + h.score, 0) / health.length);
    chart.setOption({
      radar: {
        indicator: health.map((h) => ({ name: h.name, max: 100 })),
        radius: '60%',
        center: ['50%', '55%'],
        axisLine: { lineStyle: { color: 'rgba(15,40,71,0.6)' } },
        splitLine: { lineStyle: { color: 'rgba(15,40,71,0.4)' } },
        splitArea: { areaStyle: { color: ['rgba(59,130,246,0.02)', 'rgba(59,130,246,0.04)', 'rgba(59,130,246,0.06)'] } },
        axisName: { color: '#c0d4e8', fontSize: 10, fontWeight: 'bold' },
      },
      series: [{
        type: 'radar',
        data: [
          {
            value: health.map((h) => h.score),
            name: '当前健康度',
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(59,130,246,0.35)' },
                { offset: 1, color: 'rgba(59,130,246,0.05)' },
              ]),
            },
            lineStyle: { color: '#3b82f6', width: 2.5, shadowBlur: 6, shadowColor: 'rgba(59,130,246,0.4)' },
            itemStyle: { color: '#3b82f6', borderColor: '#fff', borderWidth: 1.5 },
            symbol: 'circle',
            symbolSize: 6,
          },
          {
            value: health.map(() => 80),
            name: '达标线',
            areaStyle: { color: 'transparent' },
            lineStyle: { color: '#22c55e', width: 1, type: 'dashed', opacity: 0.5 },
            itemStyle: { opacity: 0 },
            symbol: 'none',
          },
        ],
      }],
    });
  }, [health]);

  const avgScore = Math.round(health.reduce((a, h) => a + h.score, 0) / health.length);

  return (
    <div className="glass-panel bs-panel bs-health-panel">
      <div className="bs-panel-title">资产健康度</div>
      <div className="bs-health-summary">
        <span className="bs-health-score">{avgScore}<span className="bs-health-suffix">/100</span></span>
        <span className="bs-health-label">综合评分</span>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: 170 }} />
    </div>
  );
}

function AlertEventsPanel({ alerts }: { alerts: { time: string; level: string; msg: string }[] }) {
  const criticalCount = alerts.filter((a) => a.level === 'critical').length;
  const warningCount = alerts.filter((a) => a.level === 'warning').length;
  return (
    <div className="glass-panel bs-panel bs-alert-panel">
      <div className="bs-panel-title">
        实时告警事件
        {criticalCount > 0 && <span className="alert-badge">{criticalCount}</span>}
      </div>
      <div className="bs-alert-summary">
        <span className="bs-alert-stat critical">{criticalCount} 紧急</span>
        <span className="bs-alert-stat warning">{warningCount} 预警</span>
        <span className="bs-alert-stat info">{alerts.length - criticalCount - warningCount} 提示</span>
      </div>
      <div className="bs-alert-list">
        {alerts.map((alert, idx) => (
          <div key={idx} className={`bs-alert-item ${alert.level} ${idx === 0 ? 'newest' : ''}`}>
            <span className="bs-alert-time">{alert.time}</span>
            <span className={`bs-alert-level level-${alert.level}`}>{alert.level === 'critical' ? '紧急' : alert.level === 'warning' ? '预警' : '提示'}</span>
            <span className="bs-alert-msg">{alert.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
