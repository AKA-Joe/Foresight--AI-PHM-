import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { DashboardSnapshot } from '../../shared/types';

interface Props {
  snapshot: DashboardSnapshot;
  selectedCylinderUid?: string;
}

interface CauseItem {
  cause: string;
  confidence: number;
  color: string;
}

interface DiagnosisReport {
  id: string;
  time: string;
  cylinderName: string;
  healthScore: number;
  faultProbability: number;
  level: 'critical' | 'warning' | 'info' | 'normal';
  causes: CauseItem[];
  recommendation: string;
  status: 'pending' | 'acknowledged' | 'resolved';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
}

function toDiagLevel(l: string): 'critical' | 'warning' | 'info' | 'normal' {
  if (l === 'critical' || l === 'warning' || l === 'info' || l === 'normal') return l;
  return 'normal';
}

function generateDiagnosis(snapshot: DashboardSnapshot, cylinderUid?: string): DiagnosisReport | null {
  const risk = cylinderUid
    ? snapshot.topRisks.find((r) => r.cylinderUid === cylinderUid)
    : snapshot.topRisks.sort((a, b) => a.healthScore - b.healthScore)[0];
  if (!risk) return null;

  const deviationPct = risk.baselineMs > 0
    ? ((risk.latestExecutionTimeMs - risk.baselineMs) / risk.baselineMs) * 100
    : 0;
  const causes: CauseItem[] = [];
  if (deviationPct > 15) {
    causes.push({ cause: '气源压力波动', confidence: Math.min(99, 60 + Math.floor(deviationPct * 1.5)), color: '#ef4444' });
    causes.push({ cause: '密封圈老化磨损', confidence: Math.min(85, 40 + Math.floor(deviationPct * 1.2)), color: '#f59e0b' });
    causes.push({ cause: '气缸内部润滑不足', confidence: Math.min(70, 30 + Math.floor(deviationPct * 1.0)), color: '#3b82f6' });
  } else if (deviationPct > 8) {
    causes.push({ cause: '负载波动导致的执行延迟', confidence: 50 + Math.floor(deviationPct * 2), color: '#f59e0b' });
    causes.push({ cause: '温度变化影响气动特性', confidence: 40 + Math.floor(deviationPct * 2), color: '#3b82f6' });
  } else {
    causes.push({ cause: '正常工况范围内的微小波动', confidence: 85, color: '#22c55e' });
    causes.push({ cause: '传感器精度漂移', confidence: 25, color: '#3b82f6' });
  }
  const recs: Record<string, string> = {
    critical: '建议24小时内安排停机检查，重点排查气源稳定性、密封件状态及润滑状况。',
    warning: '建议纳入近期点检计划（3-5日内），持续关注执行时间变化趋势。',
    info: '当前风险可控，建议按常规周期进行预防性检查。',
  };
  return {
    id: `DIAG-${Date.now().toString(36).toUpperCase()}`,
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    cylinderName: risk.name,
    healthScore: risk.healthScore,
    faultProbability: risk.faultProbability,
    level: toDiagLevel(risk.alertLevel),
    causes,
    recommendation: recs[risk.alertLevel] || recs.info,
    status: 'pending',
  };
}

function generateHistoryReports(snapshot: DashboardSnapshot): DiagnosisReport[] {
  return snapshot.topRisks.slice(0, 8).map((risk) => {
    const causes: CauseItem[] = [
      { cause: '执行时间趋势异常', confidence: 70 + Math.floor(Math.random() * 25), color: '#f59e0b' },
      { cause: '历史数据对比超标', confidence: 55 + Math.floor(Math.random() * 30), color: '#3b82f6' },
    ];
    return {
      id: `DIAG-${(Date.now() - Math.floor(Math.random() * 86400000 * 14)).toString(36).toUpperCase()}`,
      time: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 14)).toLocaleDateString('zh-CN'),
      cylinderName: risk.name,
      healthScore: risk.healthScore,
      faultProbability: risk.faultProbability,
      level: toDiagLevel(risk.alertLevel),
      causes,
      recommendation: risk.alertLevel === 'critical'
        ? '建议立即检查气源系统，安排预防性更换。'
        : risk.alertLevel === 'warning'
          ? '建议纳入下一周期点检计划，持续跟踪。'
          : '暂无风险，建议定期检查。',
      status: (['pending', 'acknowledged', 'resolved'] as const)[Math.floor(Math.random() * 3)],
    };
  });
}

