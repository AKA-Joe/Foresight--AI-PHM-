import { useRef } from 'react';
import type { DashboardSnapshot } from '../../shared/types';

interface Props {
  snapshot: DashboardSnapshot;
}

export default function KpiCards({ snapshot }: Props) {
  const prevRef = useRef(snapshot.kpis);
  const prev = prevRef.current;

  const healthDelta = snapshot.kpis.averageHealthScore - prev.averageHealthScore;
  const qualityDelta = snapshot.kpis.dataGoodRate - prev.dataGoodRate;

  prevRef.current = snapshot.kpis;

  return (
    <div className="kpi-grid">
      <KpiCard
        label="监测气缸"
        value={snapshot.kpis.totalCylinders}
        sub="在线率 100%"
        level="normal"
        progress={100}
      />
      <KpiCard
        label="平均健康评分"
        value={`${snapshot.kpis.averageHealthScore}/100`}
        sub={`预警 ${snapshot.kpis.warningAlerts} · 紧急 ${snapshot.kpis.criticalAlerts}`}
        level={snapshot.kpis.averageHealthScore > 70 ? 'normal' : snapshot.kpis.averageHealthScore > 40 ? 'warning' : 'critical'}
        progress={snapshot.kpis.averageHealthScore}
        delta={healthDelta}
      />
      <KpiCard
        label="活跃告警"
        value={snapshot.kpis.warningAlerts}
        valueSuffix="预警"
        sub={`提示 ${snapshot.kpis.infoAlerts} · 紧急 ${snapshot.kpis.criticalAlerts}`}
        level="warning"
        progress={Math.min(snapshot.kpis.warningAlerts * 10, 100)}
      />
      <KpiCard
        label="待处理维护"
        value={snapshot.kpis.pendingMaintenance}
        sub="项未完成"
        level="critical"
        progress={Math.min(snapshot.kpis.pendingMaintenance * 20, 100)}
      />
      <KpiCard
        label="数据质量"
        value={`${snapshot.kpis.dataGoodRate}%`}
        sub="良好率"
        level={snapshot.kpis.dataGoodRate > 90 ? 'normal' : 'warning'}
        progress={snapshot.kpis.dataGoodRate}
        delta={qualityDelta}
      />
    </div>
  );
}

function KpiCard({ label, value, valueSuffix, sub, level, progress, delta }: {
  label: string;
  value: string | number;
  valueSuffix?: string;
  sub: string;
  level: 'normal' | 'warning' | 'critical';
  progress: number;
  delta?: number;
}) {
  return (
    <div className="kpi-card" style={{ '--kpi-progress': `${Math.min(progress, 100)}%` } as React.CSSProperties}>
      {/* Corner brackets */}
      <span className="kpi-card-corner tl" />
      <span className="kpi-card-corner tr" />
      <span className="kpi-card-corner bl" />
      <span className="kpi-card-corner br" />
      {/* Scan line on progress bar */}
      <span className="kpi-scan-line" />
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${level}`}>
        {value}
        {valueSuffix && <span className="kpi-value-suffix">{valueSuffix}</span>}
        {delta !== undefined && delta !== 0 && (
          <span className={`kpi-trend ${delta > 0 ? 'up' : 'down'}`}>
            {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}
