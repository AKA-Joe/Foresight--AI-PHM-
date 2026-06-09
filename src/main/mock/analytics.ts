import type {
  ActionTimeRecord,
  AlertLevel,
  DashboardKpis,
  DashboardSnapshot,
  RiskItem,
  StationHealth,
} from '../../shared/types';
import { alerts, cylinders, maintenance, records } from './mockData';

const levelWeight: Record<AlertLevel, number> = {
  normal: 4,
  info: 3,
  warning: 2,
  critical: 1,
};

function latestForCylinder(cylinderUid: string) {
  return records
    .filter((record) => record.cylinderUid === cylinderUid)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .at(-1);
}

function recentForCylinder(cylinderUid: string, count = 12): ActionTimeRecord[] {
  return records
    .filter((record) => record.cylinderUid === cylinderUid)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-count);
}

function buildKpis(): DashboardKpis {
  const totalCylinders = cylinders.length;
  const averageHealthScore = Math.round(
    cylinders.reduce((sum, cylinder) => sum + cylinder.healthScore, 0) / totalCylinders,
  );
  const activeAlerts = alerts.filter((alert) => alert.status !== 'closed');
  const qualityCounts = records.reduce(
    (acc, record) => {
      acc[record.qualityFlag] += 1;
      return acc;
    },
    { good: 0, suspect: 0, dirty: 0 },
  );

  return {
    totalCylinders,
    averageHealthScore,
    infoAlerts: activeAlerts.filter((alert) => alert.level === 'info').length,
    warningAlerts: activeAlerts.filter((alert) => alert.level === 'warning').length,
    criticalAlerts: activeAlerts.filter((alert) => alert.level === 'critical').length,
    pendingMaintenance: maintenance.filter((item) => !item.completedAt).length,
    dataGoodRate: Math.round((qualityCounts.good / records.length) * 100),
  };
}

function riskReason(cylinderUid: string, level: AlertLevel) {
  const relatedAlert = alerts.find((alert) => alert.cylinderUid === cylinderUid && alert.status !== 'closed');
  if (relatedAlert) return relatedAlert.reason;
  if (level === 'normal') return '动作执行时间稳定在基线附近，未发现持续漂移。';
  return '存在轻微波动，建议继续观察趋势。';
}

function buildTopRisks(): RiskItem[] {
  return cylinders
    .map((cylinder) => {
      const latest = latestForCylinder(cylinder.uid);
      return {
        cylinderUid: cylinder.uid,
        deviceId: cylinder.deviceId,
        deviceName: cylinder.deviceName,
        stationId: cylinder.stationId,
        name: cylinder.name,
        healthScore: cylinder.healthScore,
        alertLevel: cylinder.alertLevel,
        faultProbability: cylinder.faultProbability,
        latestExecutionTimeMs: latest?.executionTimeMs ?? cylinder.baselineMs,
        baselineMs: cylinder.baselineMs,
        dynamicUpperMs: latest?.dynamicUpperMs ?? cylinder.baselineMs + 14,
        fixedThresholdMs: cylinder.fixedThresholdMs,
        reason: riskReason(cylinder.uid, cylinder.alertLevel),
      };
    })
    .sort((a, b) => a.healthScore - b.healthScore)
    .slice(0, 6);
}

function buildStationHealth(): StationHealth[] {
  return cylinders.map((cylinder) => ({
    stationId: cylinder.stationId,
    deviceId: cylinder.deviceId,
    healthScore: cylinder.healthScore,
    alertLevel: cylinder.alertLevel,
  }));
}

export function getDashboardSnapshot(selectedCylinderUid?: string): DashboardSnapshot {
  const topRisks = buildTopRisks();
  return {
    generatedAt: new Date().toISOString(),
    cylinders: [...cylinders].sort((a, b) => levelWeight[a.alertLevel] - levelWeight[b.alertLevel]),
    records,
    alerts,
    maintenance,
    kpis: buildKpis(),
    topRisks,
    stationHealth: buildStationHealth(),
    selectedCylinderUid: selectedCylinderUid ?? topRisks[0]?.cylinderUid ?? cylinders[0].uid,
  };
}

export function getCompactContext(selectedCylinderUid?: string) {
  const snapshot = getDashboardSnapshot(selectedCylinderUid);
  const selected = snapshot.cylinders.find((item) => item.uid === snapshot.selectedCylinderUid);

  return {
    generatedAt: snapshot.generatedAt,
    kpis: snapshot.kpis,
    selectedCylinder: selected
      ? {
          ...selected,
          recentRecords: recentForCylinder(selected.uid, 12),
        }
      : undefined,
    topRisks: snapshot.topRisks,
    activeAlerts: snapshot.alerts.filter((alert) => alert.status !== 'closed'),
    recentMaintenance: snapshot.maintenance.slice(0, 6),
    note: '以上为演示系统 mock 数据，未连接真实生产设备、数据库或 PLC。',
  };
}
