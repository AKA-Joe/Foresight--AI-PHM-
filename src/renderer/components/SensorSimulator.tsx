import { useState } from 'react';

interface SensorParam {
  id: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  description: string;
}

const PARAMS: SensorParam[] = [
  { id: 'baselineDrift', name: '基线漂移', unit: 'ms', min: -5, max: 20, step: 0.5, defaultValue: 2.3, description: '模拟传感器长期漂移，正值表示动作时间逐步变长' },
  { id: 'noiseAmplitude', name: '噪声幅度', unit: 'ms', min: 0, max: 15, step: 0.1, defaultValue: 1.8, description: '测量噪声的标准差，越大数据越不稳定' },
  { id: 'degradationRate', name: '劣化速率', unit: 'ms/天', min: 0.1, max: 5.0, step: 0.1, defaultValue: 0.7, description: '气缸动作时间每日增加的速率' },
  { id: 'samplingInterval', name: '采样间隔', unit: '秒', min: 1, max: 60, step: 1, defaultValue: 5, description: '传感器数据的采样频率' },
  { id: 'anomalyThreshold', name: '异常阈值', unit: 'σ', min: 1.5, max: 5.0, step: 0.1, defaultValue: 3.0, description: '异常检测的σ阈值（标准差倍数）' },
  { id: 'loadFactor', name: '负载因子', unit: '%', min: 20, max: 150, step: 5, defaultValue: 75, description: '模拟生产负载水平，影响动作频率' },
];

interface SimulatorProps {
  onInject?: (params: Record<string, number>) => void;
}

export default function SensorSimulator({ onInject }: SimulatorProps) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    PARAMS.forEach((p) => { init[p.id] = p.defaultValue; });
    return init;
  });
  const [expanded, setExpanded] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const handleChange = (id: string, value: number) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleInject = () => {
    setSimulating(true);
    onInject?.(values);
    setTimeout(() => setSimulating(false), 1500);
  };

  const handleReset = () => {
    const reset: Record<string, number> = {};
    PARAMS.forEach((p) => { reset[p.id] = p.defaultValue; });
    setValues(reset);
  };

  return (
    <div className="sensor-simulator-panel" style={{
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-card)',
      overflow: 'hidden',
      marginTop: 'var(--space-4)',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', cursor: 'pointer',
          borderBottom: expanded ? '1px solid var(--border-color)' : 'none',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🕹️</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '0.03em' }}>
            传感器模拟器
          </span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 600 }}>
            拖拽调节
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {simulating && (
            <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
              正在注入模拟数据...
            </span>
          )}
          <span style={{
            fontSize: 12, color: 'var(--text-dimmed)', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s ease', fontWeight: 700,
          }}>
            ▼
          </span>
        </div>
      </div>

      {/* Sliders */}
      {expanded && (
        <div style={{ padding: '12px 16px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '10px', marginBottom: 14,
          }}>
            {PARAMS.map((param) => {
              const val = values[param.id];
              const pct = ((val - param.min) / (param.max - param.min)) * 100;
              const hue = 220 - (pct * 0.4); // blue->amber
              const barColor = `hsl(${hue}, 70%, 55%)`;

              return (
                <div key={param.id} style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-elevated)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{param.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: barColor }}>
                      {val}{param.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={val}
                    onChange={(e) => handleChange(param.id, parseFloat(e.target.value))}
                    style={{
                      width: '100%', height: 6, borderRadius: 3,
                      background: `linear-gradient(90deg, var(--accent-dim), ${barColor})`,
                      appearance: 'none', outline: 'none', cursor: 'pointer',
                      accentColor: barColor,
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-dimmed)' }}>{param.min}{param.unit}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-dimmed)' }}>{param.max}{param.unit}</span>
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-dimmed)', marginTop: 4, lineHeight: 1.4 }}>
                    {param.description}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={handleInject}
              disabled={simulating}
              style={{
                padding: '8px 24px', borderRadius: 'var(--radius-md)',
                border: 'none', background: 'var(--gradient-accent)',
                color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                opacity: simulating ? 0.5 : 1, transition: 'box-shadow 0.2s, transform 0.15s',
                boxShadow: simulating ? 'none' : '0 0 12px rgba(59,130,246,0.3)',
              }}
              onMouseEnter={(e) => { if (!simulating) { e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.5)'; e.currentTarget.style.transform = 'scale(1.03)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = simulating ? 'none' : '0 0 12px rgba(59,130,246,0.3)'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {simulating ? '注入中...' : '⚡ 注入模拟数据'}
            </button>
            <button
              onClick={handleReset}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)', background: 'transparent',
                color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ↺ 重置默认值
            </button>
            <span style={{ fontSize: 10, color: 'var(--text-dimmed)', flex: 1, textAlign: 'right' }}>
              拖动滑块调节传感器退化参数，点击注入将模拟数据送入预测引擎
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
