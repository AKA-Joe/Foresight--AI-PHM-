import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { MetricsSnapshot } from './useAlgorithmSimulation';

interface Props {
  history: MetricsSnapshot[];
}

export default function DegradationChart({ history }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    instanceRef.current = chart;
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, []);

  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart || history.length === 0) return;

    chart.setOption({
      grid: { top: 24, right: 48, bottom: 24, left: 48 },
      legend: {
        data: ['RUL', '健康评分'],
        top: 0,
        right: 0,
        textStyle: { color: '#6b8ab5', fontSize: 10 },
        itemWidth: 12,
        itemHeight: 2,
      },
      xAxis: {
        type: 'category',
        data: history.map((h) => h.iteration),
        axisLine: { lineStyle: { color: '#0f2847' } },
        axisLabel: { color: '#6b8ab5', fontSize: 9, interval: 'auto' },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: 'RUL (天)',
          min: 0,
          max: 50,
          nameTextStyle: { color: '#6b8ab5', fontSize: 9 },
          axisLine: { show: false },
          axisLabel: { color: '#6b8ab5', fontSize: 9 },
          splitLine: { lineStyle: { color: 'rgba(59,130,246,0.08)' } },
        },
        {
          type: 'value',
          name: '健康评分',
          min: 0,
          max: 100,
          nameTextStyle: { color: '#6b8ab5', fontSize: 9 },
          axisLine: { show: false },
          axisLabel: { color: '#6b8ab5', fontSize: 9 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'RUL',
          type: 'line',
          yAxisIndex: 0,
          data: history.map((h) => h.rul),
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#3b82f6', width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59,130,246,0.2)' },
              { offset: 1, color: 'rgba(59,130,246,0)' },
            ]),
          },
        },
        {
          name: '健康评分',
          type: 'line',
          yAxisIndex: 1,
          data: history.map((h) => h.healthScore),
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#8b5cf6', width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(139,92,246,0.2)' },
              { offset: 1, color: 'rgba(139,92,246,0)' },
            ]),
          },
        },
      ],
    });
  }, [history]);

  return (
    <div className="algo-degradation-chart glass-panel">
      <div className="chart-title">退化趋势</div>
      <div ref={chartRef} style={{ width: '100%', height: 220 }} />
    </div>
  );
}
