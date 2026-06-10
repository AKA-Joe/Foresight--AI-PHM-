import { useState, useCallback, useRef } from 'react';
import type { AlgorithmPhase, AlgorithmMetrics } from '../../../shared/types';

export interface MetricsSnapshot {
  iteration: number;
  rul: number;
  healthScore: number;
  degradationRate: number;
  confidence: number;
  faultProbability: number;
}

export interface SimulationState {
  phase: AlgorithmPhase;
  metrics: AlgorithmMetrics;
  logs: string[];
  progress: number;
  isRunning: boolean;
  history: MetricsSnapshot[];
  attentionWeights: number[][];
}

const INITIAL_METRICS: AlgorithmMetrics = {
  rul: 0,
  faultProbability: 0,
  degradationRate: 0,
  confidence: 0,
  healthScore: 0,
  constraintLoss: 38,
  iteration: 0,
  maxIterations: 2048,
};

const PHASES: { key: AlgorithmPhase; duration: number; label: string }[] = [
  { key: 'feature_extraction', duration: 3000, label: '多尺度时序特征提取' },
  { key: 'attention_encoding', duration: 3000, label: '分层时间注意力编码' },
  { key: 'physics_constraint', duration: 2500, label: '物理约束正则化网络' },
  { key: 'conformal_prediction', duration: 3000, label: '保形概率退化预测' },
  { key: 'decision_fusion', duration: 2500, label: '自适应阈值决策融合' },
];

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function timestamp() {
  const d = new Date();
  return `[${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}]`;
}

const LOG_TEMPLATES: Record<string, string[]> = {
  feature_extraction: [
    '初始化 3 路多尺度滤波器组（1min / 1hr / 24hr）...',
    '加载气缸动作时序数据 2,847 条记录...',
    '1min 窗口特征提取完成，检测到 17 个微波动事件',
    '1hr 窗口特征提取完成，趋势斜率 +0.23 ms/hr',
    '24hr 窗口特征提取完成，周期性模式匹配度 94.2%',
    '频谱能量分布计算完成，主频 0.017 Hz（≈60s 周期）',
  ],
  attention_encoding: [
    '构建分层时间注意力矩阵 [L=6, H=8, d_k=64]...',
    'Layer 1-2 编码局部退化模式，注意力聚焦最近 72hr',
    'Layer 3-4 捕获周期性维护效果衰减曲线',
    'Layer 5-6 全局退化趋势建模，关键窗口权重 0.847',
    '注意力权重热力图生成完毕，峰值时段 T-48hr ~ T-12hr',
  ],
  physics_constraint: [
    '加载物理约束先验：磨损单调性、气压-时间耦合...',
    '正则化损失 L_phy 初始值 38.2%',
    '约束迭代 128/512，L_phy 降至 22.7%',
    '约束迭代 384/512，L_phy 降至 9.3%',
    '物理一致性验证通过，最终 L_phy = 5.8%',
  ],
  conformal_prediction: [
    '启动保形预测校准集（500 样本无替换抽样）...',
    '非一致性得分分位数计算：α=0.05, q̂=1.73',
    '置信区间构建：RUL ∈ [7.2, 18.4] 天 (95% CI)',
    '退化扇形预测展开，T+24hr 宽度 ±3.2ms',
    '预测校准完成，覆盖率验证 96.1% ≥ 目标 95%',
  ],
  decision_fusion: [
    '多信号融合决策矩阵构建...',
    '维护紧迫度评分：0.73（中高）',
    '最优维护窗口推荐：未来 5-8 天内',
    '生成维护建议：检查密封圈磨损 + 气源压力校准',
    '决策融合完成，输出分级：预警（黄色）',
  ],
};

