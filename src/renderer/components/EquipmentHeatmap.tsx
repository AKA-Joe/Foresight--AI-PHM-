import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { DashboardSnapshot } from '../../shared/types';

interface Props {
  snapshot: DashboardSnapshot;
}

export default function EquipmentHeatmap({ snapshot }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const stationMap = new Map<string, { scores: number[]; count: number }>();
    snapshot.stationHealth.forEach((sh) => {
      const entry = stationMap.get(sh.stationId) || { scores: [], count: 0 };
      entry.scores.push(sh.healthScore);
      entry.count += 1;
      stationMap.set(sh.stationId, entry);
    });

    const sorted = [...snapshot.topRisks].sort((a, b) => a.healthScore - b.healthScore).slice(0, 8);

    chart.setOption({
      tooltip: {
        trigger: 'item',
        textStyle: { fontSize: 11 },
        backgroundColor: '#1a2235',
        borderColor: '#1e3a5f',
        formatter: (params: { name: string; value: string }) => {
          const item = sorted.find((r) => r.name === params.name);
          if (!item) return `<b>${params.name}</b><br/>${params.value}`;
          return `<b>${item.name}</b><br/>设备: ${item.deviceName}<br/>工位: ${item.stationId}<br/>健康评分: ${item.healthScore}<br/>风险等级: ${item.alertLevel}`;
        },
      },
      grid: { left: 8, right: 8, top: 8, bottom: 8 },
      xAxis: { show: false },
      yAxis: { show: false },
      series: [
        {
          type: 'treemap',
          width: '100%',
          height: '100%',
          roam: false,
          nodeClick: false,
          data: sorted.map((r) => ({
            name: r.name,
            value: r.healthScore,
            itemStyle: {
              color: r.alertLevel === 'critical' ? '#ef4444' : r.alertLevel === 'warning' ? '#f59e0b' : r.alertLevel === 'info' ? '#3b82f6' : '#22c55e',
            },
          })),
          label: {
            show: true,
            formatter: (params: { name: string; value: string }) => `${params.name}\n${params.value}分`,
            color: '#e2e8f0',
            fontSize: 11,
          },
          upperLabel: { show: false },
          breadcrumb: { show: false },
          levels: [
            { colorSaturation: [0.3, 0.6], itemStyle: { borderColor: '#0a0f1e', borderWidth: 2, gapWidth: 2 } },
          ],
        },
      ],
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
