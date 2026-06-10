import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const FEATURES = ['频谱能量', '趋势斜率', '周期模式', '波动方差', '温度偏移', '压力相关'];
const TIME_STEPS = ['T-48h', 'T-36h', 'T-24h', 'T-18h', 'T-12h', 'T-8h', 'T-4h', 'T-0h'];

interface Props {
  weights: number[][];
  isRunning?: boolean;
}

function toHeatmapData(base: number[][], t?: number): [number, number, number][] {
  const data: [number, number, number][] = [];
  for (let r = 0; r < base.length; r++) {
    for (let c = 0; c < base[r].length; c++) {
      let val = base[r][c];
      if (t !== undefined) {
        const drift = Math.sin(r * 0.7 + c * 1.3 + t * 2.5) * 0.12 +
                      Math.cos(r * 1.1 - c * 0.9 + t * 1.8) * 0.08;
        val = Math.max(0, Math.min(1, val + drift));
      }
      data.push([c, r, parseFloat(val.toFixed(2))]);
    }
  }
  return data;
}

export default function AttentionHeatmap({ weights, isRunning }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    instanceRef.current = chart;

    chart.setOption({
      grid: { top: 8, right: 48, bottom: 24, left: 56 },
      xAxis: {
        type: 'category',
        data: FEATURES,
        axisLine: { lineStyle: { color: '#0f2847' } },
        axisLabel: { color: '#6b8ab5', fontSize: 9, rotate: 20 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: TIME_STEPS,
        axisLine: { lineStyle: { color: '#0f2847' } },
        axisLabel: { color: '#6b8ab5', fontSize: 9 },
        axisTick: { show: false },
      },
      visualMap: {
        min: 0,
        max: 1,
        show: false,
        inRange: {
          color: ['#0a1929', '#0d3b66', '#3b82f6', '#a5f3fc', '#ffffff'],
        },
      },
      series: [{
        type: 'heatmap',
        data: [],
        itemStyle: { borderWidth: 1, borderColor: 'rgba(10,25,41,0.6)' },
        emphasis: {
          itemStyle: { shadowBlur: 8, shadowColor: 'rgba(59,130,246,0.5)' },
        },
        animation: false,
      }],
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animFrameRef.current);
      chart.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart || weights.length === 0) return;

    cancelAnimationFrame(animFrameRef.current);
    startTimeRef.current = performance.now();

    if (isRunning) {
      let lastFrame = 0;
      const animate = (now: number) => {
        if (now - lastFrame < 50) {
          animFrameRef.current = requestAnimationFrame(animate);
          return;
        }
        lastFrame = now;
        const elapsed = (now - startTimeRef.current) / 1000;
        chart.setOption({ series: [{ data: toHeatmapData(weights, elapsed) }] });
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      chart.setOption({ series: [{ data: toHeatmapData(weights) }] });
    }

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [weights, isRunning]);

  if (weights.length === 0) return null;

  return (
    <div className="algo-attention-heatmap glass-panel">
      <div className="chart-title">注意力权重分布</div>
      <div ref={chartRef} style={{ width: '100%', height: 160 }} />
    </div>
  );
}
