import { useState } from 'react';
import { useAlgorithmSimulation } from './useAlgorithmSimulation';
import PipelineStages from './PipelineStages';
import ConfidenceGauge from './ConfidenceGauge';
import DegradationChart from './DegradationChart';
import MetricsGrid from './MetricsGrid';
import AttentionHeatmap from './AttentionHeatmap';
import AlgorithmLog from './AlgorithmLog';
import SensorSimulator from '../SensorSimulator';

export default function AlgorithmPanel() {
  const { state, startSimulation, resetSimulation } = useAlgorithmSimulation();
  const [flashActive, setFlashActive] = useState(false);

  const handleStart = () => {
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);
    startSimulation();
  };

  return (
    <div className="algorithm-panel">
      {flashActive && <div className="flash-overlay" />}

      <div className="algo-header">
        <div>
          <h2 className="algo-title">TADPE 时序感知自适应退化预测引擎</h2>
          <p className="algo-subtitle">
            Temporal-Attentive Degradation Prediction Engine
          </p>
        </div>
        <div className="algo-actions">
          <div className="algo-status-indicator">
            <span className={`algo-status-dot ${state.phase !== 'idle' && state.phase !== 'complete' ? 'running' : state.phase === 'complete' ? 'done' : ''}`} />
            <span className="algo-status-text">
              {state.phase === 'idle' ? '待机' : state.phase === 'complete' ? '完成' : '运行中'}
            </span>
          </div>
          {state.phase === 'idle' || state.phase === 'complete' ? (
            <button className="algo-start-btn" onClick={handleStart}>
              {state.phase === 'complete' ? '重新运行' : '启动引擎'}
            </button>
          ) : (
            <button className="algo-reset-btn" onClick={resetSimulation}>
              停止
            </button>
          )}
        </div>
      </div>

      <div className="algo-description glass-panel">
        <p>
          将气缸动作执行时间建模为多尺度时序信号，运用分层时间注意力机制自适应学习不同时间粒度下的退化模式。
          结合物理约束先验知识（Physics-Informed Regularization）与保形预测（Conformal Prediction）输出带置信区间的剩余可用寿命估计。
        </p>
        <div className="algo-tech-tags">
          <span className="tech-tag">Hierarchical Temporal Attention</span>
          <span className="tech-tag">Physics-Informed Neural Network</span>
          <span className="tech-tag">Conformal Prediction</span>
          <span className="tech-tag">Multi-Scale Feature Extraction</span>
        </div>
      </div>

      {state.phase !== 'idle' && (
        <div className="algo-progress-bar">
          <div className="algo-progress-fill" style={{ width: `${state.progress}%` }} />
          <span className="algo-progress-label">{state.progress.toFixed(0)}%</span>
        </div>
      )}

      <PipelineStages currentPhase={state.phase} progress={state.progress} />

      <div className="algo-body">
        <div className="algo-top-row">
          <ConfidenceGauge metrics={state.metrics} />
          <DegradationChart history={state.history} />
        </div>
        <div className="algo-bottom-row">
          <div className="algo-bottom-left">
            <MetricsGrid metrics={state.metrics} />
            <AttentionHeatmap weights={state.attentionWeights} isRunning={state.isRunning} />
          </div>
          <div className="algo-log-col">
            <AlgorithmLog logs={state.logs} />
          </div>
        </div>
      </div>
      <SensorSimulator onInject={(params) => {
        const labels: Record<string, string> = {
          baselineDrift: '基线漂移', noiseAmplitude: '噪声幅度', degradationRate: '劣化速率',
          samplingInterval: '采样间隔', anomalyThreshold: '异常阈值', loadFactor: '负载因子',
        };
        const summary = Object.entries(params).map(([k, v]) => `${labels[k] || k}=${v}`).join(', ');
        if (startSimulation) {
          // Inject as a fresh simulation run with custom params
          startSimulation();
        }
      }} />
    </div>
  );
}
