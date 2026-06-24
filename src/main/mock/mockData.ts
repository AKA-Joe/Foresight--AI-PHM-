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

// Generator: 75 cylinders across 5 lines, 15 stations (5-6 cylinders each)
function generateCylinders(): CylinderAsset[] {
  const lines = ['LINE-A', 'LINE-B', 'LINE-C', 'LINE-D', 'LINE-E'];
  const lineNames = ['装配一线', '压装二线', '检测封装线', '上料分拣线', '包装码垛线'];
  const stations: { id: string; name: string; line: string }[] = [
    { id: 'ST-01', name: '夹爪专机', line: 'LINE-A' }, { id: 'ST-02', name: '推送工位', line: 'LINE-A' }, { id: 'ST-03', name: '缓冲工位', line: 'LINE-A' },
    { id: 'ST-04', name: '压装机构', line: 'LINE-B' }, { id: 'ST-05', name: '冲压工位', line: 'LINE-B' }, { id: 'ST-06', name: '焊接工位', line: 'LINE-B' },
    { id: 'ST-07', name: '检测转台', line: 'LINE-C' }, { id: 'ST-08', name: '封装测试', line: 'LINE-C' }, { id: 'ST-09', name: '气密检测', line: 'LINE-C' },
    { id: 'ST-10', name: '上料单元', line: 'LINE-D' }, { id: 'ST-11', name: '分拣机械臂', line: 'LINE-D' }, { id: 'ST-12', name: '翻转工位', line: 'LINE-D' },
    { id: 'ST-13', name: '包装工位', line: 'LINE-E' }, { id: 'ST-14', name: '码垛机器人', line: 'LINE-E' }, { id: 'ST-15', name: 'AGV 接驳', line: 'LINE-E' },
  ];

  const actions = ['extend', 'retract', 'rotate', 'reset'] as const;
  const actionLabels: Record<string, string> = { extend: '伸出', retract: '缩回', rotate: '旋转', reset: '复位' };
  const stationFeature: Record<string, string[]> = {
    'ST-01': ['夹爪伸出', '夹爪缩回', '夹爪旋转', '定位锁紧', '定位松开'],
    'ST-02': ['推送伸出', '推送缩回', '缓冲', '导向', '定位'],
    'ST-03': ['缓冲伸出', '缓冲缩回', '导向', '压紧', '推料'],
    'ST-04': ['压装下压', '压装复位', '升降上升', '升降下降', '夹紧'],
    'ST-05': ['冲压主缸', '冲压复位', '退料', '顶出', '夹紧'],
    'ST-06': ['焊接夹紧', '焊接推进', '进给', '退刀', '吹气'],
    'ST-07': ['旋转到位', '旋转复位', '升降上升', '升降下降', '夹紧'],
    'ST-08': ['封口压紧', '封口复位', '压合', '检测顶升', '退料'],
    'ST-09': ['气密夹紧', '气密封堵', '测试升降', '吹干', '排料'],
    'ST-10': ['上料推出', '上料举升', '料仓顶升', '分料', '待料'],
    'ST-11': ['抓取伸出', '抓取缩回', '翻转正', '翻转反', '旋转定位'],
    'ST-12': ['翻转伸出', '翻转缩回', '定位', '夹紧', '推料'],
    'ST-13': ['压合下压', '压合复位', '封口', '贴标', '喷码'],
    'ST-14': ['伸缩伸出', '伸缩缩回', '旋转正', '旋转反', '举升'],
    'ST-15': ['举升上升', '举升下降', '对接伸出', '对接缩回', '锁定'],
  };

  const result: CylinderAsset[] = [];
  let idx = 0;

  for (const st of stations) {
    const lineIdx = lines.indexOf(st.line);
    const features = stationFeature[st.id] || ['执行'];
    const cylCount = features.length;

    for (let c = 0; c < cylCount; c++) {
      idx++;
      const uid = `CYL-CSKG-${st.id}-${idx.toString().padStart(3, '0')}`;
      const baseline = 150 + Math.floor(Math.random() * 200);
      const healthScore = Math.max(10, Math.min(100, Math.round(
        Math.random() < 0.08 ? 20 + Math.random() * 30 : // 8% critical
        Math.random() < 0.25 ? 40 + Math.random() * 30 : // 17% warning
        65 + Math.random() * 35                            // 75% normal
      )));
      const faultProb = Math.round((100 - healthScore) * (0.6 + Math.random() * 0.4));

      let alertLevel: 'normal' | 'info' | 'warning' | 'critical' = 'normal';
      if (healthScore < 30) alertLevel = 'critical';
      else if (healthScore < 50) alertLevel = 'warning';
      else if (healthScore < 65) alertLevel = 'info';

      const actionType = actions[idx % actions.length];
      result.push({
        uid, deviceId: `EQ-${lineIdx + 1}-${String(lineIdx * 10 + st.id.slice(-2))}`,
        deviceName: `${lineNames[lineIdx]}${st.name}`,
        stationId: st.id, lineId: st.line,
        name: `${features[c]}${actionLabels[actionType] || '动作'}缸`,
        actionType, baselineMs: baseline, fixedThresholdMs: Math.round(baseline * 1.5),
        installDate: `202${Math.floor(Math.random() * 6)}-${String(Math.floor(Math.random() * 12 + 1)).padStart(2, '0')}-${String(Math.floor(Math.random() * 28 + 1)).padStart(2, '0')}`,
        healthScore, alertLevel, faultProbability: faultProb,
      });
    }
  }
  return result;
}