export function useAlgorithmSimulation() {
  const [state, setState] = useState<SimulationState>({
    phase: 'idle',
    metrics: INITIAL_METRICS,
    logs: [],
    progress: 0,
    isRunning: false,
    history: [],
    attentionWeights: generateAttentionWeights(-1),
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  }, []);

  const startSimulation = useCallback(() => {
    clearTimers();
    setState({
      phase: 'feature_extraction',
      metrics: INITIAL_METRICS,
      logs: [`${timestamp()} TADPE 引擎启动 — 时序感知自适应退化预测`],
      progress: 0,
      isRunning: true,
      history: [],
      attentionWeights: generateAttentionWeights(0),
    });

    let cumulativeDelay = 0;
    let tickCounter = 0;

    PHASES.forEach((phaseInfo, phaseIdx) => {
      const phaseStart = cumulativeDelay;
      const phaseDuration = phaseInfo.duration;
      const logs = LOG_TEMPLATES[phaseInfo.key] || [];

      const tid1 = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          phase: phaseInfo.key,
          logs: [...prev.logs, `${timestamp()} ▶ 阶段 ${phaseIdx + 1}/5：${phaseInfo.label}`],
          attentionWeights: generateAttentionWeights(phaseIdx),
        }));
      }, phaseStart);
      timeoutRefs.current.push(tid1);

      logs.forEach((log, logIdx) => {
        const logDelay = phaseStart + ((logIdx + 1) / (logs.length + 1)) * phaseDuration;
        const tid = setTimeout(() => {
          setState((prev) => ({
            ...prev,
            logs: [...prev.logs, `${timestamp()} ${log}`],
          }));
        }, logDelay);
        timeoutRefs.current.push(tid);
      });

      const TICK_INTERVAL = 80;
      const ticks = Math.floor(phaseDuration / TICK_INTERVAL);
      for (let tick = 0; tick <= ticks; tick++) {
        const tickDelay = phaseStart + tick * TICK_INTERVAL;
        const localT = tick / ticks;
        const globalT = (phaseIdx + localT) / PHASES.length;
        const currentTickCounter = tickCounter++;

        const tid = setTimeout(() => {
          const metrics = computeMetrics(phaseIdx, localT, globalT);
          setState((prev) => {
            const next: SimulationState = { ...prev, progress: globalT * 100, metrics };
            if (currentTickCounter % 3 === 0) {
              next.history = [...prev.history, {
                iteration: Math.round(lerp(0, 2048, globalT)),
                rul: metrics.rul,
                healthScore: metrics.healthScore,
                degradationRate: metrics.degradationRate,
                confidence: metrics.confidence,
                faultProbability: metrics.faultProbability,
              }];
            }
            return next;
          });
        }, tickDelay);
        timeoutRefs.current.push(tid);
      }

      cumulativeDelay += phaseDuration;
    });

    const completeTid = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        phase: 'complete',
        progress: 100,
        isRunning: false,
        logs: [...prev.logs, `${timestamp()} ✓ TADPE 引擎运行完毕 — 总耗时 ${(cumulativeDelay / 1000).toFixed(1)}s`],
        metrics: {
          rul: 12,
          faultProbability: 67,
          degradationRate: 1.8,
          confidence: 96.1,
          healthScore: 43,
          constraintLoss: 5.8,
          iteration: 2048,
          maxIterations: 2048,
        },
      }));
    }, cumulativeDelay + 200);
    timeoutRefs.current.push(completeTid);
  }, [clearTimers]);

  const resetSimulation = useCallback(() => {
    clearTimers();
    setState({
      phase: 'idle',
      metrics: INITIAL_METRICS,
      logs: [],
      progress: 0,
      isRunning: false,
      history: [],
      attentionWeights: generateAttentionWeights(-1),
    });
  }, [clearTimers]);

  return { state, startSimulation, resetSimulation };
}

function computeMetrics(phaseIdx: number, localT: number, globalT: number): AlgorithmMetrics {
  const t = easeInOutCubic(globalT);
  return {
    rul: Math.round(lerp(45, 12, t)),
    faultProbability: Math.round(lerp(2, 67, t)),
    degradationRate: parseFloat(lerp(0.2, 1.8, t).toFixed(1)),
    confidence: parseFloat(lerp(0, 96.1, t).toFixed(1)),
    healthScore: Math.round(lerp(98, 43, t)),
    constraintLoss: parseFloat(lerp(38, 5.8, phaseIdx >= 2 ? easeInOutCubic((phaseIdx - 2 + localT) / 3) : 0).toFixed(1)),
    iteration: Math.round(lerp(0, 2048, t)),
    maxIterations: 2048,
  };
}

function generateAttentionWeights(phaseIdx: number): number[][] {
  const rows = 8;
  const cols = 6;
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const diagonal = Math.exp(-Math.abs(r - c) * 0.4) * 0.7;
      const phaseShift = Math.sin((r + c + phaseIdx * 2) * 0.5) * 0.15;
      const noise = (Math.random() - 0.5) * 0.2;
      return Math.max(0, Math.min(1, diagonal + phaseShift + noise + phaseIdx * 0.05));
    })
  );
}
