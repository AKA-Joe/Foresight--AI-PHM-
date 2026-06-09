import { useState, useEffect, useRef } from 'react';

interface RealtimeData {
  traffic: number[];
  alerts: { time: string; level: string; msg: string }[];
  health: { name: string; score: number }[];
  stats: { label: string; value: number; unit: string }[];
}

const HEALTH_DIMS = ['网络连通性', '传感器可用率', '边缘计算负载', '数据质量', '气缸健康度', '告警闭环率'];

const ALERT_MESSAGES = [
  { level: 'critical', msg: 'CYL-0817 动作超固定阈值 320ms' },
  { level: 'warning', msg: 'CYL-0423 连续 8 次超动态上界' },
  { level: 'info', msg: '边缘节点 MEC-03 响应延迟 +12ms' },
  { level: 'warning', msg: 'CYL-0612 退化速率升至 2.1ms/天' },
  { level: 'critical', msg: '5G 链路 Link-07 丢包率 3.2%' },
  { level: 'info', msg: 'CYL-0315 完成预防性维护，恢复正常' },
  { level: 'warning', msg: '工位 WS-04 整体健康评分降至 62' },
  { level: 'info', msg: '新传感器 S-2847 注册成功' },
];

function randomWalk(arr: number[], min: number, max: number): number[] {
  const last = arr[arr.length - 1] || 50;
  const next = Math.max(min, Math.min(max, last + (Math.random() - 0.48) * 8));
  return [...arr.slice(1), Math.round(next * 10) / 10];
}

function timeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export function useMockRealtimeData(): RealtimeData {
  const [data, setData] = useState<RealtimeData>(() => ({
    traffic: Array.from({ length: 30 }, () => Math.round(Math.random() * 40 + 30)),
    alerts: ALERT_MESSAGES.slice(0, 5).map((a) => ({ ...a, time: timeStr() })),
    health: HEALTH_DIMS.map((name) => ({ name, score: Math.round(Math.random() * 30 + 65) })),
    stats: [
      { label: '在线设备', value: 127, unit: '台' },
      { label: '5G 基站', value: 8, unit: '个' },
      { label: '数据吞吐', value: 2.4, unit: 'GB/min' },
      { label: '平均延迟', value: 4.7, unit: 'ms' },
    ],
  }));

  const tickRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current++;
      setData((prev) => {
        const newAlert = ALERT_MESSAGES[tickRef.current % ALERT_MESSAGES.length];
        return {
          traffic: randomWalk(prev.traffic, 20, 95),
          alerts: [{ ...newAlert, time: timeStr() }, ...prev.alerts.slice(0, 7)],
          health: prev.health.map((h) => ({
            ...h,
            score: Math.max(30, Math.min(100, h.score + Math.round((Math.random() - 0.45) * 5))),
          })),
          stats: prev.stats.map((s) => {
            if (s.label === '数据吞吐') return { ...s, value: parseFloat((s.value + (Math.random() - 0.5) * 0.3).toFixed(1)) };
            if (s.label === '平均延迟') return { ...s, value: parseFloat(Math.max(1, s.value + (Math.random() - 0.5) * 1.2).toFixed(1)) };
            return s;
          }),
        };
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return data;
}
