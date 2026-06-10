import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { DashboardSnapshot } from '../../shared/types';

interface Props {
  snapshot: DashboardSnapshot;
  onSelect?: (uid: string) => void;
}

export default function RiskRankingChart({ snapshot, onSelect }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || snapshot.topRisks.length === 0) return;
    const chart = echarts.init(chartRef.current);
    const sorted = [...snapshot.topRisks].sort((a, b) => a.healthScore - b.healthScore);
    chart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        textStyle: { fontSize: 11 },
        backgroundColor: '#081428',
        borderColor: '#0f2847',
        formatter: (params: { name: string; value: number; dataIndex: number }[]) => {
          const item = sorted[params[0].dataIndex];
          return `<div style="font-size:12px">
            <b>${item.name}</b><br/>
            健康评分: ${item.healthScore}/100<br/>
            风险等级: ${item.alertLevel}<br/>
            故障概率: ${item.faultProbability}%</div>`;
        },
      },
      grid: { left: 8, right: 46, top: 8, bottom: 8 },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: sorted.map((r) => r.name),
        axisLabel: { color: '#6b8ab5', fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: sorted.map((r) => ({
            value: r.healthScore,
            itemStyle: {
              color: r.alertLevel === 'critical' ? '#ef4444' : r.alertLevel === 'warning' ? '#f59e0b' : r.alertLevel === 'info' ? '#3b82f6' : '#22c55e',
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barWidth: 14,
          label: {
            show: true,
            position: 'right',
            formatter: (params: { value: number }) => `${params.value}`,
            color: '#6b8ab5',
            fontSize: 10,
          },
        },
      ],
    });
    chart.on('click', (params: { dataIndex: number }) => {
      if (onSelect) onSelect(sorted[params.dataIndex].cylinderUid);
    });
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      chart.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [snapshot.topRisks, onSelect]);

  return (
    <div className="chart-card">
      <div className="chart-title">高风险气缸排行</div>
      <div ref={chartRef} className="chart-container" />
    </div>
  );
}
