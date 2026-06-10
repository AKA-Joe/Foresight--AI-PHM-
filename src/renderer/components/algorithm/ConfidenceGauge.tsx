import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { AlgorithmMetrics } from '../../../shared/types';

interface Props {
  metrics: AlgorithmMetrics;
}

export default function ConfidenceGauge({ metrics }: Props) {
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
    if (!chart) return;

    chart.setOption({
      series: [
        {
          type: 'gauge',
          startAngle: 220,
          endAngle: -40,
          min: 0,
          max: 100,
          radius: '90%',
          progress: { show: true, width: 14 },
          axisLine: {
            lineStyle: {
              width: 14,
              color: [
                [0.3, '#ef4444'],
                [0.6, '#f59e0b'],
                [1, '#22c55e'],
              ],
            },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '55%',
            width: 6,
            offsetCenter: [0, '-10%'],
            itemStyle: { color: '#3b82f6' },
          },
          anchor: { show: true, size: 12, itemStyle: { color: '#3b82f6', borderWidth: 2, borderColor: '#0f2847' } },
          title: {
            show: true,
            offsetCenter: [0, '65%'],
            fontSize: 11,
            color: '#6b8ab5',
          },
          detail: {
            valueAnimation: true,
            fontSize: 24,
            fontWeight: 'bold',
            offsetCenter: [0, '35%'],
            formatter: '{value}%',
            color: metrics.confidence > 80 ? '#22c55e' : metrics.confidence > 50 ? '#f59e0b' : '#6b8ab5',
          },
          data: [{ value: metrics.confidence, name: '预测置信度' }],
        },
        {
          type: 'gauge',
          startAngle: 220,
          endAngle: -40,
          min: 0,
          max: 100,
          radius: '55%',
          center: ['50%', '50%'],
          progress: { show: true, width: 10 },
          axisLine: {
            lineStyle: {
              width: 10,
              color: [
                [0.5, '#22c55e'],
                [0.8, '#f59e0b'],
                [1, '#ef4444'],
              ],
            },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          pointer: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: true,
            fontSize: 12,
            offsetCenter: [0, 0],
            formatter: '故障 {value}%',
            color: metrics.faultProbability > 80 ? '#ef4444' : '#6b8ab5',
          },
          data: [{ value: metrics.faultProbability }],
        },
      ],
    });
  }, [metrics.confidence, metrics.faultProbability]);

  return (
    <div className="algo-gauge-card glass-panel">
      <div className="chart-title">置信度 & 故障概率</div>
      <div ref={chartRef} style={{ width: '100%', height: 220 }} />
    </div>
  );
}
