import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface ParamDef {
  key: string; label: string; unit: string; min: number; max: number; step: number; defaultValue: number;
}

const PARAMS: ParamDef[] = [
  { key: 'lineCount', label: '产线数量', unit: '条', min: 1, max: 20, step: 1, defaultValue: 3 },
  { key: 'devicePerLine', label: '每线关键设备', unit: '台', min: 3, max: 30, step: 1, defaultValue: 10 },
  { key: 'avgDowntimeHrYr', label: '年均非计划停机(单台)', unit: '小时', min: 8, max: 200, step: 2, defaultValue: 80 },
  { key: 'costPerDowntimeHr', label: '停机综合损失(每小时)', unit: '元', min: 200, max: 10000, step: 100, defaultValue: 2000 },
  { key: 'avgMaintenanceCostYr', label: '年均维修费(单台)', unit: '元', min: 500, max: 30000, step: 200, defaultValue: 5000 },
  { key: 'laborCount', label: '运维人员数', unit: '人', min: 1, max: 20, step: 1, defaultValue: 3 },
];

export default function ROICalculator() {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    PARAMS.forEach(p => { init[p.key] = p.defaultValue; });
    return init;
  });
  const chartRef = useRef<HTMLDivElement>(null);

  // Computed metrics
  const totalDevices = values.lineCount * values.devicePerLine;
  const totalDowntimeHrs = totalDevices * values.avgDowntimeHrYr;
  const currentDowntimeCost = totalDowntimeHrs * values.costPerDowntimeHr;
  const currentMaintenanceCost = totalDevices * values.avgMaintenanceCostYr;
  const currentLaborCost = values.laborCount * 120000; // 12万/年/人
  const currentTotalCost = currentDowntimeCost + currentMaintenanceCost + currentLaborCost;

  // Predicted savings (industry-verified conservative range)
  const predDowntimeReduction = 0.20; // 20% 减少非计划停机
  const predMaintenanceSaving = 0.15;  // 15% 减少维修费
  const predLaborSaving = 0.20;        // 20% 减少人力投入
  const predOEEGain = 0.03;            // 3% OEE 提升
  const oeeRevenueGain = totalDevices * values.costPerDowntimeHr * 80 * predOEEGain;

  const savedDowntime = currentDowntimeCost * predDowntimeReduction;
  const savedMaintenance = currentMaintenanceCost * predMaintenanceSaving;
  const savedLabor = currentLaborCost * predLaborSaving;
  const totalSaved = savedDowntime + savedMaintenance + savedLabor + oeeRevenueGain;

  // Platform cost — China Telecom enterprise pricing
  const platformLicenseYr = totalDevices * 8000;   // ¥8,000/台/年 软件许可（AI引擎+数字孪生+移动端）
  const implementationCost = totalDevices * 18000; // ¥18,000/台 一次性部署（边缘网关+传感器+PLC集成+调试）
  const supportFeeYr = totalDevices * 1200;        // ¥1,200/台/年 运维支持+模型迭代训练
  const firstYearCost = platformLicenseYr + implementationCost + supportFeeYr;
  const annualCostAfter = platformLicenseYr + supportFeeYr;
  const netSavingYr1 = totalSaved - firstYearCost;
  const netSavingYr2Plus = totalSaved - annualCostAfter;
  const paybackMonths = Math.ceil((firstYearCost / totalSaved) * 12);
  const roi3Yr = ((netSavingYr1 + netSavingYr2Plus * 2) / firstYearCost * 100);

  // Chart
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    const cumulative = [netSavingYr1, netSavingYr1 + netSavingYr2Plus, netSavingYr1 + netSavingYr2Plus * 2];
    chart.setOption({
      tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0].axisValue}<br/>累计净收益: <b>¥${(p[0].value / 10000).toFixed(1)}万</b>` },
      grid: { left: 60, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: ['第1年', '第2年', '第3年'], axisLabel: { color: '#6b8ab5' } },
      yAxis: {
        type: 'value', name: '万元', axisLabel: { color: '#6b8ab5', formatter: (v: number) => (v / 10000).toFixed(1) },
        splitLine: { lineStyle: { color: 'rgba(59,130,246,0.08)' } },
      },
      series: [
        {
          type: 'bar', name: '累计净收益', data: cumulative,
          barWidth: 40, itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: (p: any) => p.value >= 0
              ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#10b981' }])
              : new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#ef4444' }]),
          },
          label: { show: true, position: 'top', formatter: (p: any) => `¥${(p.value / 10000).toFixed(1)}万`, color: '#6b8ab5', fontSize: 11, fontWeight: 700 },
          markLine: {
            silent: true, symbol: 'none',
            lineStyle: { color: '#22c55e', type: 'dashed', width: 1.5 },
            data: [{ yAxis: 0, label: { formatter: '回本线', color: '#22c55e', fontSize: 9 } }],
          },
        },
      ],
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { chart.dispose(); window.removeEventListener('resize', onResize); };
  }, [netSavingYr1, netSavingYr2Plus]);

  return (
    <div style={{ padding: 'var(--space-5)', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={{
          fontSize: 20, fontWeight: 700, letterSpacing: '0.5px',
          background: 'linear-gradient(90deg, #3b82f6, #f59e0b)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8,
        }}>💰 ROI 客户价值计算器</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          根据客户产线规模和当前运维成本，自动测算预测性维护平台的年化节省和投资回报周期。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
        {/* Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4 }}>📐 产线参数</div>
          {PARAMS.map(p => {
            const pct = ((values[p.key] - p.min) / (p.max - p.min)) * 100;
            return (
              <div key={p.key} style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-elevated)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{p.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                    {p.key === 'costPerDowntimeHr' || p.key === 'avgMaintenanceCostYr'
                      ? `¥${values[p.key].toLocaleString()}`
                      : values[p.key]}{p.unit}
                  </span>
                </div>
                <input type="range" min={p.min} max={p.max} step={p.step} value={values[p.key]}
                  onChange={e => setValues(v => ({ ...v, [p.key]: parseFloat(e.target.value) }))}
                  style={{ width: '100%', height: 5, accentColor: '#3b82f6', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-dimmed)', marginTop: 2 }}>
                  <span>{p.min}{p.unit}</span><span>{p.max}{p.unit}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4 }}>📊 收益测算</div>

          {/* Current cost */}
          <div style={{
            padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.2)',
            background: 'rgba(239,68,68,0.04)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dimmed)', marginBottom: 4 }}>当前年度损失</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
              <div>停机损失: <b style={{ color: 'var(--level-critical)' }}>¥{(currentDowntimeCost / 10000).toFixed(1)}万</b></div>
              <div>维修费用: <b style={{ color: 'var(--level-warning)' }}>¥{(currentMaintenanceCost / 10000).toFixed(1)}万</b></div>
              <div>人力成本: <b style={{ color: 'var(--level-warning)' }}>¥{(currentLaborCost / 10000).toFixed(1)}万</b></div>
              <div>合计: <b style={{ color: 'var(--level-critical)', fontSize: 13 }}>¥{(currentTotalCost / 10000).toFixed(1)}万</b></div>
            </div>
          </div>

          {/* Savings */}
          <div style={{
            padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.2)',
            background: 'rgba(16,185,129,0.04)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dimmed)', marginBottom: 4 }}>部署明鉴平台后年化节省</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
              <div>减少停机: <b style={{ color: 'var(--level-normal)' }}>¥{(savedDowntime / 10000).toFixed(1)}万</b> <span style={{ fontSize: 9, color: 'var(--text-dimmed)' }}>(-20%)</span></div>
              <div>降低维修: <b style={{ color: 'var(--level-normal)' }}>¥{(savedMaintenance / 10000).toFixed(1)}万</b> <span style={{ fontSize: 9, color: 'var(--text-dimmed)' }}>(-15%)</span></div>
              <div>人力优化: <b style={{ color: 'var(--level-normal)' }}>¥{(savedLabor / 10000).toFixed(1)}万</b> <span style={{ fontSize: 9, color: 'var(--text-dimmed)' }}>(-20%)</span></div>
              <div>OEE提升: <b style={{ color: 'var(--accent)' }}>¥{(oeeRevenueGain / 10000).toFixed(1)}万</b> <span style={{ fontSize: 9, color: 'var(--text-dimmed)' }}>(+3%)</span></div>
            </div>
          </div>

          {/* Key metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <KPIBox label="年度净节省" value={`¥${(totalSaved / 10000).toFixed(1)}万`} color="#10b981" />
            <KPIBox label="投资回收期" value={`${paybackMonths > 24 ? '>24' : paybackMonths}个月`} color={paybackMonths <= 12 ? '#10b981' : '#f59e0b'} />
            <KPIBox label="3年ROI" value={`${roi3Yr.toFixed(0)}%`} color={roi3Yr > 100 ? '#10b981' : '#f59e0b'} />
          </div>

          {/* Chart */}
          <div style={{ padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>📈 累计净收益预测</div>
            <div ref={chartRef} style={{ height: 200 }} />
          </div>

          {/* Summary */}
          <div style={{
            padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
            background: 'var(--bg-elevated)', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6,
          }}>
            <b>💡 测算说明：</b>
            基于 {values.lineCount} 条产线 · {totalDevices} 台设备的输入参数，预计年节省 <b style={{ color: 'var(--level-normal)' }}>¥{(totalSaved / 10000).toFixed(1)} 万</b>，
            平台年度费用 ¥{(platformLicenseYr / 10000).toFixed(1)} 万，
            {paybackMonths <= 12 ? `首年即可回收投资，回收期仅 ${paybackMonths} 个月。` : `回收期约 ${paybackMonths} 个月。`}
            3 年累计回报率 <b style={{ color: roi3Yr > 100 ? 'var(--level-normal)' : 'var(--level-warning)' }}>{roi3Yr.toFixed(0)}%</b>。
          </div>
        </div>
      </div>
    </div>
  );
}

function KPIBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--text-dimmed)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontFamily: 'var(--font-data)', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
