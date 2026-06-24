import { useState } from 'react';

const BENCHMARKS = [
  { category: '气缸类 · 动作时间退化', device: '注塑机A-3#', deviceScore: 35, industryAvg: 52, upperLimit: 78, lowerLimit: 60 },
  { category: '旋转设备 · 振动频谱退化', device: '冲压机B-1#', deviceScore: 42, industryAvg: 58, upperLimit: 82, lowerLimit: 64 },
  { category: '液压系统 · 压力衰减退化', device: '液压机C-2#', deviceScore: 63, industryAvg: 71, upperLimit: 88, lowerLimit: 65 },
  { category: '传动机构 · 扭矩衰减退化', device: '传送带D-5#', deviceScore: 55, industryAvg: 60, upperLimit: 85, lowerLimit: 55 },
];

const EXTENSIONS = [
  { tag: '规划', icon: '📱', title: '移动端巡检 App', desc: 'React Native 构建，扫码查看设备健康状态，接收告警推送。离线本地缓存，网络恢复自动同步。', techs: ['React Native', '离线缓存', '扫码'] },
  { tag: '规划', icon: '🔗', title: '多源数据融合', desc: '融合 ERP 工单、设备知识库、供应商召回通知、环境温湿度，构建多维设备健康画像。', techs: ['ERP', '知识库', 'IoT 环境'] },
  { tag: '远期', icon: '🧬', title: '联邦学习协作', desc: '跨工厂数据不出厂，联合训练退化模型。参与方越多模型越精准，满足数据安全合规要求。', techs: ['隐私计算', '安全聚合'] },
  { tag: '远期', icon: '🌍', title: '多租户 SaaS', desc: '云端多企业租户隔离，独立设备模型与告警规则。开放 API 平台支持第三方 ISV 对接。', techs: ['租户隔离', 'API 开放'] },
];

function barColor(score: number): string {
  if (score > 70) return '#22c55e';
  if (score > 40) return '#f59e0b';
  return '#ef4444';
}

type SortMode = 'name' | 'score' | 'gap';

