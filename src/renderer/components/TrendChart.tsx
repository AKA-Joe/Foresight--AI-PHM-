import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { DashboardSnapshot } from '../../shared/types';

interface Props {
  snapshot: DashboardSnapshot;
  selectedCylinderUid?: string;
  cylinders: DashboardSnapshot['cylinders'];
  records: DashboardSnapshot['records'];
}

export default function TrendChart({ snapshot, selectedCylinderUid, cylinders, records }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const targetUid = selectedCylinderUid ?? snapshot.selectedCylinderUid;
  const cylinder = cylinders.find((c) => c.uid === targetUid);

  useEffect(() => {
    if (!chartRef.current || !cylinder) return;
    const cRecords = records
      .filter((r) => r.cylinderUid === targetUid)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const times = cRecords.map((r) => {
      const d = new Date(r.timestamp);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    });
    const execution = cRecords.map((r) => r.executionTimeMs);
    const baseline = cRecords.length ? cRecords.map(() => cylinder.baselineMs) : [];
    const dynamic = cRecords.map((r) => r.dynamicUpperMs);
    const fixed = cRecords.length ? cRecords.map(() => cylinder.fixedThresholdMs) : [];

    const chart = echarts.init(chartRef.current);
    chart.setOption({
      tooltip: { trigger: 'axis', textStyle: { fontSize: 11 }, backgroundColor: '#1a2235', borderColor: '#1e3a5f' },
      legend: { textStyle: { color: '#94a3b8', fontSize: 11 }, bottom: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 3 },
      grid: { left: 50, right: 16, top: 12, bottom: 36 },
      xAxis: {
        type: 'category',
        data: times,
        axisLabel: { color: '#64748b', fontSize: 10, rotate: 30 },
        axisLine: { lineStyle: { color: '#1e3a5f' } },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '执行时间 (ms)',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(30,58,95,0.3)' } },
      },
      series: [
        {
          name: '执行时间',
          type: 'line',
          data: execution,
          smooth: true,
          symbol: 'circle',
          symbolSize: 3,
          lineStyle: { color: '#00d4ff', width: 1.5 },
          areaStyle: { color: 'rgba(0,212,255,0.08)' },
          itemStyle: {
            color: (params: { dataIndex: number }) => {
              const r = cRecords[params.dataIndex];
              if (!r) return '#00d4ff';
              if (r.executionTimeMs >= cylinder.fixedThresholdMs) return '#ef4444';
              if (r.executionTimeMs >= r.dynamicUpperMs) return '#f59e0b';
              return '#00d4ff';
            },
          },
        },
        {
          name: '基线',
          type: 'line',
          data: baseline,
          symbol: 'none',
          lineStyle: { color: '#22c55e', width: 1, type: 'dashed' },
        },
        {
          name: '动态阈值',
          type: 'line',
          data: dynamic,
          symbol: 'none',
          lineStyle: { color: '#f59e0b', width: 1, type: 'dotted' },
        },
        {
          name: '固定阈值',
          type: 'line',
          data: fixed,
          symbol: 'none',
          lineStyle: { color: '#ef4444', width: 1, type: 'dashed' },
        },
      ],
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      chart.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [cylinder, targetUid, records]);

  if (!cylinder) {
    return (
      <div className="chart-card wide">
        <div className="chart-title">⏱ 动作执行时间趋势</div>
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 13 }}>
          请选择气缸查看趋势
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card wide">
      <div className="chart-title">
        ⏱ 动作执行时间趋势 — {cylinder.name}（{cylinder.uid.slice(-10)}）
      </div>
      <div ref={chartRef} className="chart-container tall" />
    </div>
  );
}
