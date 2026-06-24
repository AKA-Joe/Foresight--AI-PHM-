import { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import 'echarts-gl';
import { useMockRealtimeData } from './useMockRealtimeData';

interface Props {
  isFullscreen?: boolean;
}

export default function BigScreenView({ isFullscreen = false }: Props) {
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
          <TrafficPanel data={traffic} viewMode={viewMode} />
          <ModeParamsPanel viewMode={viewMode} health={health} stats={stats} alerts={alerts} />
        </div>
        <div className="bs-center">
          <Globe3D viewMode={viewMode} />
        </div>
        <div className="bs-right-col">
          <AssetHealthPanel health={health} viewMode={viewMode} />
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

function TrafficPanel({ data, viewMode }: { data: number[]; viewMode: string }) {
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

  const modeMap: Record<string, string> = { global: '实时数据流量', region: '区域通信负载', device: '设备数据吞吐' };

  return (
    <div className="glass-panel bs-panel bs-traffic-panel">
      <div className="bs-panel-title">{modeMap[viewMode] || '实时数据流量'}</div>
      <div className="bs-traffic-summary">
        <span className="bs-traffic-value">{data[data.length - 1] || 0}<span className="bs-traffic-unit">Mbps</span></span>
        <span className="bs-traffic-peak">峰值 {Math.max(...data)}</span>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: 130 }} />
    </div>
  );
}

const STAT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