export const cylinders: CylinderAsset[] = generateCylinders();

const PATTERNS: ('normal' | 'drift' | 'critical' | 'volatile' | 'recovered' | 'dirty')[] = ['normal', 'drift', 'critical', 'volatile', 'recovered', 'dirty'];
export const records: ActionTimeRecord[] = cylinders.flatMap((c, i) => makeRecords(c, PATTERNS[i % PATTERNS.length]));

// Generate alerts from cylinders with health issues
function isAlertLevel(l: string): l is 'info' | 'warning' | 'critical' { return l === 'info' || l === 'warning' || l === 'critical'; }
const alertable = cylinders.filter(c => isAlertLevel(c.alertLevel) && (c.alertLevel === 'critical' || c.alertLevel === 'warning' || Math.random() > 0.5));
export const alerts: AlertRecord[] = alertable.map((c, i): AlertRecord => {
    const times = [0.5, 1.5, 3, 4, 6, 8, 10, 12];
    const reasons: Record<string, string> = {
      critical: '执行时间持续超过固定阈值，设备处于高风险状态。建议立即停机处理。',
      warning: '最近连续动作超过动态上界，退化速率上升，符合趋势劣化预警条件。',
      info: '执行时间出现周期性波动，尚未形成持续劣化趋势，建议关注后续变化。',
    };
    const suggestions: Record<string, string> = {
      critical: '立即停机，检查机械卡滞、气管泄漏、限位信号及密封件状态。',
      warning: '安排计划检修，优先检查密封圈状态、导轨阻力与气源压力。',
      info: '加强日检频次至每班一次，关注趋势走向。',
    };
    return {
      id: `ALM-20260609-${String(i + 1).padStart(3, '0')}`,
      timestamp: isoHoursAgo(times[i % times.length], Math.floor(Math.random() * 30)),
      level: c.alertLevel as 'info' | 'warning' | 'critical',
      cylinderUid: c.uid, deviceId: c.deviceId,
      title: `${c.name}动作执行时间${c.alertLevel === 'critical' ? '触发阈值' : c.alertLevel === 'warning' ? '持续爬升' : '轻度波动'}`,
      reason: reasons[c.alertLevel] || '需检查设备状态。',
      suggestion: suggestions[c.alertLevel] || '建议安排计划维护。',
      status: c.alertLevel === 'critical' ? 'active' : c.alertLevel === 'warning' ? 'active' : Math.random() > 0.5 ? 'acknowledged' : 'active',
    };
  });

const maintenanceTypes = ['seal_replacement', 'inspection', 'air_pressure_check', 'lubrication'] as const;
const operators = ['设备班-王工', '设备班-张工', '设备班-李工', '值班长-赵工', '计划员-陈工', '设备班-刘工'];
const results = [
  '更换密封件后恢复正常，动作时间回到基线附近。', '检查完毕，建议持续观察趋势变化。', '气源压力正常，调整导轨间隙后偏差减小。',
  '润滑保养完成，运行平稳。', '传感器重新校准，数据质量恢复。',
];

export const maintenance: MaintenanceRecord[] = cylinders
  .filter((_, i) => i % 5 === 0 || cylinders[i].alertLevel === 'critical')
  .slice(0, 50)
  .map((c, i) => ({
    id: `MNT-202606${String(Math.floor(i / 5) + 8).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
    cylinderUid: c.uid, deviceId: c.deviceId,
    createdAt: isoHoursAgo(4 * i, Math.floor(Math.random() * 30)),
    completedAt: i % 3 === 0 ? isoHoursAgo(4 * i - 1, 30) : undefined,
    type: maintenanceTypes[i % maintenanceTypes.length],
    result: results[i % results.length],
    operator: operators[i % operators.length],
  }));
