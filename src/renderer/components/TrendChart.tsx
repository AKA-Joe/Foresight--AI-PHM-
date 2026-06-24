import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { DashboardSnapshot } from '../../shared/types';

interface Props {
  selectedCylinderUid?: string;
  cylinders: DashboardSnapshot['cylinders'];
  records: DashboardSnapshot['records'];
}

export default function TrendChart({ selectedCylinderUid, cylinders, records }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const targetUid = selectedCylinderUid;
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
    const baselineData = cRecords.length ? cRecords.map(() => cylinder.baselineMs) : [];
    const dynamic = cRecords.map((r) => r.dynamicUpperMs);
    const fixed = cRecords.length ? cRecords.map(() => cylinder.fixedThresholdMs) : [];

    // Confidence band: dynamic threshold ± 8ms
    const upperBand = dynamic.map((v) => v + 8);
    const lowerBand = dynamic.map((v) => v - 4);

    // Quality flags for x-axis indicator
    const qualities = cRecords.map((r) => r.qualityFlag);
    const qualityColors: Record<string, string> = { good: '#22c55e', suspect: '#f59e0b', dirty: '#ef4444' };

    // Anomaly markers: points where execution exceeds fixed threshold
    const markPointData = cRecords
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.executionTimeMs >= cylinder.fixedThresholdMs)
      .map(({ i }) => ({
        name: '超限',
        coord: [times[i], execution[i]],
        value: `${execution[i]}ms`,
      }));

    // Prediction: realistic degradation projection with acceleration + fanning uncertainty
    const predCount = 6;
    let predTimes: string[] = [];
    let predValues: number[] = [];
    let predUpper: number[] = [];
    let predLower: number[] = [];
    if (execution.length >= 8) {
      const last6 = execution.slice(-6);
      const last6Times = times.slice(-6);
      // Fit linear trend from last 6 points
      const n = last6.length;
      const xMean = (n - 1) / 2;
      const yMean = last6.reduce((a, b) => a + b, 0) / n;
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) { num += (i - xMean) * (last6[i] - yMean); den += (i - xMean) ** 2; }
      const slope = num / den;
      const intercept = yMean - slope * xMean;
      // Acceleration factor: degradation rate increases ~15% per step
      const accel = slope * 0.15;
      // Residual std dev for uncertainty fan-out
      const residuals = last6.map((v, i) => v - (intercept + slope * i));
      const rmse = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / n);

      const lastTimeIdx = parseInt(last6Times[n - 1].split(':')[0]) * 60 + parseInt(last6Times[n - 1].split(':')[1]);
      for (let p = 1; p <= predCount; p++) {
        const t = lastTimeIdx + p * 10;
        predTimes.push(`${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
        // Quadratic: base trend + acceleration
        const predVal = intercept + slope * (n - 1 + p) + accel * p * p;
        predValues.push(Math.round(predVal));
        // Uncertainty fans out with prediction horizon
        const fan = rmse * (1.5 + p * 0.8);
        predUpper.push(Math.round(predVal + fan));
        predLower.push(Math.round(predVal - fan * 0.6));
      }
    }

    // Pad all existing series with nulls to match extended xAxis
    const nullPad = new Array(predTimes.length).fill(null);
    const pad = (arr: number[]) => [...arr, ...nullPad];

    const chart = echarts.init(chartRef.current);
    chart.setOption({
      tooltip: {
        trigger: 'axis',
        textStyle: { fontSize: 12 },
        backgroundColor: 'rgba(8,20,40,0.95)',
        borderColor: '#1a3a5c',
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          let tip = `<b>${params[0].axisValue}</b><br/>`;
          for (const p of params) {
            if (p.value == null) continue;
            if (p.seriesName === '执行时间' || p.seriesName === '预测') {
              tip += `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:4px;"></span>${p.seriesName}: <b>${p.value} ms</b><br/>`;
            } else if (p.seriesName !== '上界' && p.seriesName !== '下界' && p.seriesName !== '质量条') {
              tip += `<span style="display:inline-block;width:12px;height:2px;background:${p.color};margin-right:4px;vertical-align:middle;"></span>${p.seriesName}: ${p.value} ms<br/>`;
            }
          }
          return tip;
        },
      },
      legend: {
        textStyle: { color: '#8aa8d0', fontSize: 11, fontWeight: 600 },
        bottom: 0,
        icon: 'roundRect',
        itemWidth: 16,
        itemHeight: 4,
        data: ['执行时间', '基线', '动态阈值', '固定阈值', '预测'],
      },
      grid: { left: 52, right: 24, top: 16, bottom: 60 },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
        {
          type: 'slider',
          bottom: 28,
          height: 16,
          borderColor: 'rgba(59,130,246,0.15)',
          backgroundColor: 'rgba(6,18,38,0.5)',
          dataBackground: {
            lineStyle: { color: 'rgba(59,130,246,0.2)' },
            areaStyle: { color: 'rgba(59,130,246,0.04)' },
          },
          selectedDataBackground: {
            lineStyle: { color: 'rgba(59,130,246,0.4)' },
            areaStyle: { color: 'rgba(59,130,246,0.08)' },
          },
          handleStyle: { color: '#3b82f6', borderColor: '#1d4ed8' },
          textStyle: { color: '#506a90', fontSize: 9 },
        },
      ],
      xAxis: {
        type: 'category',
        data: [...times, ...predTimes],
        axisLabel: { color: '#506a90', fontSize: 10 },
        axisLine: { lineStyle: { color: '#1a3a5c' } },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'ms',
        nameTextStyle: { color: '#506a90', fontSize: 10 },
        axisLabel: { color: '#506a90', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(59,130,246,0.08)' } },
      },
      series: [
        // Confidence band (upper/lower bound area)
        {
          name: '上界',
          type: 'line',
          data: pad(upperBand),
          symbol: 'none',
          lineStyle: { opacity: 0 },
          areaStyle: { color: 'rgba(59,130,246,0.04)' },
          stack: 'confidence',
          silent: true,
          legendHoverLink: false,
        },
        {
          name: '下界',
          type: 'line',
          data: lowerBand.map((v, i) => upperBand[i] - v),
          symbol: 'none',
          lineStyle: { opacity: 0 },
          areaStyle: { color: 'transparent' },
          stack: 'confidence',
          silent: true,
          legendHoverLink: false,
        },
        // Execution time
        {
          name: '执行时间',
          type: 'line',
          data: pad(execution),
          smooth: true,
          symbol: 'circle',
          symbolSize: (val: number, params: { dataIndex: number }) => {
            const r = cRecords[params.dataIndex];
            if (r && r.executionTimeMs >= cylinder.fixedThresholdMs) return 12;
            return 7;
          },
          lineStyle: { color: '#3b82f6', width: 3, shadowBlur: 10, shadowColor: 'rgba(59,130,246,0.5)' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59,130,246,0.2)' },
              { offset: 1, color: 'rgba(59,130,246,0.02)' },
            ]),
          },
          itemStyle: {
            borderColor: '#040d1a',
            borderWidth: 2,
            color: (params: { dataIndex: number }) => {
              const r = cRecords[params.dataIndex];
              if (!r) return '#3b82f6';
              if (r.executionTimeMs >= cylinder.fixedThresholdMs) return '#ef4444';
              if (r.executionTimeMs >= r.dynamicUpperMs) return '#f59e0b';
              return '#3b82f6';
            },
          },
          markPoint: markPointData.length > 0 ? {
            data: markPointData,
            symbol: 'pin',
            symbolSize: 24,
            itemStyle: { color: '#ef4444' },
            label: { show: true, fontSize: 9, color: '#fff', formatter: '{c}' },
          } : undefined,
          markArea: {
            silent: true,
            data: [[
              { yAxis: cylinder.fixedThresholdMs, itemStyle: { color: 'rgba(239,68,68,0.05)' } },
              { yAxis: 400 },
            ]],
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#ef4444', type: 'dashed', width: 1.5, opacity: 0.5 },
            data: [{ yAxis: cylinder.fixedThresholdMs, label: { show: true, formatter: '固定阈值 {c}ms', color: '#ef4444', fontSize: 9, position: 'end' } }],
          },
        },
        // Baseline
        {
          name: '基线',
          type: 'line',
          data: pad(baselineData),
          symbol: 'none',
          lineStyle: { color: '#22c55e', width: 2.5, type: 'dashed', opacity: 0.8 },
        },
        // Dynamic threshold
        {
          name: '动态阈值',
          type: 'line',
          data: pad(dynamic),
          symbol: 'none',
          lineStyle: { color: '#f59e0b', width: 2.5, type: 'dotted', opacity: 0.8 },
        },
        // Fixed threshold
        {
          name: '固定阈值',
          type: 'line',
          data: pad(fixed),
          symbol: 'none',
          lineStyle: { color: '#ef4444', width: 2, type: 'dashed', opacity: 0.5 },
        },
        // Prediction confidence band (fan-shaped area)
        ...(predTimes.length > 0 ? [{
          name: '预测上界',
          type: 'line' as const,
          data: [...Array(times.length).fill(null), ...predUpper],
          symbol: 'none',
          lineStyle: { opacity: 0 },
          areaStyle: { color: 'rgba(192,132,252,0.06)' },
          stack: 'pred-band',
          silent: true,
          legendHoverLink: false,
        },
        {
          name: '预测下界',
          type: 'line' as const,
          data: [...Array(times.length).fill(null), ...predLower.map((v, i) => predUpper[i] - v)],
          symbol: 'none',
          lineStyle: { opacity: 0 },
          areaStyle: { color: 'transparent' },
          stack: 'pred-band',
          silent: true,
          legendHoverLink: false,
        }] : []),
        // Prediction line — prominent dashed
        ...(predTimes.length > 0 ? [{
          name: '预测',
          type: 'line' as const,
          data: [...Array(times.length).fill(null), ...predValues],
          smooth: true,
          symbol: 'diamond',
          symbolSize: 8,
          connectNulls: true,
          lineStyle: { color: '#c084fc', width: 3, type: 'dashed' as const, opacity: 0.95 },
          itemStyle: { color: '#c084fc', borderColor: '#0a1628', borderWidth: 2 },
          legendHoverLink: true,
          // Divider line between actual and predicted
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#c084fc', type: 'dashed', width: 1, opacity: 0.5 },
            data: [{ xAxis: times[times.length - 1], label: { show: true, formatter: '← 实际 | 预测 →', color: '#c084fc', fontSize: 9, position: 'start' } }],
          },
        }] : []),
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
        <div className="chart-title">动作执行时间趋势</div>
        <span className="corner-tl" />
        <span className="corner-tr" />
        <span className="corner-bl" />
        <span className="corner-br" />
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#506a90', fontSize: 13 }}>
          请选择气缸查看趋势
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card wide">
      <div className="chart-title">
        动作执行时间趋势 — {cylinder.name}（{cylinder.uid.slice(-10)}）
      </div>
      <span className="corner-tl" />
      <span className="corner-tr" />
      <span className="corner-bl" />
      <span className="corner-br" />
      <div ref={chartRef} className="chart-container tall" />
    </div>
  );
}