// Simulated LLM responses
const NLP_RESPONSES: Record<string, string> = {
  '为什么.*风险高': '根据TADPE算法分析，该气缸执行时间偏离基线{dev}%，主要归因于：\n1. 气源压力波动（置信度{conf}%）\n2. 密封件磨损导致的泄漏\n\n建议优先排查气源管路。',
  '什么.*建议': '针对当前状态，建议采取以下措施：\n1. 立即检查气源压力稳定性\n2. 对气缸进行润滑保养\n3. 如持续恶化，安排预防性更换\n\n预计剩余安全运行时间约72小时。',
  '趋势.*如何': '从最近30天数据来看，该气缸执行时间呈持续上升趋势（斜率+{slope}ms/天），已连续{day}天超出阈值上限。波动幅度从15ms增至45ms，表明劣化正在加速。',
  'RUL|剩余寿命': '基于Weibull退化模型预测：\n· 当前健康评分：{health}/100\n· 预计剩余寿命：约{hours}小时\n· 置信区间：[48h, 96h]\n· 建议在48小时内安排维护窗口。',
  '阈值': '当前气缸的动态阈值由TADPE算法自动计算：\n· 阈值上限：{upper}ms（当前值{current}ms）\n· 阈值下限：{lower}ms\n· 偏离程度：{dev}%\n\n连续{day}天超出阈值上限，建议调整预警级别。',
};

function getNlpResponse(input: string, snapshot: DashboardSnapshot, selectedCylinderUid?: string): string {
  const risk = selectedCylinderUid
    ? snapshot.topRisks.find((r) => r.cylinderUid === selectedCylinderUid)
    : snapshot.topRisks[0];
  if (!risk) return '未找到对应气缸数据，请先选择气缸。';

  const dev = risk.baselineMs > 0 ? ((risk.latestExecutionTimeMs - risk.baselineMs) / risk.baselineMs * 100).toFixed(1) : '5.2';
  const upper = Math.round(risk.baselineMs * 1.15);
  const lower = Math.round(risk.baselineMs * 0.8);
  const slope = (Math.random() * 6 + 4).toFixed(1);
  const day = risk.alertLevel === 'critical' ? 5 : 2;
  const hours = Math.round(60 + Math.random() * 60);
  const conf = Math.min(99, 60 + Math.floor(Number(dev) * 1.5));

  if (/为什么|原因/.test(input)) return NLP_RESPONSES['为什么.*风险高'].replace('{dev}', dev).replace('{conf}', String(conf));
  if (/建议|怎么办/.test(input)) return NLP_RESPONSES['什么.*建议'];
  if (/趋势|走向/.test(input)) return NLP_RESPONSES['趋势.*如何'].replace('{slope}', slope).replace('{day}', String(day));
  if (/RUL|剩余|寿命/.test(input)) return NLP_RESPONSES['RUL|剩余寿命'].replace('{health}', String(risk.healthScore)).replace('{hours}', String(hours));
  if (/阈值|上限|下限/.test(input)) return NLP_RESPONSES['阈值'].replace('{upper}', String(upper)).replace('{current}', String(risk.latestExecutionTimeMs)).replace('{lower}', String(lower)).replace('{dev}', dev).replace('{day}', String(day));

  return `根据TADPE预测引擎分析，气缸 ${risk.name} 当前健康评分${risk.healthScore}/100，故障概率${risk.faultProbability}%。\n\n主要风险因素：执行时间偏离基线${dev}%。\n\n建议关注气源压力和密封件状态。您可以进一步询问：\n· "为什么风险这么高？"\n· "有什么维护建议？"\n· "趋势如何？"\n· "RUL预测是多少？"\n· "阈值情况？"`;
}

