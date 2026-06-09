import type { ActionTimeRecord, AlertRecord, CylinderAsset, MaintenanceRecord } from '../../shared/types';

const now = new Date('2026-06-09T10:00:00+08:00');

function isoHoursAgo(hours: number, minutes = 0) {
  return new Date(now.getTime() - (hours * 60 + minutes) * 60_000).toISOString();
}

function makeRecords(
  cylinder: Pick<CylinderAsset, 'uid' | 'deviceId' | 'actionType' | 'baselineMs' | 'fixedThresholdMs'>,
  pattern: 'normal' | 'drift' | 'critical' | 'volatile' | 'recovered' | 'dirty',
): ActionTimeRecord[] {
  return Array.from({ length: 36 }, (_, index) => {
    const age = 35 - index;
    const wave = Math.sin(index / 2.3) * 3;
    let executionTimeMs = cylinder.baselineMs + wave;
    let qualityFlag: ActionTimeRecord['qualityFlag'] = 'good';

    if (pattern === 'drift') {
      executionTimeMs = 235 + index * 0.8 + Math.max(0, index - 20) * 0.55 + wave;
    }
    if (pattern === 'critical') {
      executionTimeMs = index > 29 ? cylinder.fixedThresholdMs + 18 + (index - 29) * 3 : cylinder.baselineMs + wave + index * 0.4;
    }
    if (pattern === 'volatile') {
      executionTimeMs = cylinder.baselineMs + wave * 6 + (index % 6 === 0 ? 28 : 0);
    }
    if (pattern === 'recovered') {
      executionTimeMs = index < 17 ? cylinder.baselineMs + 28 - index * 0.5 + wave : cylinder.baselineMs + wave;
    }
    if (pattern === 'dirty') {
      qualityFlag = index % 7 === 0 ? 'dirty' : index % 5 === 0 ? 'suspect' : 'good';
      executionTimeMs = cylinder.baselineMs + wave + (qualityFlag === 'dirty' ? 55 : 0);
    }

    const dynamicUpperMs = cylinder.baselineMs + (pattern === 'volatile' ? 24 : 14) + Math.sin(index / 4) * 2;

    return {
      id: `${cylinder.uid}-${index}`,
      timestamp: isoHoursAgo(age),
      deviceId: cylinder.deviceId,
      cylinderUid: cylinder.uid,
      actionType: cylinder.actionType,
      executionTimeMs: Math.round(executionTimeMs),
      dynamicUpperMs: Math.round(dynamicUpperMs),
      baselineMs: cylinder.baselineMs,
      fixedThresholdMs: cylinder.fixedThresholdMs,
      qualityFlag,
    };
  });
}

export const cylinders: CylinderAsset[] = [
  {
    uid: 'CYL-CSKG-A01-ST01-CLAMP-R',
    deviceId: 'EQ-03-A1',
    deviceName: '装配一线夹爪专机',
    stationId: 'ST-01',
    lineId: 'LINE-A',
    name: '夹爪缩回气缸',
    actionType: 'retract',
    baselineMs: 230,
    fixedThresholdMs: 345,
    installDate: '2026-03-12',
    healthScore: 68,
    alertLevel: 'warning',
    faultProbability: 72,
  },
  {
    uid: 'CYL-CSKG-A01-ST02-PUSH-E',
    deviceId: 'EQ-03-A1',
    deviceName: '装配一线夹爪专机',
    stationId: 'ST-02',
    lineId: 'LINE-A',
    name: '推送伸出气缸',
    actionType: 'extend',
    baselineMs: 212,
    fixedThresholdMs: 318,
    installDate: '2026-04-05',
    healthScore: 93,
    alertLevel: 'normal',
    faultProbability: 18,
  },
  {
    uid: 'CYL-CSKG-A02-ST03-LIFT-R',
    deviceId: 'EQ-04-B2',
    deviceName: '压装二线升降机构',
    stationId: 'ST-03',
    lineId: 'LINE-B',
    name: '升降复位气缸',
    actionType: 'reset',
    baselineMs: 260,
    fixedThresholdMs: 390,
    installDate: '2026-02-18',
    healthScore: 41,
    alertLevel: 'critical',
    faultProbability: 91,
  },
  {
    uid: 'CYL-CSKG-B01-ST04-ROTATE',
    deviceId: 'EQ-05-C1',
    deviceName: '检测转台工位',
    stationId: 'ST-04',
    lineId: 'LINE-C',
    name: '旋转到位气缸',
    actionType: 'rotate',
    baselineMs: 310,
    fixedThresholdMs: 465,
    installDate: '2026-01-26',
    healthScore: 76,
    alertLevel: 'info',
    faultProbability: 43,
  },
  {
    uid: 'CYL-CSKG-B02-ST05-SEAL',
    deviceId: 'EQ-06-C2',
    deviceName: '封装测试专机',
    stationId: 'ST-05',
    lineId: 'LINE-C',
    name: '封口压紧气缸',
    actionType: 'extend',
    baselineMs: 245,
    fixedThresholdMs: 368,
    installDate: '2026-05-02',
    healthScore: 89,
    alertLevel: 'normal',
    faultProbability: 24,
  },
  {
    uid: 'CYL-CSKG-C01-ST06-FEED',
    deviceId: 'EQ-07-D1',
    deviceName: '自动上料单元',
    stationId: 'ST-06',
    lineId: 'LINE-D',
    name: '上料推出气缸',
    actionType: 'extend',
    baselineMs: 198,
    fixedThresholdMs: 297,
    installDate: '2026-04-22',
    healthScore: 82,
    alertLevel: 'info',
    faultProbability: 36,
  },
];

