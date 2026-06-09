import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { DashboardSnapshot } from '../../shared/types';

interface Props {
  snapshot: DashboardSnapshot;
}

export default function KpiCards({ snapshot }: Props) {
  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-label">监测气缸</div>
        <div className="kpi-value">{snapshot.kpis.totalCylinders}</div>
        <div className="kpi-sub">在线率 100%</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">平均健康评分</div>
        <div className="kpi-value" style={{ color: snapshot.kpis.averageHealthScore > 70 ? '#22c55e' : '#f59e0b' }}>
          {snapshot.kpis.averageHealthScore}/100
        </div>
        <div className="kpi-sub">
          预警 {snapshot.kpis.warningAlerts} · 紧急 {snapshot.kpis.criticalAlerts}
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">活跃告警</div>
        <div className="kpi-value warning">
          {snapshot.kpis.warningAlerts}
          <span style={{ fontSize: 14, color: '#64748b', fontWeight: 400 }}> 预警</span>
        </div>
        <div className="kpi-sub">
          提示 {snapshot.kpis.infoAlerts} · 紧急 {snapshot.kpis.criticalAlerts}
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">待处理维护</div>
        <div className="kpi-value critical">{snapshot.kpis.pendingMaintenance}</div>
        <div className="kpi-sub">项未完成</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">数据质量</div>
        <div className="kpi-value" style={{ color: snapshot.kpis.dataGoodRate > 90 ? '#22c55e' : '#f59e0b' }}>
          {snapshot.kpis.dataGoodRate}%
        </div>
        <div className="kpi-sub">良好率</div>
      </div>
    </div>
  );
}
