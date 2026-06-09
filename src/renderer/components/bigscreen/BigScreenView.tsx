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
    chart.setOption({
      grid: { top: 10, right: 10, bottom: 20, left: 40 },
      xAxis: { type: 'category', data: data.map((_, i) => `${i}s`), axisLine: { lineStyle: { color: '#1e3a5f' } }, axisLabel: { color: '#64748b', fontSize: 9 } },
      yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: 'rgba(30,58,95,0.3)' } }, axisLabel: { color: '#64748b', fontSize: 9 } },
      series: [{
        type: 'line',
        data,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#00d4ff', width: 2 },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(0,212,255,0.3)' }, { offset: 1, color: 'rgba(0,212,255,0)' }]) },
      }],
    });
  }, [data]);

  return (
    <div className="glass-panel bs-panel">
      <div className="bs-panel-title">实时数据流量 (Mbps)</div>
      <div ref={chartRef} style={{ width: '100%', height: 140 }} />
    </div>
  );
}

function StatsCards({ stats }: { stats: { label: string; value: number; unit: string }[] }) {
  return (
    <div className="bs-stats-grid">
      {stats.map((s) => (
        <div key={s.label} className="glass-panel bs-stat-card">
          <div className="bs-stat-value">{s.value}<span className="bs-stat-unit">{s.unit}</span></div>
          <div className="bs-stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function Globe3D({ viewMode }: { viewMode: 'global' | 'region' | 'device' }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [error, setError] = useState(false);

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
    initChart();
    const onResize = () => instanceRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
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
  const nodeCount = 40;
  const nodes: number[][] = [];
  for (let i = 0; i < nodeCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 35 + Math.random() * 15;
    nodes.push([
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    ]);
  }

  return {
    backgroundColor: 'transparent',
    grid3D: {
      show: false,
      boxWidth: 100,
      boxHeight: 100,
      boxDepth: 100,
      viewControl: {
        autoRotate: true,
        autoRotateSpeed: 6,
        distance: 180,
        alpha: 20,
        beta: 40,
      },
      postEffect: {
        enable: true,
        bloom: { enable: true, intensity: 0.8 },
      },
      light: {
        main: { intensity: 1.2, shadow: false },
        ambient: { intensity: 0.6 },
      },
    },
    xAxis3D: { type: 'value', show: false },
    yAxis3D: { type: 'value', show: false },
    zAxis3D: { type: 'value', show: false },
    series: [
      {
        type: 'scatter3D',
        data: nodes,
        symbolSize: 8,
        itemStyle: {
          color: '#00d4ff',
          opacity: 1,
        },
        emphasis: {
          itemStyle: { color: '#00e5a0' },
        },
      },
      {
        type: 'scatter3D',
        data: nodes.filter((_, i) => i % 5 === 0).map((n) => [n[0] * 1.01, n[1] * 1.01, n[2] * 1.01]),
        symbolSize: 16,
        itemStyle: {
          color: 'rgba(0, 212, 255, 0.15)',
          opacity: 0.6,
        },
        silent: true,
      },
    ],
  };
}

function getBar3DOption(): any {
  const regions = ['华东', '华南', '华北', '西南', '西北', '中部'];
  const data = regions.map((_, i) => [i, 0, Math.round(Math.random() * 80 + 20)]);
  return {
    backgroundColor: 'transparent',
    grid3D: {
      boxWidth: 120,
      boxHeight: 60,
      boxDepth: 60,
      viewControl: { alpha: 25, beta: 40, distance: 220 },
      postEffect: { enable: true, bloom: { enable: true, intensity: 0.3 } },
      light: { main: { intensity: 1, shadow: false }, ambient: { intensity: 0.5 } },
    },
    xAxis3D: { type: 'category', data: regions, axisLabel: { color: '#94a3b8', fontSize: 10 }, axisLine: { lineStyle: { color: '#1e3a5f' } } },
    yAxis3D: { type: 'category', data: [''], axisLabel: { show: false }, axisLine: { lineStyle: { color: '#1e3a5f' } } },
    zAxis3D: { type: 'value', name: '健康度', axisLabel: { color: '#94a3b8', fontSize: 9 }, axisLine: { lineStyle: { color: '#1e3a5f' } }, splitLine: { lineStyle: { color: 'rgba(30,58,95,0.3)' } } },
    series: [{
      type: 'bar3D',
      data,
      shading: 'lambert',
      barSize: 18,
      itemStyle: {
        color: (params: any) => {
          const v = params.value[2];
          if (v > 70) return '#22c55e';
          if (v > 40) return '#f59e0b';
          return '#ef4444';
        },
        opacity: 0.9,
      },
      label: { show: true, formatter: (p: any) => `${p.value[2]}`, color: '#e2e8f0', fontSize: 10, distance: 2 },
    }],
  };
}

function getScatter3DOption(): any {
  const data = Array.from({ length: 80 }, () => [
    Math.random() * 100,
    Math.random() * 100,
    Math.random() * 100,
  ]);
  return {
    backgroundColor: 'transparent',
    grid3D: {
      viewControl: { alpha: 20, beta: 30, distance: 220 },
      postEffect: { enable: true, bloom: { enable: true, intensity: 0.3 } },
      light: { main: { intensity: 1, shadow: false }, ambient: { intensity: 0.5 } },
      axisLine: { lineStyle: { color: '#1e3a5f' } },
      splitLine: { lineStyle: { color: 'rgba(30,58,95,0.3)' } },
    },
    xAxis3D: { type: 'value', name: '温度 °C', axisLabel: { color: '#94a3b8', fontSize: 9 }, nameTextStyle: { color: '#64748b', fontSize: 10 } },
    yAxis3D: { type: 'value', name: '压力 kPa', axisLabel: { color: '#94a3b8', fontSize: 9 }, nameTextStyle: { color: '#64748b', fontSize: 10 } },
    zAxis3D: { type: 'value', name: '健康度', axisLabel: { color: '#94a3b8', fontSize: 9 }, nameTextStyle: { color: '#64748b', fontSize: 10 } },
    series: [{
      type: 'scatter3D',
      data,
      symbolSize: 7,
      itemStyle: {
        color: (p: any) => {
          const h = p.value[2];
          if (h > 70) return '#22c55e';
          if (h > 40) return '#f59e0b';
          return '#ef4444';
        },
        opacity: 0.9,
      },
    }],
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
    chart.setOption({
      radar: {
        indicator: health.map((h) => ({ name: h.name, max: 100 })),
        radius: '65%',
        axisLine: { lineStyle: { color: '#1e3a5f' } },
        splitLine: { lineStyle: { color: '#1e3a5f' } },
        splitArea: { areaStyle: { color: ['rgba(0,212,255,0.02)', 'rgba(0,212,255,0.05)'] } },
        axisName: { color: '#94a3b8', fontSize: 9 },
      },
      series: [{
        type: 'radar',
        data: [{
          value: health.map((h) => h.score),
          areaStyle: { color: 'rgba(0,212,255,0.2)' },
          lineStyle: { color: '#00d4ff', width: 2 },
          itemStyle: { color: '#00d4ff' },
        }],
      }],
    });
  }, [health]);

  return (
    <div className="glass-panel bs-panel">
      <div className="bs-panel-title">资产健康度</div>
      <div ref={chartRef} style={{ width: '100%', height: 180 }} />
    </div>
  );
}

function AlertEventsPanel({ alerts }: { alerts: { time: string; level: string; msg: string }[] }) {
  return (
    <div className="glass-panel bs-panel bs-alert-panel">
      <div className="bs-panel-title">
        实时告警事件
        {alerts.filter((a) => a.level === 'critical').length > 0 && (
          <span className="alert-badge">{alerts.filter((a) => a.level === 'critical').length}</span>
        )}
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