function ModeParamsPanel({ viewMode, health, stats, alerts }: {
  viewMode: string; health: { name: string; score: number }[];
  stats: { label: string; value: number; unit: string }[]; alerts: { time: string; level: string; msg: string }[];
}) {
  if (viewMode === 'global') {
    const dims = health.slice(0, 8);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="bs-stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {stats.map((s, i) => (
            <div key={s.label} className="glass-panel bs-stat-card" style={{ borderLeftColor: STAT_COLORS[i], padding: '8px 10px' }}>
              <div className="bs-stat-header">
                <span className="bs-stat-label" style={{ fontSize: 10 }}>{s.label}</span>
              </div>
              <div className="bs-stat-value" style={{ fontSize: 18 }}>
                {s.value}<span className="bs-stat-unit">{s.unit}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#c0d0e0', letterSpacing: '0.05em', marginTop: 2 }}>
          健康维度评分
        </div>
        {dims.map((d) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#8a9bb5', width: 72, flexShrink: 0, textAlign: 'right' }}>{d.name}</span>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(15,40,71,0.5)', overflow: 'hidden' }}>
              <div style={{
                width: `${d.score}%`, height: '100%', borderRadius: 2,
                background: d.score > 80 ? '#22c55e' : d.score > 60 ? '#f59e0b' : '#ef4444',
                transition: 'width 0.5s ease',
              }} />
            </div>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, color: d.score > 80 ? '#22c55e' : d.score > 60 ? '#fbbf24' : '#f87171', width: 28, textAlign: 'right' }}>{d.score}</span>
          </div>
        ))}
        <div style={{ fontSize: 9, color: '#6b8ab5', padding: '2px 4px', lineHeight: 1.5 }}>
          🏭 常熟工厂 · 2车间 · 5产线 · 10工位 · 15气缸
        </div>
      </div>
    );
  }

  if (viewMode === 'region') {
    const regions = [
      { name: '华东', health: 85, avail: 92, fault: 12, mtbf: 320 },
      { name: '华南', health: 72, avail: 88, fault: 25, mtbf: 180 },
      { name: '华北', health: 91, avail: 95, fault: 8, mtbf: 410 },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#c0d0e0', letterSpacing: '0.05em' }}>区域 KPI 排名</div>
        {regions.map((r, i) => (
          <div key={r.name} className="glass-panel" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `3px solid ${STAT_COLORS[i]}` }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#eef5ff' }}>{r.name}</span>
            <div style={{ display: 'flex', gap: 12, fontSize: 10, fontFamily: 'var(--font-mono)', color: '#8a9bb5' }}>
              <span>健康 {r.health}%</span>
              <span>稼动 {r.avail}%</span>
              <span>MTBF {r.mtbf}h</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === 'device') {
    const devices = [
      { type: '夹爪气缸', count: 25, avgHealth: 72, minH: 38, maxH: 95, color: '#3b82f6' },
      { type: '推送气缸', count: 20, avgHealth: 68, minH: 42, maxH: 91, color: '#8b5cf6' },
      { type: '升降气缸', count: 18, avgHealth: 55, minH: 28, maxH: 88, color: '#10b981' },
      { type: '旋转气缸', count: 17, avgHealth: 81, minH: 55, maxH: 96, color: '#f59e0b' },
    ];
    const criticalCount = alerts.filter(a => a.level === 'critical').length;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#c0d0e0', letterSpacing: '0.05em' }}>设备类型概览</div>
        {devices.map((d) => (
          <div key={d.type} className="glass-panel" style={{ padding: '10px 12px', borderLeft: `3px solid ${d.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#eef5ff' }}>{d.type}</span>
              <span style={{ fontSize: 9, color: '#6b8ab5' }}>{d.count} 台</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700, color: d.avgHealth > 70 ? '#22c55e' : '#f59e0b' }}>{d.avgHealth}</span>
              <span style={{ fontSize: 9, color: '#6b8ab5' }}>均分</span>
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(15,40,71,0.5)', overflow: 'hidden' }}>
                <div style={{ width: `${d.avgHealth}%`, height: '100%', borderRadius: 2, background: d.color, opacity: 0.6 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 9, color: '#6b8ab5' }}>
              <span>最低 <span style={{ color: '#f87171' }}>{d.minH}</span></span>
              <span>最高 <span style={{ color: '#22c55e' }}>{d.maxH}</span></span>
              <span>范围 {d.maxH - d.minH}</span>
            </div>
          </div>
        ))}
        {criticalCount > 0 && (
          <div style={{ fontSize: 10, color: '#ef4444', padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)' }}>
            ⚠️ {criticalCount} 台设备健康度低于 40%（紧急关注）
          </div>
        )}
        <div style={{ fontSize: 9, color: '#6b8ab5', padding: '4px 6px', lineHeight: 1.5 }}>
          📐 3D散点轴: X=温度°C | Y=压力kPa | Z=健康度%
        </div>
      </div>
    );
  }

  return null;
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
  const C_BLUE   = '#3b82f6';
  const C_PURPLE = '#8b5cf6';
  const C_GREEN  = '#10b981';
  const C_AMBER  = '#f59e0b';
  const C_CYAN   = '#06b6d4';

  // ===== 厂区 → 车间 → 产线 → 工位 → 气缸 五级拓扑 =====

  // 工厂根节点
  const FACTORY = { id: 'FACTORY', name: '🏭 常熟离散制造工厂', x: 370, y: -30 };

  // 车间（2个）
  const WORKSHOPS = [
    { id: 'WS-A', name: '冲压注塑车间', x: 250, y: 10 },
    { id: 'WS-B', name: '装配包装车间', x: 520, y: 10 },
  ];

  // 产线（5条，分属2个车间）
  const LINES = [
    { id: 'LINE-A', name: '冲压一线',   workshop: 'WS-A', y: 80,  color: C_BLUE },
    { id: 'LINE-B', name: '注塑二线',   workshop: 'WS-A', y: 170, color: C_PURPLE },
    { id: 'LINE-C', name: '检测封装线', workshop: 'WS-A', y: 260, color: C_GREEN },
    { id: 'LINE-D', name: '装配一线',   workshop: 'WS-B', y: 350, color: C_AMBER },
    { id: 'LINE-E', name: '包装码垛线', workshop: 'WS-B', y: 440, color: C_CYAN },
  ];

  // 工位（10个）
  const STATIONS = [
    { id: 'ST-01', name: '冲压工位', line: 'LINE-A', x: 190 },
    { id: 'ST-02', name: '焊接工位', line: 'LINE-A', x: 430 },
    { id: 'ST-03', name: '压装机构', line: 'LINE-B', x: 200 },
    { id: 'ST-04', name: '注塑成型', line: 'LINE-B', x: 430 },
    { id: 'ST-05', name: '检测转台', line: 'LINE-C', x: 200 },
    { id: 'ST-06', name: '封装测试', line: 'LINE-C', x: 430 },
    { id: 'ST-07', name: '夹爪专机', line: 'LINE-D', x: 200 },
    { id: 'ST-08', name: '推送工位', line: 'LINE-D', x: 430 },
    { id: 'ST-09', name: '包装工位', line: 'LINE-E', x: 200 },
    { id: 'ST-10', name: '码垛机器人', line: 'LINE-E', x: 430 },
  ];

  // 气缸（15个）
  const CYLINDERS = [
    { id: 'CYL-01', name: '冲压主缸',     station: 'ST-01', health: 55, alert: 'warning' },
    { id: 'CYL-02', name: '冲压复位缸',   station: 'ST-01', health: 82, alert: 'normal' },
    { id: 'CYL-03', name: '焊接夹紧缸',   station: 'ST-02', health: 68, alert: 'warning' },
    { id: 'CYL-04', name: '升降复位缸',   station: 'ST-03', health: 28, alert: 'critical' },
    { id: 'CYL-05', name: '压装下压缸',   station: 'ST-03', health: 88, alert: 'normal' },
    { id: 'CYL-06', name: '注塑顶出缸',   station: 'ST-04', health: 76, alert: 'normal' },
    { id: 'CYL-07', name: '旋转到位缸',   station: 'ST-05', health: 45, alert: 'warning' },
    { id: 'CYL-08', name: '检测升降缸',   station: 'ST-05', health: 91, alert: 'normal' },
    { id: 'CYL-09', name: '封口压紧缸',   station: 'ST-06', health: 89, alert: 'normal' },
    { id: 'CYL-10', name: '夹爪缩回缸',   station: 'ST-07', health: 68, alert: 'warning' },
    { id: 'CYL-11', name: '夹爪旋转缸',   station: 'ST-07', health: 93, alert: 'normal' },
    { id: 'CYL-12', name: '推送伸出缸',   station: 'ST-08', health: 71, alert: 'warning' },
    { id: 'CYL-13', name: '上料举升缸',   station: 'ST-08', health: 37, alert: 'critical' },
    { id: 'CYL-14', name: '包装压合缸',   station: 'ST-09', health: 73, alert: 'normal' },
    { id: 'CYL-15', name: '码垛伸缩缸',   station: 'ST-10', health: 61, alert: 'warning' },
  ];

  function healthColor(score: number): string {
    if (score > 70) return '#22c55e';
    if (score > 40) return '#f59e0b';
    return '#ef4444';
  }

  const lineColors: Record<string, string> = {};
  LINES.forEach(l => { lineColors[l.id] = l.color; });
  const LINE_IDS = LINES.map(l => l.id);
  const categories = LINES.map((l) => ({ name: l.name, itemStyle: { color: l.color } }));

  const nodes: any[] = [];
  const links: any[] = [];
  const lineIdxMap: Record<string, number> = {};
  LINES.forEach((l, i) => { lineIdxMap[l.id] = i; });

  // ---- 工厂根节点 ----
  nodes.push({
    id: FACTORY.id,
    name: FACTORY.name,
    x: FACTORY.x, y: FACTORY.y,
    symbolSize: [180, 36],
    symbol: 'roundRect',
    itemStyle: { color: '#0f2847', borderColor: '#3b82f6', borderWidth: 2, opacity: 0.95 },
    label: { show: true, color: '#eef5ff', fontSize: 12, fontWeight: 'bold' },
  });

  // ---- 车间节点 ----
  WORKSHOPS.forEach(ws => {
    nodes.push({
      id: ws.id,
      name: ws.name,
      x: ws.x, y: ws.y,
      symbolSize: [120, 30],
      symbol: 'roundRect',
      itemStyle: { color: '#0a1e35', borderColor: '#8b5cf6', borderWidth: 1.5, opacity: 0.9 },
      label: { show: true, color: '#c0d4e8', fontSize: 11, fontWeight: 'bold' },
    });
    links.push({
      source: FACTORY.id, target: ws.id,
      lineStyle: { color: '#1e4a6f', width: 2, opacity: 0.6, type: 'solid' },
      symbol: ['none', 'arrow'], symbolSize: [0, 10],
    });
  });

  // ---- 产线节点 ----
  LINES.forEach(line => {
    const ws = WORKSHOPS.find(w => w.id === line.workshop)!;
    nodes.push({
      id: line.id,
      name: line.name,
      x: ws.x,
      y: line.y,
      symbolSize: [90, 26],
      symbol: 'roundRect',
      category: lineIdxMap[line.id],
      itemStyle: { color: line.color, borderColor: line.color, borderWidth: 2, opacity: 0.9 },
      label: { show: true, color: '#eef5ff', fontSize: 11, fontWeight: 'bold' },
    });
    links.push({
      source: line.workshop, target: line.id,
      lineStyle: { color: line.color, width: 2, opacity: 0.45, type: 'dashed' },
    });
  });

  // ---- 工位节点 ----
  STATIONS.forEach(station => {
    const line = LINES.find(l => l.id === station.line)!;
    nodes.push({
      id: station.id,
      name: station.name,
      x: station.x,
      y: line.y,
      symbolSize: 30,
      symbol: 'circle',
      category: lineIdxMap[station.line],
      itemStyle: { color: line.color, opacity: 0.8, borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1.5 },
      label: { show: true, position: 'bottom', color: '#c0d4e8', fontSize: 10, fontWeight: 'bold' as const, distance: 6 },
    });
    links.push({
      source: station.line, target: station.id,
      lineStyle: { color: line.color, width: 2, opacity: 0.5, type: 'dashed' },
    });
  });

  // ---- 产线内物料流 ----
  const lineStations: Record<string, string[]> = {};
  STATIONS.forEach(s => {
    if (!lineStations[s.line]) lineStations[s.line] = [];
    lineStations[s.line].push(s.id);
  });
  Object.entries(lineStations).forEach(([lid, sids]) => {
    for (let i = 0; i < sids.length - 1; i++) {
      links.push({
        source: sids[i], target: sids[i + 1],
        lineStyle: { color: lineColors[lid], width: 3, type: 'solid', opacity: 0.7 },
        symbol: ['none', 'arrow'], symbolSize: [0, 14],
      });
    }
  });

  // ---- 车间内产线间流转 ----
  WORKSHOPS.forEach(ws => {
    const wsLines = LINES.filter(l => l.workshop === ws.id);
    for (let i = 0; i < wsLines.length - 1; i++) {
      const a = lineStations[wsLines[i].id]?.slice(-1)[0];
      const b = lineStations[wsLines[i + 1].id]?.[0];
      if (a && b) {
        links.push({
          source: a, target: b,
          lineStyle: { color: '#1e4a6f', width: 1.5, type: 'dotted', opacity: 0.5, curveness: 0.3 },
          symbol: ['none', 'arrow'], symbolSize: [0, 8],
        });
      }
    }
  });

  // ---- 车间间流转 ----
  (() => {
    const wsAStations = STATIONS.filter(s => LINES.find(l => l.id === s.line)?.workshop === 'WS-A');
    const wsBStations = STATIONS.filter(s => LINES.find(l => l.id === s.line)?.workshop === 'WS-B');
    if (wsAStations.length && wsBStations.length) {
      links.push({
        source: wsAStations[wsAStations.length - 1].id,
        target: wsBStations[0].id,
        lineStyle: { color: '#3b82f6', width: 2, type: 'dotted', opacity: 0.5, curveness: 0.3 },
        symbol: ['none', 'arrow'], symbolSize: [0, 12],
      });
    }
  })();

  // ---- 气缸执行单元 ----
  CYLINDERS.forEach(cyl => {
    const station = STATIONS.find(s => s.id === cyl.station)!;
    const line = LINES.find(l => l.id === station.line)!;
    const color = healthColor(cyl.health);
    const isCritical = cyl.alert === 'critical';
    const cylsAtStation = CYLINDERS.filter(c => c.station === cyl.station);
    const cylIdx = cylsAtStation.indexOf(cyl);
    const yOff = cylsAtStation.length === 1 ? 36 : (cylIdx * 28 + 22);

    nodes.push({
      id: cyl.id,
      name: `${cyl.name} [${cyl.health}%]`,
      x: station.x + 55,
      y: line.y + yOff,
      symbolSize: isCritical ? 18 : 14,
      symbol: 'diamond',
      category: lineIdxMap[station.line],
      itemStyle: {
        color, shadowBlur: isCritical ? 22 : 0,
        shadowColor: isCritical ? 'rgba(239,68,68,0.9)' : undefined,
        borderColor: isCritical ? '#ef4444' : 'rgba(255,255,255,0.1)',
        borderWidth: isCritical ? 2 : 1,
      },
      label: { show: true, position: 'right', color: '#6b8ab5', fontSize: 9, fontWeight: 'bold' as const, distance: 4 },
    });
    links.push({
      source: cyl.station, target: cyl.id,
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
          const id = params.data.id;
          if (id === FACTORY.id) return `<b>${FACTORY.name}</b><br/>5条产线 · 10工位 · 15气缸`;
          const ws = WORKSHOPS.find(w => w.id === id);
          if (ws) return `<b>${ws.name}</b><br/>${LINES.filter(l => l.workshop === ws.id).length} 条产线`;
          const line = LINES.find(l => l.id === id);
          if (line) {
            const stCount = STATIONS.filter(s => s.line === id).length;
            const cylCount = CYLINDERS.filter(c => STATIONS.find(s => s.id === c.station)?.line === id).length;
            return `<b>${line.name}</b><br/>${stCount} 工位 · ${cylCount} 气缸`;
          }
          const cyl = CYLINDERS.find(c => c.id === id);
          if (cyl) return `<b>${cyl.name}</b><br/>健康度: ${cyl.health}%<br/>状态: ${cyl.alert === 'critical' ? '⚠ 紧急' : cyl.alert === 'warning' ? '🟡 预警' : '✅ 正常'}`;
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
        scaleLimit: { min: 0.6, max: 2.5 },
        categories,
        data: nodes,
        links,
        left: 0,
        right: 0,
        top: 30,
        bottom: 10,
        lineStyle: { curveness: 0.08 },
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

function AssetHealthPanel({ health, viewMode }: { health: { name: string; score: number }[]; viewMode: string }) {
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

    if (viewMode === 'global') {
      // ===== 全局：8维度综合资产健康 =====
      const indicators = health.map(h => ({ name: h.name, max: 100 }));
      chart.setOption({
        radar: {
          indicator: indicators,
          radius: '62%', center: ['50%', '52%'],
          axisLine: { lineStyle: { color: 'rgba(15,40,71,0.6)' } },
          splitLine: { lineStyle: { color: 'rgba(15,40,71,0.4)' } },
          splitArea: { areaStyle: { color: ['rgba(59,130,246,0.02)','rgba(59,130,246,0.04)','rgba(59,130,246,0.06)'] } },
          axisName: { color: '#c0d4e8', fontSize: 9, fontWeight: 'bold' },
          shape: 'circle',
        },
        series: [{
          type: 'radar',
          data: [
            { value: health.map(h => h.score), name: '资产健康',
              areaStyle: { color: 'rgba(59,130,246,0.2)' },
              lineStyle: { color: '#3b82f6', width: 2.5 },
              itemStyle: { color: '#3b82f6' }, symbol: 'circle', symbolSize: 5,
            },
            { value: [85,85,85,85,85,85,85,85], name: '目标线',
              areaStyle: { color: 'transparent' },
              lineStyle: { color: '#22c55e', width: 1, type: 'dashed', opacity: 0.4 },
              itemStyle: { opacity: 0 }, symbol: 'none',
            },
          ],
        }],
      }, true);
    } else if (viewMode === 'region') {
      // ===== 区域：5区域 × 4指标对比雷达 =====
      chart.setOption({
        radar: {
          indicator: [
            { name: '健康度', max: 100 }, { name: '稼动率', max: 100 },
            { name: '故障率↓', max: 50 }, { name: 'MTBF', max: 500 },
          ],
          radius: '58%', center: ['50%', '52%'],
          axisLine: { lineStyle: { color: 'rgba(15,40,71,0.6)' } },
          splitLine: { lineStyle: { color: 'rgba(15,40,71,0.4)' } },
          axisName: { color: '#c0d4e8', fontSize: 10, fontWeight: 'bold' },
          shape: 'polygon',
        },
        series: [
          { type: 'radar', name: '华东',
            data: [{ value: [85, 92, 12, 320], name: '华东' }],
            areaStyle: { color: 'rgba(59,130,246,0.12)' },
            lineStyle: { color: '#3b82f6', width: 2 }, itemStyle: { color: '#3b82f6' }, symbol: 'circle', symbolSize: 6,
          },
          { type: 'radar', name: '华南',
            data: [{ value: [72, 88, 25, 180], name: '华南' }],
            areaStyle: { color: 'rgba(245,158,11,0.12)' },
            lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' }, symbol: 'diamond', symbolSize: 6,
          },
          { type: 'radar', name: '华北',
            data: [{ value: [91, 95, 8, 410], name: '华北' }],
            areaStyle: { color: 'rgba(16,185,129,0.12)' },
            lineStyle: { color: '#10b981', width: 2 }, itemStyle: { color: '#10b981' }, symbol: 'triangle', symbolSize: 7,
          },
        ],
        legend: {
          data: ['华东', '华南', '华北'], bottom: 0,
          textStyle: { color: '#8a9bb5', fontSize: 10 },
          itemWidth: 12, itemHeight: 8,
        },
      }, true);
    } else {
      // ===== 设备：4设备类型健康对比雷达 =====
      chart.setOption({
        radar: {
          indicator: [
            { name: '健康度', max: 100 }, { name: '精度', max: 100 },
            { name: '温度', max: 100 }, { name: '压力', max: 100 },
            { name: '振动', max: 50 }, { name: 'MTBF', max: 500 },
          ],
          radius: '58%', center: ['50%', '52%'],
          axisLine: { lineStyle: { color: 'rgba(15,40,71,0.6)' } },
          splitLine: { lineStyle: { color: 'rgba(15,40,71,0.4)' } },
          axisName: { color: '#c0d4e8', fontSize: 10, fontWeight: 'bold' },
          shape: 'polygon',
        },
        series: [
          { type: 'radar', name: '夹爪',
            data: [{ value: [72, 85, 62, 78, 18, 350], name: '夹爪' }],
            areaStyle: { color: 'rgba(59,130,246,0.12)' },
            lineStyle: { color: '#3b82f6', width: 2 }, itemStyle: { color: '#3b82f6' }, symbol: 'circle', symbolSize: 5,
          },
          { type: 'radar', name: '推送',
            data: [{ value: [68, 78, 71, 65, 28, 240], name: '推送' }],
            areaStyle: { color: 'rgba(139,92,246,0.12)' },
            lineStyle: { color: '#8b5cf6', width: 2 }, itemStyle: { color: '#8b5cf6' }, symbol: 'diamond', symbolSize: 5,
          },
          { type: 'radar', name: '升降',
            data: [{ value: [55, 70, 85, 58, 35, 180], name: '升降' }],
            areaStyle: { color: 'rgba(245,158,11,0.12)' },
            lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' }, symbol: 'triangle', symbolSize: 6,
          },
          { type: 'radar', name: '旋转',
            data: [{ value: [81, 90, 55, 72, 12, 420], name: '旋转' }],
            areaStyle: { color: 'rgba(16,185,129,0.12)' },
            lineStyle: { color: '#10b981', width: 2 }, itemStyle: { color: '#10b981' }, symbol: 'circle', symbolSize: 5,
          },
        ],
        legend: {
          data: ['夹爪', '推送', '升降', '旋转'], bottom: 0,
          textStyle: { color: '#8a9bb5', fontSize: 10 },
          itemWidth: 12, itemHeight: 8,
        },
      }, true);
    }
  }, [health, viewMode]);

  const avgScore = Math.round(health.reduce((a, h) => a + h.score, 0) / health.length);
  const belowTarget = health.filter(h => h.score < 70).length;
  const titles: Record<string, string> = { global: '全局资产健康雷达 · 8维', region: '区域健康对比 · 华东/华南/华北', device: '设备类型对比 · 4类气缸' };

  return (
    <div className="glass-panel bs-panel bs-health-panel">
      <div className="bs-panel-title">{titles[viewMode] || titles.global}</div>
      <div className="bs-health-summary">
        <span className="bs-health-score">{avgScore}<span className="bs-health-suffix">/100</span></span>
        <span className="bs-health-label">
          {viewMode === 'global' ? `综合评分` : viewMode === 'region' ? `区域均值` : `设备均值`}
          {viewMode === 'global' && belowTarget > 0 && (
            <span style={{ color: '#ef4444', marginLeft: 8, fontSize: 10 }}>{belowTarget} 项低于目标</span>
          )}
        </span>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: viewMode === 'global' ? 210 : 190 }} />
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