export default function AiDiagnosisPanel({ snapshot, selectedCylinderUid }: Props) {
  const [analysisMode, setAnalysisMode] = useState<'auto' | 'nlp'>('auto');
  const [searchText, setSearchText] = useState('');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [reportStatuses, setReportStatuses] = useState<Record<string, 'pending' | 'acknowledged' | 'resolved'>>({});
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentDiagnosis = useMemo(
    () => generateDiagnosis(snapshot, selectedCylinderUid),
    [snapshot, selectedCylinderUid],
  );
  const historyReports = useMemo(() => generateHistoryReports(snapshot), [snapshot]);

  const allCylinders = useMemo(() => {
    return snapshot.topRisks
      .filter((r) => !searchText || r.name.toLowerCase().includes(searchText.toLowerCase()) || r.deviceName.toLowerCase().includes(searchText.toLowerCase()))
      .slice(0, 10);
  }, [snapshot.topRisks, searchText]);

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isTyping]);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleRegenerate = useCallback(() => {
    setIsGenerating(true);
    showToast('正在重新运行 TADPE 分析...', 'info');
    setTimeout(() => {
      setIsGenerating(false);
      showToast('诊断报告已刷新', 'success');
    }, 1500);
  }, [showToast]);

  const handleAcknowledge = useCallback((reportId: string) => {
    setReportStatuses((prev) => ({ ...prev, [reportId]: 'acknowledged' }));
    showToast('报告已确认', 'success');
  }, [showToast]);

  const handleResolve = useCallback((reportId: string) => {
    setReportStatuses((prev) => ({ ...prev, [reportId]: 'resolved' }));
    showToast('报告已标记为处理完成', 'success');
  }, [showToast]);

  const handleDispatchWorkOrder = useCallback(() => {
    showToast('工单已派发至维护班组', 'success');
    // Also switch to workorder tab via a custom event
    window.dispatchEvent(new CustomEvent('switchPanel', { detail: 'workorder' }));
  }, [showToast]);

  const handleExportHTML = useCallback(() => {
    if (!currentDiagnosis) return;
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>AI诊断报告 - ${currentDiagnosis.id}</title>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a1628; color: #e0eaf5; padding: 40px; }
  h1 { color: #60a5fa; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; }
  .meta { color: #6b8ab5; font-size: 13px; margin-bottom: 24px; }
  .card { background: #0f2140; border: 1px solid rgba(59,130,246,0.2); border-radius: 10px; padding: 20px; margin-bottom: 16px; }
  .card h2 { color: #e0eaf5; font-size: 16px; margin: 0 0 12px; }
  .metric { display: inline-block; text-align: center; padding: 12px 20px; margin: 8px; background: #081428; border-radius: 8px; }
  .metric .value { font-size: 28px; font-weight: 800; font-family: 'JetBrains Mono', monospace; }
  .metric .label { font-size: 11px; color: #6b8ab5; }
  .cause { display: flex; align-items: center; gap: 10px; padding: 8px 12px; margin: 4px 0; background: #081428; border-radius: 6px; border-left: 3px solid; }
  .rec { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: 8px; padding: 14px; }
  .bar { height: 4px; border-radius: 2px; background: rgba(59,130,246,0.1); overflow: hidden; width: 80px; display: inline-block; }
  .bar-fill { height: 100%; border-radius: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { text-align: left; color: #6b8ab5; font-size: 11px; padding: 6px 10px; border-bottom: 1px solid rgba(59,130,246,0.1); }
  td { padding: 6px 10px; font-size: 12px; border-bottom: 1px solid rgba(59,130,246,0.05); }
</style></head>
<body>
  <h1>🧠 明鉴——AI+设备预测性维护平台 · AI诊断报告</h1>
  <div class="meta">报告编号: ${currentDiagnosis.id} | 生成时间: ${currentDiagnosis.time} | 目标气缸: ${currentDiagnosis.cylinderName}</div>
  <div class="card"><h2>核心指标</h2>
    <div class="metric"><div class="label">健康评分</div><div class="value" style="color:${currentDiagnosis.healthScore > 50 ? '#22c55e' : currentDiagnosis.healthScore > 35 ? '#f59e0b' : '#ef4444'}">${currentDiagnosis.healthScore}</div></div>
    <div class="metric"><div class="label">故障概率</div><div class="value" style="color:${currentDiagnosis.faultProbability > 50 ? '#ef4444' : '#f59e0b'}">${currentDiagnosis.faultProbability}%</div></div>
  </div>
  <div class="card"><h2>故障原因分析</h2>
    ${currentDiagnosis.causes.map((c) => `
    <div class="cause" style="border-left-color: ${c.color}">
      <span style="flex:1;font-size:13px;color:#e0eaf5">${c.cause}</span>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="bar"><div class="bar-fill" style="width:${c.confidence}%;background:${c.color}"></div></div>
        <span style="font-size:11px;color:${c.color};font-weight:700">${c.confidence}%</span>
      </div>
    </div>`).join('')}
  </div>
  <div class="card"><h2>推荐处置</h2><div class="rec"><p style="color:#d0dae8;font-size:13px;line-height:1.7">${currentDiagnosis.recommendation}</p></div></div>
  <div class="card"><h2>历史趋势对比</h2>
    <table>
      <tr><th>气缸</th><th>健康评分</th><th>故障概率</th><th>等级</th><th>建议</th></tr>
      ${historyReports.slice(0, 5).map((r) => `
      <tr>
        <td style="color:#e0eaf5">${r.cylinderName}</td>
        <td style="color:${r.healthScore > 50 ? '#22c55e' : '#f59e0b'}">${r.healthScore}</td>
        <td>${r.faultProbability}%</td>
        <td>${r.level === 'critical' ? '🔴 紧急' : r.level === 'warning' ? '🟡 预警' : '🔵 提示'}</td>
        <td style="font-size:11px;color:#6b8ab5">${r.recommendation.slice(0, 30)}...</td>
      </tr>`).join('')}
    </table>
  </div>
  <p style="color:#506a90;font-size:10px;text-align:center;margin-top:30px">报告由明鉴——AI+设备预测性维护平台 TADPE预测引擎自动生成</p>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI诊断报告_${currentDiagnosis.id}_${currentDiagnosis.cylinderName}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('HTML 报告已下载', 'success');
  }, [currentDiagnosis, historyReports, showToast]);

  const handleExportCSV = useCallback(() => {
    if (!currentDiagnosis) return;
    const rows = [
      ['报告编号', '时间', '气缸', '健康评分', '故障概率', '等级', '原因1', '置信度1', '原因2', '置信度2', '建议'],
      [currentDiagnosis.id, currentDiagnosis.time, currentDiagnosis.cylinderName, currentDiagnosis.healthScore, currentDiagnosis.faultProbability + '%', currentDiagnosis.level, currentDiagnosis.causes[0]?.cause || '', currentDiagnosis.causes[0]?.confidence + '%' || '', currentDiagnosis.causes[1]?.cause || '', currentDiagnosis.causes[1]?.confidence + '%' || '', currentDiagnosis.recommendation.replace(/,/g, '，')],
    ];
    // Add history
    historyReports.slice(0, 5).forEach((r) => {
      rows.push([r.id, r.time, r.cylinderName, r.healthScore, r.faultProbability + '%', r.level, r.causes[0]?.cause || '', r.causes[0]?.confidence + '%' || '', r.causes[1]?.cause || '', r.causes[1]?.confidence + '%' || '', r.recommendation.replace(/,/g, '，')]);
    });
    const csv = '﻿' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI诊断数据_${currentDiagnosis.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV 数据已导出', 'success');
  }, [currentDiagnosis, historyReports, showToast]);

  const handleNlpSend = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text, time: new Date().toLocaleTimeString('zh-CN', { hour12: false }) };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);
    setTimeout(() => {
      const reply = getNlpResponse(text, snapshot, selectedCylinderUid);
      const aiMsg: ChatMessage = { id: `a-${Date.now()}`, role: 'assistant', text: reply, time: new Date().toLocaleTimeString('zh-CN', { hour12: false }) };
      setChatMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 1200);
  }, [chatInput, snapshot, selectedCylinderUid]);

  const quickQuestions = ['为什么风险这么高？', '有什么维护建议？', '趋势如何？', 'RUL预测是多少？', '阈值情况？'];

  const getLevelPill = (level: string) => {
    const cfg: Record<string, { bg: string; border: string; color: string; text: string }> = {
      critical: { bg: '#ef444420', border: '#ef444440', color: '#f87171', text: '紧急' },
      warning: { bg: '#f59e0b20', border: '#f59e0b40', color: '#fbbf24', text: '预警' },
      info: { bg: '#3b82f620', border: '#3b82f640', color: '#60a5fa', text: '提示' },
      normal: { bg: '#22c55e20', border: '#22c55e40', color: '#4ade80', text: '正常' },
    };
    return cfg[level] || cfg.normal;
  };

  const getStatusPill = (status: string) => {
    const cfg: Record<string, { bg: string; color: string; text: string }> = {
      pending: { bg: '#ef444420', color: '#f87171', text: '待处理' },
      acknowledged: { bg: '#f59e0b20', color: '#fbbf24', text: '已确认' },
      resolved: { bg: '#22c55e20', color: '#4ade80', text: '已处理' },
    };
    return cfg[status] || cfg.pending;
  };

  return (
    <div style={{ padding: 12, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
          padding: '8px 18px', borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: toast.type === 'success' ? '#22c55e20' : toast.type === 'warning' ? '#f59e0b20' : '#3b82f620',
          border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.4)' : toast.type === 'warning' ? 'rgba(245,158,11,0.4)' : 'rgba(59,130,246,0.4)'}`,
          color: toast.type === 'success' ? '#4ade80' : toast.type === 'warning' ? '#fbbf24' : '#60a5fa',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {toast.type === 'success' ? '✓' : toast.type === 'warning' ? '⚠' : 'ℹ'} {toast.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>🧠</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#eef5ff' }}>AI 智能诊断</span>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          <button onClick={() => setAnalysisMode('auto')} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', border: `1px solid ${analysisMode === 'auto' ? '#3b82f6' : 'rgba(59,130,246,0.15)'}`, background: analysisMode === 'auto' ? 'rgba(59,130,246,0.15)' : 'transparent', color: analysisMode === 'auto' ? '#60a5fa' : '#6b8ab5', fontWeight: analysisMode === 'auto' ? 600 : 400 }}>自动诊断</button>
          <button onClick={() => setAnalysisMode('nlp')} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', border: `1px solid ${analysisMode === 'nlp' ? '#22c55e' : 'rgba(59,130,246,0.15)'}`, background: analysisMode === 'nlp' ? 'rgba(34,197,94,0.12)' : 'transparent', color: analysisMode === 'nlp' ? '#4ade80' : '#6b8ab5', fontWeight: analysisMode === 'nlp' ? 600 : 400 }}>NLP 问答</button>
        </div>
      </div>

      {/* NLP Chat mode */}
      {analysisMode === 'nlp' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, background: 'rgba(8,20,40,0.5)' }}>
          {/* Chat header */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(59,130,246,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#e0eaf5' }}>💬 智能诊断助手</span>
            <button onClick={() => { setChatMessages([]); showToast('对话已清空', 'info'); }} style={{ fontSize: 9, padding: '2px 8px', borderRadius: 3, border: '1px solid rgba(59,130,246,0.15)', background: 'transparent', color: '#6b8ab5', cursor: 'pointer' }}>清空</button>
          </div>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
            {chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', padding: 16, color: '#506a90', fontSize: 10 }}>
                <div style={{ marginBottom: 10 }}>👋 你可以用自然语言询问设备状态</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                  {quickQuestions.map((q) => (
                    <button key={q} onClick={() => { setChatInput(q); setTimeout(() => handleNlpSend(), 50); }}
                      style={{ fontSize: 9, padding: '4px 8px', borderRadius: 12, border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.06)', color: '#8aa8d0', cursor: 'pointer' }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((m) => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '90%', padding: '8px 12px', borderRadius: m.role === 'user' ? '8px 8px 0 8px' : '8px 8px 8px 0',
                  background: m.role === 'user' ? 'rgba(59,130,246,0.2)' : 'rgba(15,35,65,0.7)',
                  border: m.role === 'user' ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(59,130,246,0.1)',
                  fontSize: 10, color: '#e0eaf5', lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.text}
                </div>
                <span style={{ fontSize: 8, color: '#506a90', marginTop: 2 }}>{m.time}</span>
              </div>
            ))}
            {isTyping && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#60a5fa', animation: 'pulse 0.8s infinite' }} />
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#60a5fa', animation: 'pulse 0.8s infinite 0.2s' }} />
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#60a5fa', animation: 'pulse 0.8s infinite 0.4s' }} />
                <span style={{ fontSize: 9, color: '#6b8ab5', marginLeft: 6 }}>AI 思考中...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          {/* Chat input */}
          <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(59,130,246,0.1)', display: 'flex', gap: 6 }}>
            <input
              type="text" placeholder="输入问题，如：为什么这个气缸风险这么高？"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNlpSend()}
              style={{ flex: 1, padding: '7px 10px', borderRadius: 5, border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(8,20,40,0.6)', color: '#e0eaf5', fontSize: 10, outline: 'none' }}
            />
            <button onClick={handleNlpSend}
              style={{ padding: '7px 14px', borderRadius: 5, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 10 }}>
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Auto diagnosis mode */}
      {analysisMode === 'auto' && (
        <>
          {/* Current diagnosis card */}
          {currentDiagnosis && (
            <div style={{ padding: 10, borderRadius: 8, border: '1.5px solid rgba(59,130,246,0.2)', background: 'rgba(15,35,65,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#e0eaf5' }}>
                    {selectedCylinderUid ? '选中气缸诊断' : '最高风险气缸诊断'}
                  </div>
                  <div style={{ fontSize: 9, color: '#6b8ab5' }}>{currentDiagnosis.time} · {currentDiagnosis.id}</div>
                </div>
                <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 10, background: getLevelPill(currentDiagnosis.level).bg, border: `1px solid ${getLevelPill(currentDiagnosis.level).border}`, color: getLevelPill(currentDiagnosis.level).color, fontWeight: 700 }}>
                  {currentDiagnosis.level === 'critical' ? '🔴' : currentDiagnosis.level === 'warning' ? '🟡' : '🔵'} {getLevelPill(currentDiagnosis.level).text}
                </span>
              </div>

              {/* Quick metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 8 }}>
                <div style={{ padding: '7px 8px', borderRadius: 6, background: 'rgba(8,20,40,0.6)', border: '1px solid rgba(59,130,246,0.08)', textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: '#6b8ab5' }}>健康评分</div>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-data)', color: currentDiagnosis.healthScore > 50 ? '#22c55e' : currentDiagnosis.healthScore > 35 ? '#f59e0b' : '#ef4444' }}>
                    {currentDiagnosis.healthScore}<span style={{ fontSize: 10, color: '#6b8ab5' }}>/100</span>
                  </div>
                </div>
                <div style={{ padding: '7px 8px', borderRadius: 6, background: 'rgba(8,20,40,0.6)', border: '1px solid rgba(59,130,246,0.08)', textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: '#6b8ab5' }}>故障概率</div>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-data)', color: currentDiagnosis.faultProbability > 50 ? '#ef4444' : '#f59e0b' }}>
                    {currentDiagnosis.faultProbability}<span style={{ fontSize: 10, color: '#6b8ab5' }}>%</span>
                  </div>
                </div>
              </div>

              {/* Fault causes */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: '#6b8ab5', fontWeight: 600, marginBottom: 5 }}>🔍 故障原因分析（LLM推理）</div>
                {currentDiagnosis.causes.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, padding: '4px 8px', borderRadius: 4, background: 'rgba(8,20,40,0.4)', borderLeft: `3px solid ${c.color}` }}>
                    <span style={{ fontSize: 10, color: '#e0eaf5', flex: 1 }}>{c.cause}</span>
                    <div style={{ width: 50, height: 3, borderRadius: 2, background: 'rgba(59,130,246,0.1)', overflow: 'hidden' }}>
                      <div style={{ width: `${c.confidence}%`, height: '100%', borderRadius: 2, background: c.color }} />
                    </div>
                    <span style={{ fontSize: 8, color: c.color, fontWeight: 700, fontFamily: 'var(--font-mono)', minWidth: 24, textAlign: 'right' }}>{c.confidence}%</span>
                  </div>
                ))}
              </div>

              {/* Recommendation */}
              <div style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)', marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: '#fbbf24', fontWeight: 600, marginBottom: 3 }}>💡 推荐处置</div>
                <div style={{ fontSize: 10, color: '#d0dae8', lineHeight: 1.6 }}>{currentDiagnosis.recommendation}</div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <button onClick={handleDispatchWorkOrder} style={{ flex: 1, minWidth: 70, padding: '6px 8px', borderRadius: 5, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 10 }}>
                  📋 派发工单
                </button>
                <button onClick={handleRegenerate} disabled={isGenerating}
                  style={{ padding: '6px 10px', borderRadius: 5, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', cursor: isGenerating ? 'default' : 'pointer', fontWeight: 600, fontSize: 10, opacity: isGenerating ? 0.6 : 1 }}>
                  {isGenerating ? '⏳ 分析中' : '🔄 重新分析'}
                </button>
                <button onClick={() => handleAcknowledge(currentDiagnosis.id)}
                  style={{ padding: '6px 10px', borderRadius: 5, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#fbbf24', cursor: 'pointer', fontWeight: 600, fontSize: 10 }}>
                  ✓ 确认
                </button>
              </div>
              {/* Export buttons */}
              <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                <button onClick={handleExportHTML}
                  style={{ flex: 1, padding: '5px 8px', borderRadius: 4, border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.06)', color: '#4ade80', cursor: 'pointer', fontWeight: 600, fontSize: 9 }}>
                  📄 导出HTML报告
                </button>
                <button onClick={handleExportCSV}
                  style={{ flex: 1, padding: '5px 8px', borderRadius: 4, border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.06)', color: '#60a5fa', cursor: 'pointer', fontWeight: 600, fontSize: 9 }}>
                  📊 导出CSV数据
                </button>
              </div>
            </div>
          )}

          {/* Cylinder selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <input type="text" placeholder="搜索气缸...（选择后自动诊断）" value={searchText} onChange={(e) => setSearchText(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 5, border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(8,20,40,0.6)', color: '#e0eaf5', fontSize: 10, outline: 'none' }} />
            </div>
            <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {allCylinders.map((cyl) => {
                const levelCfg = cyl.alertLevel === 'critical' ? { color: '#f87171', bg: '#ef444415' } : cyl.alertLevel === 'warning' ? { color: '#fbbf24', bg: '#f59e0b10' } : { color: '#60a5fa', bg: 'transparent' };
                const isSelected = selectedCylinderUid === cyl.cylinderUid;
                return (
                  <div key={cyl.cylinderUid}
                    onClick={() => window.dispatchEvent(new CustomEvent('selectCylinder', { detail: cyl.cylinderUid }))}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', background: isSelected ? levelCfg.bg : 'transparent', border: `1px solid ${isSelected ? levelCfg.color + '40' : 'rgba(59,130,246,0.06)'}` }}>
                    <span style={{ fontSize: 10, color: '#e0eaf5', fontWeight: isSelected ? 600 : 400 }}>{cyl.name}</span>
                    <span style={{ fontSize: 8, color: levelCfg.color, fontWeight: 600 }}>{cyl.healthScore}分</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* History reports */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#e0eaf5' }}>📜 历史诊断报告</span>
          <span style={{ fontSize: 8, color: '#6b8ab5' }}>{historyReports.length} 条</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 220, overflowY: 'auto' }}>
          {historyReports.map((report) => {
            const effectiveStatus = reportStatuses[report.id] || report.status;
            const statusCfg = getStatusPill(effectiveStatus);
            const isExpanded = expandedReport === report.id;
            return (
              <div key={report.id}>
                <div onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', background: isExpanded ? 'rgba(59,130,246,0.08)' : 'rgba(15,35,65,0.3)', border: `1px solid ${isExpanded ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.06)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 8, color: '#6b8ab5', fontFamily: 'var(--font-mono)' }}>{report.time}</span>
                    <span style={{ fontSize: 10, color: '#e0eaf5', fontWeight: 500 }}>{report.cylinderName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: statusCfg.bg, color: statusCfg.color }}>{statusCfg.text}</span>
                    <span style={{ fontSize: 9, color: '#506a90' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ padding: '8px 10px', marginTop: 2, marginBottom: 2, borderRadius: 6, background: 'rgba(8,20,40,0.5)', border: '1px solid rgba(59,130,246,0.1)', fontSize: 10, color: '#a0b8d0', lineHeight: 1.6 }}>
                    <div style={{ marginBottom: 4 }}>{report.recommendation}</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {report.causes.map((c, i) => (
                        <span key={i} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 8, background: `${c.color}15`, color: c.color, border: `1px solid ${c.color}30` }}>{c.cause} {c.confidence}%</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      {effectiveStatus === 'pending' && (
                        <>
                          <button onClick={() => handleAcknowledge(report.id)}
                            style={{ fontSize: 9, padding: '3px 8px', borderRadius: 3, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#fbbf24', cursor: 'pointer' }}>确认</button>
                          <button onClick={() => handleResolve(report.id)}
                            style={{ fontSize: 9, padding: '3px 8px', borderRadius: 3, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: '#4ade80', cursor: 'pointer' }}>标记已处理</button>
                        </>
                      )}
                      {effectiveStatus === 'acknowledged' && (
                        <button onClick={() => handleResolve(report.id)}
                          style={{ fontSize: 9, padding: '3px 8px', borderRadius: 3, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: '#4ade80', cursor: 'pointer' }}>标记已处理</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
