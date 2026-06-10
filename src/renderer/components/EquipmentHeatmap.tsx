import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { DashboardSnapshot } from '../../shared/types';

interface Props {
  snapshot: DashboardSnapshot;
}

function getBarColor(score: number): { start: string; end: string } {
  if (score > 70) return { start: '#10b981', end: '#34d399' };
  if (score > 40) return { start: '#f59e0b', end: '#fbbf24' };
  return { start: '#ef4444', end: '#f87171' };
}

export default function EquipmentHeatmap({ snapshot }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const sorted = [...snapshot.topRisks].sort((a, b) => a.healthScore - b.healthScore).slice(0, 8);

    const names = sorted.map((r) => r.name);
    const scores = sorted.map((r) => r.healthScore);

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'none' },
        textStyle: { fontSize: 11, color: '#c0d4e8' },
        backgroundColor: '#081428',
        borderColor: '#0f2847',
        formatter: (params: Array<{ name: string; value: number }>) => {
          const item = sorted.find((r) => r.name === params[0].name);
          if (!item) return `<b>${params[0].name}</b>: ${params[0].value}`;
          return `<b>${item.name}</b><br/>设备: ${item.deviceName}<br/>工位: ${item.stationId}<br/>健康评分: <b>${item.healthScore}</b>/100<br/>风险等级: ${item.alertLevel === 'critical' ? '紧急' : item.alertLevel === 'warning' ? '预警' : '正常'}`;
        },
      },
      grid: { left: 80, right: 50, top: 8, bottom: 8, containLabel: false },
      xAxis: {
        type: 'value',
        max: 100,
        show: false,
      },
      yAxis: {
        type: 'category',
        data: names,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#6b8ab5',
          fontSize: 11,
          width: 70,
          overflow: 'truncate',
        },
      },
      series: [
        {
          type: 'bar',
          data: scores.map((score, i) => {
            const color = getBarColor(score);
            return {
              value: score,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: color.start },
                  { offset: 1, color: color.end },
                ]),
                borderRadius: [0, 12, 12, 0],
              },
            };
          }),
          barWidth: 14,
          z: 2,
          label: {
            show: true,
            position: 'right',
            formatter: '{c}',
            color: '#c0d4e8',
            fontSize: 11,
            fontFamily: 'Orbitron, JetBrains Mono, monospace',
            fontWeight: 600,
          },
          showBackground: true,
          backgroundStyle: {
            color: 'rgba(59, 130, 246, 0.06)',
            borderRadius: [0, 12, 12, 0],
          },
        },
      ],
      animationDuration: 800,
      animationEasing: 'cubicOut',
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      chart.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [snapshot]);

  return (
    <div className="chart-card">
      <div className="chart-title">设备健康概览</div>
      <div ref={chartRef} className="chart-container" />
    </div>
  );
}
