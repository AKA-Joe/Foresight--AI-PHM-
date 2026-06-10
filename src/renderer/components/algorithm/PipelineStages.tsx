import type { ReactNode } from 'react';
import type { AlgorithmPhase } from '../../../shared/types';

const STAGES: { key: AlgorithmPhase; label: string; icon: ReactNode }[] = [
  {
    key: 'feature_extraction',
    label: '多尺度时序特征提取',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
  {
    key: 'attention_encoding',
    label: '分层时间注意力编码',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8l2.8-2.8M17 7l2.8-2.8"/></svg>,
  },
  {
    key: 'physics_constraint',
    label: '物理约束正则化网络',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  },
  {
    key: 'conformal_prediction',
    label: '保形概率退化预测',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  },
  {
    key: 'decision_fusion',
    label: '自适应阈值决策融合',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  },
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

        const connectorClass = idx < STAGES.length - 1
          ? `stage-connector ${status === 'done' ? 'connector-done' : ''} ${status === 'active' ? 'connector-active' : ''}`
          : '';

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
            {idx < STAGES.length - 1 && <div className={connectorClass} />}
          </div>
        );
      })}
    </div>
  );
}