export const records: ActionTimeRecord[] = [
  ...makeRecords(cylinders[0], 'drift'),
  ...makeRecords(cylinders[1], 'normal'),
  ...makeRecords(cylinders[2], 'critical'),
  ...makeRecords(cylinders[3], 'volatile'),
  ...makeRecords(cylinders[4], 'recovered'),
  ...makeRecords(cylinders[5], 'dirty'),
];

export const alerts: AlertRecord[] = [
  {
    id: 'ALM-20260609-001',
    timestamp: isoHoursAgo(1, 10),
    level: 'warning',
    cylinderUid: 'CYL-CSKG-A01-ST01-CLAMP-R',
    deviceId: 'EQ-03-A1',
    title: '夹爪缩回动作执行时间持续爬升',
    reason: '最近12次动作连续超过动态阈值，24小时窗口斜率持续为正，符合趋势劣化预警条件。',
    suggestion: '安排计划检修，优先检查密封圈、导轨阻力、润滑状态与气源压力。',
    status: 'active',
  },
  {
    id: 'ALM-20260609-002',
    timestamp: isoHoursAgo(0, 30),
    level: 'critical',
    cylinderUid: 'CYL-CSKG-A02-ST03-LIFT-R',
    deviceId: 'EQ-04-B2',
    title: '升降复位气缸触发固定阈值保护',
    reason: '执行时间超过固定阈值上限，模拟故障概率达到91%。',
    suggestion: '建议立即停机检查，确认是否存在机械卡滞、气管泄漏或限位信号延迟。',
    status: 'active',
  },
  {
    id: 'ALM-20260609-003',
    timestamp: isoHoursAgo(3),
    level: 'info',
    cylinderUid: 'CYL-CSKG-B01-ST04-ROTATE',
    deviceId: 'EQ-05-C1',
    title: '旋转到位动作波动增大',
    reason: '执行时间出现多次短周期高波动，尚未形成连续劣化趋势。',
    suggestion: '关注后续趋势，建议班中点检传感器反馈稳定性。',
    status: 'acknowledged',
  },
  {
    id: 'ALM-20260609-004',
    timestamp: isoHoursAgo(5),
    level: 'info',
    cylinderUid: 'CYL-CSKG-C01-ST06-FEED',
    deviceId: 'EQ-07-D1',
    title: '上料推出气缸数据质量提醒',
    reason: '10分钟窗口内可疑与脏数据比例升高，可能影响趋势判断。',
    suggestion: '检查采集网关、PLC时间同步和动作完成信号。',
    status: 'active',
  },
];

export const maintenance: MaintenanceRecord[] = [
  {
    id: 'MNT-20260608-021',
    cylinderUid: 'CYL-CSKG-B02-ST05-SEAL',
    deviceId: 'EQ-06-C2',
    createdAt: '2026-06-08T08:30:00+08:00',
    completedAt: '2026-06-08T10:10:00+08:00',
    type: 'seal_replacement',
    result: '更换密封圈后动作执行时间恢复至基线附近，趋势劣化消失。',
    operator: '设备班-王工',
  },
  {
    id: 'MNT-20260609-004',
    cylinderUid: 'CYL-CSKG-A01-ST01-CLAMP-R',
    deviceId: 'EQ-03-A1',
    createdAt: '2026-06-09T09:15:00+08:00',
    type: 'inspection',
    result: '已生成计划检修任务，待周末换班窗口处理。',
    operator: '设备班-李工',
  },
  {
    id: 'MNT-20260609-008',
    cylinderUid: 'CYL-CSKG-A02-ST03-LIFT-R',
    deviceId: 'EQ-04-B2',
    createdAt: '2026-06-09T09:40:00+08:00',
    type: 'air_pressure_check',
    result: '紧急告警待处理，建议先确认气源压力和机械导向。',
    operator: '值班长-赵工',
  },
];
