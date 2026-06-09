import type { AlgorithmMetrics } from '../../../shared/types';

interface Props {
  metrics: AlgorithmMetrics;
}

export default function MetricsGrid({ metrics }: Props) {
  return (
    <div className="algo-metrics-grid">
      <MetricCard
        label="剩余可用寿命"
        value={metrics.rul}
        unit="天"
        critical={metrics.rul < 5}
        warning={metrics.rul < 10}
      />
      <MetricCard
        label="退化速率"
        value={metrics.degradationRate}
        unit="ms/天"
        critical={metrics.degradationRate > 3}
        warning={metrics.degradationRate > 1.5}
      />
      <MetricCard
        label="健康评分"
        value={metrics.healthScore}
        unit="/100"
        critical={metrics.healthScore < 30}
        warning={metrics.healthScore < 60}
        inverse
      />
      <MetricCard
        label="约束损失"
        value={metrics.constraintLoss}
        unit="%"
        critical={metrics.constraintLoss > 30}
        warning={metrics.constraintLoss > 15}
      />
      <MetricCard
        label="迭代进度"
        value={metrics.iteration}
        unit={`/${metrics.maxIterations}`}
      />
      <MetricCard
        label="预测置信度"
        value={metrics.confidence}
        unit="%"
        good={metrics.confidence > 90}
      />
    </div>
  );
}

function MetricCard({ label, value, unit, critical, warning, good, inverse }: {
  label: string;
  value: number;
  unit: string;
  critical?: boolean;
  warning?: boolean;
  good?: boolean;
  inverse?: boolean;
}) {
  let colorClass = '';
  if (good) colorClass = 'metric-good';
  else if (critical) colorClass = 'metric-critical';
  else if (warning) colorClass = 'metric-warning';

  return (
    <div className={`algo-metric-card glass-panel ${colorClass}`}>
      <div className="algo-metric-label">{label}</div>
      <div className="algo-metric-value">
        <span className="algo-metric-number">{typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}</span>
        <span className="algo-metric-unit">{unit}</span>
      </div>
    </div>
  );
}