export default function IndustryBenchmarkPanel() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [industryFilter, setIndustryFilter] = useState<string>('all');

  const sorted = [...BENCHMARKS].sort((a, b) => {
    if (sortMode === 'score') return a.deviceScore - b.deviceScore;
    if (sortMode === 'gap') return (a.industryAvg - a.deviceScore) - (b.industryAvg - b.deviceScore);
    return a.category.localeCompare(b.category);
  });

  const filtered = industryFilter === 'all' ? sorted : sorted.filter(b => b.category.includes(industryFilter));
  const industryTags = ['all', '气缸', '旋转', '液压', '传动'];

  const handleCardClick = (device: string) => {
    if (compareMode) {
      setCompareIds(prev => prev.includes(device) ? prev.filter(d => d !== device) : prev.length < 2 ? [...prev, device] : [device]);
    } else {
      setSelectedDevice(selectedDevice === device ? null : device);
    }
  };

  return (
    <div style={{ padding: 'var(--space-5)', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.5px', background: 'linear-gradient(90deg, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 'var(--space-2)' }}>
          📊 行业健康基准库
        </h2>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          跨行业设备退化模式基准库，基于联邦学习聚合多源数据，为新设备提供冷启动基线参考。
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-elevated)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
        <span><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--level-normal)', display: 'inline-block', marginRight: 5, boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />已接入</span>
        <span style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-data)', fontSize: 14 }}>7,842</span>
        <span>条样本</span>
        <span style={{ color: 'var(--border-color)' }}>|</span>
        <span>覆盖 <span style={{ color: 'var(--accent)', fontWeight: 700 }}>6</span> 个行业</span>
        <span style={{ color: 'var(--border-color)' }}>|</span>
        <span>联邦节点 <span style={{ color: 'var(--accent)', fontWeight: 700 }}>12</span></span>
        <span style={{ color: 'var(--border-color)' }}>|</span>
        <span>冷启动时间 <span style={{ color: '#22c55e', fontWeight: 700 }}>↓62%</span></span>
      </div>

      {/* Filter and sort bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dimmed)', letterSpacing: '0.03em' }}>行业:</span>
        {industryTags.map(t => (
          <span key={t} onClick={() => setIndustryFilter(t)}
            style={{ padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: industryFilter === t ? 'var(--accent-dim)' : 'transparent', color: industryFilter === t ? 'var(--accent)' : 'var(--text-dimmed)', border: '1px solid ' + (industryFilter === t ? 'var(--accent)' : 'var(--border-color)') }}>
            {t === 'all' ? '全部' : t}
          </span>
        ))}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dimmed)', letterSpacing: '0.03em' }}>排序:</span>
        {(['name', 'score', 'gap'] as SortMode[]).map(s => (
          <span key={s} onClick={() => setSortMode(s)}
            style={{ padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: sortMode === s ? 'var(--accent-dim)' : 'transparent', color: sortMode === s ? 'var(--accent)' : 'var(--text-dimmed)', border: '1px solid ' + (sortMode === s ? 'var(--accent)' : 'var(--border-color)') }}>
            {s === 'name' ? '名称' : s === 'score' ? '健康分' : '偏差值'}
          </span>
        ))}
        <span onClick={() => { setCompareMode(!compareMode); setCompareIds([]); }}
          style={{ padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer', color: compareMode ? 'var(--accent)' : 'var(--text-dimmed)', border: '1px solid ' + (compareMode ? 'var(--accent)' : 'var(--border-color)'), background: compareMode ? 'var(--accent-dim)' : 'transparent' }}>
          {compareMode ? '退出对比' : '对比模式'}
        </span>
      </div>

      {compareMode && compareIds.length === 2 && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent-dim)', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <b>对比结果：</b>
          {(() => {
            const devA = BENCHMARKS.find(x => x.device === compareIds[0])!;
            const devB = BENCHMARKS.find(x => x.device === compareIds[1])!;
            const leader = devA.deviceScore > devB.deviceScore ? devA : devB;
            return `"${devA.device}" (${devA.deviceScore}) vs "${devB.device}" (${devB.deviceScore}) → ${leader.device} 领先 ${Math.abs(devA.deviceScore - devB.deviceScore)} 分`;
          })()}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginBottom: 20 }}>
        {filtered.map((bm) => {
          const sel = compareMode ? compareIds.includes(bm.device) : selectedDevice === bm.device;
          return (
            <div
              key={bm.category}
              onClick={() => handleCardClick(bm.device)}
              style={{ padding: 20, borderRadius: 'var(--radius-lg)', cursor: 'pointer', border: '1px solid ' + (sel ? 'var(--accent)' : 'var(--border-color)'), background: sel ? 'rgba(59,130,246,0.03)' : 'var(--bg-card)', transition: 'all 0.2s', boxShadow: compareMode && sel ? '0 0 0 2px var(--accent)' : 'none' }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 16, letterSpacing: '0.03em', paddingBottom: 12, borderBottom: '2px solid var(--border-color)' }}>
                {bm.category}基准
              </div>
              <BarRow label={bm.device} score={bm.deviceScore} color={barColor(bm.deviceScore)} bold />
              <BarRow label="行业同类均值" score={bm.industryAvg} color={barColor(bm.industryAvg)} />
              <div style={{ margin: '12px 0', height: 1, background: 'var(--border-color)', opacity: 0.5 }} />
              <BarRow label="健康基准线 上/下限" score={bm.upperLimit} color="#22c55e" />
              <BarRow label="" score={bm.lowerLimit} color="#3b82f6" />
              {sel && (
                <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 6, background: 'var(--bg-elevated)', fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>详细对标分析</div>
                  <p>当前退化速率: {(Math.random() * 0.8 + 0.2).toFixed(2)}ms/天 · 预计剩余寿命: {Math.round(Math.random() * 40 + 10)}天</p>
                  <p>行业排名: 低于均值 {(bm.industryAvg - bm.deviceScore).toFixed(0)}分 · 建议: {bm.deviceScore < bm.lowerLimit ? '立即检修' : bm.deviceScore < bm.industryAvg ? '加强监测' : '继续保持'}</p>
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-dimmed)', lineHeight: 1.5, padding: '6px 10px', borderRadius: 4, background: 'var(--bg-elevated)' }}>
                {bm.deviceScore < bm.lowerLimit ? <span>⚠️ <strong style={{ color: '#ef4444' }}>低于基准下限</strong>，需立即关注</span> : bm.deviceScore < bm.industryAvg ? <span>📉 低于行业均值 <strong style={{ color: '#f59e0b' }}>{bm.industryAvg - bm.deviceScore} 分</strong></span> : <span>✅ 优于行业均值 <strong style={{ color: '#22c55e' }}>{bm.deviceScore - bm.industryAvg} 分</strong></span>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 12, letterSpacing: '0.03em' }}>
          🚀 扩展功能路线图
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
          {EXTENSIONS.map((ext) => (
            <div key={ext.title} style={{ padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-elevated)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{ext.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{ext.title}</span>
                <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 3, background: ext.tag === '规划' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)', color: ext.tag === '规划' ? 'var(--accent)' : 'var(--accent-purple)', fontWeight: 600, marginLeft: 'auto' }}>{ext.tag}</span>
              </div>
              <p style={{ fontSize: 10, color: 'var(--text-dimmed)', lineHeight: 1.5, marginBottom: 8 }}>{ext.desc}</p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {ext.techs.map((t) => (<span key={t} style={{ fontSize: 8, padding: '1px 6px', borderRadius: 3, background: 'var(--bg-card)', color: 'var(--text-dimmed)', fontFamily: 'var(--font-mono)' }}>{t}</span>))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-elevated)', fontSize: 11, color: 'var(--text-dimmed)' }}>
        <span style={{ fontSize: 16, opacity: 0.7 }}>❄️</span>
        <span>新设备冷启动：基准库自动匹配同型号基线，冷启动时间从 30 天缩短至 11 天。</span>
        <span style={{ color: '#22c55e', fontWeight: 700, fontFamily: 'var(--font-data)', flexShrink: 0 }}>+12% 精度</span>
      </div>
    </div>
  );
}

function BarRow({ label, score, color, bold }: { label: string; score: number; color: string; bold?: boolean }) {
  const pct = Math.min(100, Math.max(5, score));
  return (
    <div style={{ marginBottom: label ? 8 : 0 }}>
      {label ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 11, fontWeight: bold ? 700 : 500, color: bold ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color }}>{score}</span>
        </div>
      ) : null}
      <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', borderRadius: 3, background: color, opacity: 0.85 }} />
      </div>
    </div>
  );
}
