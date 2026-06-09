import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { DashboardSnapshot } from '../../shared/types';

interface Props {
  snapshot: DashboardSnapshot;
}

export default function AlertDistributionChart({ snapshot }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    const total = snapshot.kpis.infoAlerts + snapshot.kpis.warningAlerts + snapshot.kpis.criticalAlerts;
    chart.setOption({
      tooltip: { trigger: 'item', textStyle: { fontSize: 11 }, backgroundColor: '#1a2235', borderColor: '#1e3a5f' },
      series: [
        {
          type: 'pie',
          radius: ['42%', '68%'],
          avoidLabelOverlap: false,
          label: { show: true, formatter: '{b}: {c}', color: '#94a3b8', fontSize: 11 },
          labelLine: { lineStyle: { color: '#1e3a5f' } },
          data: [
            { value: snapshot.kpis.infoAlerts, name: '提示', itemStyle: { color: '#3b82f6' } },
            { value: snapshot.kpis.warningAlerts, name: '预警', itemStyle: { color: '#f59e0b' } },
            { value: snapshot.kpis.criticalAlerts, name: '紧急', itemStyle: { color: '#ef4444' } },
          ],
        },
      ],
      graphic: total === 0
        ? undefined
        : {
            type: 'text',
            left: 'center',
            top: 'center',
            style: {
              text: `${total}`,
              fill: '#e2e8f0',
              fontSize: 22,
              fontWeight: 700,
            },
          },
    });
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      chart.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [snapshot.kpis]);

  return (
    <div className="chart-card">
      <div className="chart-title">告警等级分布</div>
      <div ref={chartRef} className="chart-container" />
    </div>
  );
}
