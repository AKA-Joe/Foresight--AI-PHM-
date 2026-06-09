import type { AlgorithmPhase } from '../../../shared/types';

const STAGES: { key: AlgorithmPhase; label: string; icon: string }[] = [
  { key: 'feature_extraction', label: '多尺度时序特征提取', icon: '📈' },
  { key: 'attention_encoding', label: '分层时间注意力编码', icon: '🔥' },
  { key: 'physics_constraint', label: '物理约束正则化网络', icon: '📦' },
  { key: 'conformal_prediction', label: '保形概率退化预测', icon: '📐' },
  { key: 'decision_fusion', label: '自适应阈值决策融合', icon: '🚦' },
];

interface Props {
  currentPhase: AlgorithmPhase;
  progress: number;
}

export default function PipelineStages({ currentPhase, progress }: Props) {
  const phaseIndex = STAGES.findIndex((s) => s.key === currentPhase);
  const isComplete = currentPhase === 'complete';

  return (
    <div className="pipeline-stages">
      {STAGES.map((stage, idx) => {
        let status: 'pending' | 'active' | 'done' = 'pending';
        if (isComplete || idx < phaseIndex) status = 'done';
        else if (idx === phaseIndex) status = 'active';

        return (
          <div key={stage.key} className={`pipeline-stage stage-${status}`}>
            <div className="stage-indicator">
              {status === 'done' ? (
                <span className="stage-check">✓</span>
              ) : (
                <span className="stage-number">{idx + 1}</span>
              )}
            </div>
            <div className="stage-content">
              <span className="stage-icon">{stage.icon}</span>
              <span className="stage-label">{stage.label}</span>
            </div>
            {idx < STAGES.length - 1 && <div className={`stage-connector ${status === 'done' ? 'connector-done' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}
