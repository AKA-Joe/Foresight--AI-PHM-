import { useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatDeltaEvent, ChatDoneEvent, ChatErrorEvent, DashboardSnapshot } from '../../shared/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  offline?: boolean;
  pending?: boolean;
}

interface Props {
  snapshot: DashboardSnapshot;
  selectedCylinderUid?: string;
}

const quickPrompts = [
  '请分析当前最高风险气缸，并给出维修建议。',
  '请解释当前告警规则和触发原因。',
  '请根据当前告警生成班组交接摘要。',
  '请评估当前设备运行效率与产能影响。',
];

// ── CSV Export ──
function triggerCSV(snapshot: DashboardSnapshot) {
  const cyls = snapshot.cylinders;
  const alerts = snapshot.alerts.filter(a => a.status !== 'closed');
  const lines = [
    'UID,名称,设备,工位,产线,动作类型,健康分,故障概率%,告警等级,基线ms,阈值ms',
  ];
  for (const c of cyls) {
    lines.push([c.uid, c.name, c.deviceName, c.stationId, c.lineId, c.actionType,
      c.healthScore, c.faultProbability, c.alertLevel, c.baselineMs, c.fixedThresholdMs].join(','));
  }
  lines.push('');
  lines.push('告警ID,等级,标题,状态,关联气缸,时间');
  for (const a of alerts) {
    lines.push([a.id, a.level, a.title, a.status, a.cylinderUid, new Date(a.timestamp).toLocaleString('zh-CN')].join(','));
  }
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `明鉴_数据明细_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── HTML Visual Report ──
function healthClass(s: number) { return s > 70 ? 'g' : s > 40 ? 'w' : 'r'; }

function triggerHTML(snapshot: DashboardSnapshot) {
  const now = new Date().toLocaleString('zh-CN');
  const cyls = snapshot.cylinders;
  const alerts = snapshot.alerts.filter(a => a.status !== 'closed');
  const avgH = Math.round(cyls.reduce((s, c) => s + c.healthScore, 0) / cyls.length);
  const crit = cyls.filter(c => c.healthScore < 40).length;
  const warn = cyls.filter(c => c.healthScore >= 40 && c.healthScore <= 70).length;
  const norm = cyls.filter(c => c.healthScore > 70).length;
  const top5 = [...cyls].sort((a, b) => a.healthScore - b.healthScore).slice(0, 5);

  function hBar(s: number) {
    const w = Math.max(5, s);
    const color = s > 70 ? '#22c55e' : s > 40 ? '#f59e0b' : '#ef4444';
    return '<div style="height:8px;border-radius:4px;background:#e5e5e5;width:100px;display:inline-block;vertical-align:middle;margin-right:6px"><div style="height:100%;border-radius:4px;width:' + w + '%;background:' + color + '"></div></div>';
  }

  const rows = cyls.map(c =>
    '<tr><td style="font-family:monospace;font-size:10px">' + c.uid.slice(-8) + '</td><td>' + c.name + '</td><td>' + c.deviceName + '</td><td class="' + healthClass(c.healthScore) + '">' + c.healthScore + '</td><td>' + c.faultProbability + '%</td><td>' + (c.alertLevel === 'critical' ? '🔴' : c.alertLevel === 'warning' ? '🟡' : '🔵') + ' ' + c.alertLevel + '</td></tr>'
  ).join('');

  const aRows = alerts.map(a =>
    '<tr><td>' + (a.level === 'critical' ? '🔴' : a.level === 'warning' ? '🟡' : '🔵') + ' ' + a.level + '</td><td>' + a.title + '</td><td>' + a.status + '</td><td style="font-size:10px">' + new Date(a.timestamp).toLocaleString('zh-CN') + '</td></tr>'
  ).join('');

  const top5Rows = top5.map((c, i) => {
    const drift = ((c.faultProbability / 100) * (c.fixedThresholdMs - c.baselineMs) / 30).toFixed(2);
    const days = c.healthScore > 70 ? '>60' : c.healthScore > 40 ? Math.round(20 + (c.healthScore - 40) * 1.3) : Math.round(5 + c.healthScore * 0.4);
    return '<tr><td><b>' + c.name + '</b></td><td class="' + healthClass(c.healthScore) + '">' + c.healthScore + '</td><td style="font-family:monospace">+' + drift + '</td><td style="font-family:monospace">' + days + '</td><td class="' + healthClass(c.healthScore) + '">' + (c.alertLevel === 'critical' ? '🔴 紧急' : c.alertLevel === 'warning' ? '🟡 预警' : '🔵 提示') + '</td></tr>';
  }).join('');

  const html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>明鉴——AI+设备预测性维护平台 设备健康报告</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif;padding:28px 36px;color:#1d1d1f;background:#f5f5f7;line-height:1.6}h1{font-size:24px;font-weight:900;letter-spacing:0.06em;margin-bottom:2px;background:linear-gradient(90deg,#3b82f6,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.sub{color:#86868b;font-size:12px;margin-bottom:24px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}.card{background:#fff;border-radius:12px;padding:16px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.06)}.card .lbl{font-size:10px;color:#86868b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;font-weight:600}.card .val{font-size:28px;font-weight:800}.card .val.g{color:#22c55e}.card .val.w{color:#f59e0b}.card .val.r{color:#ef4444}h2{font-size:16px;font-weight:700;margin:24px 0 12px;padding-bottom:8px;border-bottom:2px solid #3b82f6}table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06)}th{text-align:left;padding:10px 14px;background:#f0f0f2;font-weight:700;font-size:10px;text-transform:uppercase;color:#48484a}td{padding:9px 14px;border-bottom:1px solid #f0f0f2}.g{color:#22c55e;font-weight:700}.w{color:#f59e0b;font-weight:700}.r{color:#ef4444;font-weight:700}.conclusion{background:#fff;border-radius:12px;padding:18px 22px;box-shadow:0 1px 3px rgba(0,0,0,0.06);margin-bottom:16px}.conclusion h3{font-size:13px;font-weight:700;margin-bottom:8px;color:#3b82f6}.conclusion p{font-size:12px;color:#48484a;margin-bottom:6px}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.act{background:#f0f0f2;border-radius:8px;padding:10px 16px;flex:1;min-width:200px;font-size:11px;font-weight:600;color:#1d1d1f}.act .num{font-size:20px;font-weight:900;display:block}.footer{text-align:center;font-size:10px;color:#aeaeb2;margin-top:28px;padding-top:12px;border-top:1px solid #e5e5e5}</style></head><body><h1>明鉴——AI+设备预测性维护平台</h1><div class="sub">设备健康预测性维护报告 · ' + now + ' · 离线演示模式</div><div class="grid"><div class="card"><div class="lbl">监测设备</div><div class="val">' + cyls.length + '<span style="font-size:14px;color:#86868b"> 台</span></div></div><div class="card"><div class="lbl">平均健康评分</div><div class="val ' + healthClass(avgH) + '">' + avgH + '<span style="font-size:14px;color:#86868b">/100</span></div></div><div class="card"><div class="lbl">紧急设备</div><div class="val r">' + crit + '<span style="font-size:14px;color:#86868b"> 台</span></div></div><div class="card"><div class="lbl">活跃告警</div><div class="val w">' + alerts.length + '<span style="font-size:14px;color:#86868b"> 条</span></div></div></div><h2>📋 设备健康明细</h2><table><thead><tr><th>UID</th><th>名称</th><th>设备</th><th>健康分</th><th>故障率</th><th>状态</th></tr></thead><tbody>' + rows + '</tbody></table><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px"><div class="conclusion"><h3>⚠️ 风险 TOP 5</h3>' + top5.map((c, i) => '<p>' + (i + 1) + '. <b>' + c.name + '</b> — 健康分 <span class="' + healthClass(c.healthScore) + '">' + c.healthScore + '</span> · 故障概率 ' + c.faultProbability + '% ' + hBar(c.healthScore) + '</p>').join('') + '</div><div class="conclusion"><h3>📊 健康分布</h3><p>✅ 正常 (>70): <b class="g">' + norm + '</b> 台 (' + ((norm / cyls.length) * 100).toFixed(0) + '%)</p><p>🟡 预警 (40-70): <b class="w">' + warn + '</b> 台 (' + ((warn / cyls.length) * 100).toFixed(0) + '%)</p><p>🔴 紧急 (<40): <b class="r">' + crit + '</b> 台 (' + ((crit / cyls.length) * 100).toFixed(0) + '%)</p></div></div><h2>📈 劣化趋势分析</h2><table><thead><tr><th>设备</th><th>健康分</th><th>日均劣化(ms)</th><th>预计达阈值(天)</th><th>风险</th></tr></thead><tbody>' + top5Rows + '</tbody></table><h2>🚨 活跃告警</h2><table><thead><tr><th>等级</th><th>标题</th><th>状态</th><th>时间</th></tr></thead><tbody>' + aRows + '</tbody></table><div class="conclusion"><h3>💡 综合结论与行动建议</h3><div class="actions"><div class="act"><span class="num r">' + crit + '</span>紧急处理：健康分<40设备立即停机检修，优先更换密封件</div><div class="act"><span class="num w">' + warn + '</span>计划维护：预警设备安排周末检修，重点查劣化趋势</div><div class="act"><span class="num g">' + norm + '</span>持续监测：健康设备维持5s采样，关注劣化速率变化</div></div><p style="margin-top:12px;color:#86868b">📊 综合评估：' + (avgH > 70 ? '整体健康度良好(' + avgH + '/100)，设备运行在安全区间，建议重点关注TOP5风险设备趋势。' : avgH > 50 ? '整体健康度中等(' + avgH + '/100)，' + warn + '台预警设备需安排检修，建议加大巡检频次。' : '⚠️ 整体健康度偏低(' + avgH + '/100)，存在系统性风险，' + crit + '台紧急设备需优先处理。') + '</p><p style="margin-top:6px;color:#86868b">📋 后续计划：1)本周完成紧急检修 2)下周安排预警维护 3)月度评估劣化模型 4)季度更新行业基准库</p></div><div class="footer">明鉴——AI+设备预测性维护平台 · 自动生成报告</div></body></html>';

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `明鉴_可视化报告_${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ChatPanel({ snapshot, selectedCylinderUid }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-assistant',
      role: 'assistant',
      content:
        '你好，我是 AI 运维助手。\n\n我可以基于当前演示系统中的 mock 数据，解释气缸健康评分、告警原因、趋势劣化情况，并生成维修建议或汇报摘要。',
    },
  ]);
  const [input, setInput] = useState('');
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const offDelta = window.predMaint.chat.onDelta((event: ChatDeltaEvent) => {
      if (!currentRequestId || event.requestId !== currentRequestId) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === currentRequestId ? { ...msg, content: msg.content + event.delta } : msg,
        ),
      );
    });

    const offDone = window.predMaint.chat.onDone((event: ChatDoneEvent) => {
      if (!currentRequestId || event.requestId !== currentRequestId) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === currentRequestId ? { ...msg, pending: false, offline: event.offline } : msg,
        ),
      );
      setSending(false);
      setCurrentRequestId(null);
    });

    const offError = window.predMaint.chat.onError((event: ChatErrorEvent) => {
      if (!currentRequestId || event.requestId !== currentRequestId) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === currentRequestId
            ? { ...msg, pending: false, content: `${msg.content}\n\n[错误] ${event.message}` }
            : msg,
        ),
      );
      setSending(false);
      setCurrentRequestId(null);
    });

    return () => {
      offDelta();
      offDone();
      offError();
    };
  }, [currentRequestId]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  const sendPrompt = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const requestId = await window.predMaint.chat.send(trimmed, {
      selectedCylinderUid,
      includeSnapshot: true,
    });

    setMessages((prev) => [
      ...prev,
      { id: `user-${requestId}`, role: 'user', content: trimmed },
      { id: requestId, role: 'assistant', content: '', pending: true },
    ]);
    setCurrentRequestId(requestId);
    setSending(true);
    setInput('');
  };

  const placeholder = useMemo(() => {
    if (selectedCylinderUid) {
      return `围绕 ${selectedCylinderUid.slice(-10)} 继续提问...`;
    }
    return '输入问题，例如：请分析当前最高风险气缸...';
  }, [selectedCylinderUid]);

  return (
    <>
      <div className="chat-prompt-hints">
        {quickPrompts.map((prompt) => (
          <button key={prompt} className="chat-prompt-hint" onClick={() => void sendPrompt(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg ${msg.role} ${msg.pending ? 'loading' : ''}`}>
            {msg.content ? (
              <Markdown remarkPlugins={[remarkGfm]}>{msg.content + (msg.offline ? '\n\n---\n*（当前为离线演示模式）*' : '')}</Markdown>
            ) : (
              '正在分析当前趋势与告警上下文...'
            )}
          </div>
        ))}
      </div>

      <div className="chat-input-area">
        <textarea
          className="chat-input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 96) + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void sendPrompt(input);
            }
          }}
        />
        <button className="chat-send-btn" disabled={sending || !input.trim()} onClick={() => void sendPrompt(input)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
          </svg>
        </button>
      </div>
      <div className="export-btn-group">
        <button className="export-btn" onClick={() => triggerHTML(snapshot)}>📊 可视化报告</button>
        <button className="export-btn" onClick={() => triggerCSV(snapshot)}>📋 导出 CSV</button>
      </div>
      <div className="nl-query-hint">
        💡 自然语言查询：<code>"上周健康分低于60的气缸"</code> <code>"最危险的设备"</code>
      </div>
    </>
  );
}
