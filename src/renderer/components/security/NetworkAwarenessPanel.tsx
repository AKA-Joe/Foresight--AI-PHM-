import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import * as echarts from 'echarts';

interface ToolDef {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  params: { key: string; label: string; placeholder?: string; type: string; required?: boolean }[];
}

const TOOLS: ToolDef[] = [
  {
    id: 'scanner',
    name: '边缘节点端口巡检',
    description: '扫描 MEC 节点与工业网关端口暴露面，识别未授权服务与协议风险',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
    params: [
      { key: 'target', label: '目标地址', placeholder: '192.168.1.1', type: 'text', required: true },
      { key: 'ports', label: '端口范围', placeholder: 'top10', type: 'text' },
    ],
  },
  {
    id: 'cybereye',
    name: '网络拓扑态势侦测',
    description: '验证 5G 边缘基础设施可达性、DNS 解析健康度与路由路径完整性',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/></svg>,
    params: [
      { key: 'target', label: '目标地址/域名', placeholder: 'edge-node-01.local', type: 'text', required: true },
    ],
  },
  {
    id: 'shieldscan',
    name: '数据通道安全评级',
    description: '评估 OT 数据传输通道的 TLS 证书有效性、安全头合规性与整体防护等级',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>,
    params: [
      { key: 'target', label: '目标 URL', placeholder: 'https://iot-gateway.local', type: 'text', required: true },
    ],
  },
];

interface ConnectionNode {
  name: string;
  ip: string;
  status: 'online' | 'warning' | 'offline';
  latency: number;
  type: string;
}

interface ThreatEvent {
  id: string;
  time: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
}

const MOCK_NODES: ConnectionNode[] = [
  { name: 'MEC-01', ip: '10.8.1.47', status: 'online', latency: 3.2, type: '边缘计算节点' },
  { name: 'MEC-02', ip: '10.8.1.48', status: 'online', latency: 4.1, type: '边缘计算节点' },
  { name: 'GW-Core', ip: '10.8.0.1', status: 'online', latency: 1.1, type: '核心网关' },
  { name: 'IoT-GW', ip: '10.8.2.10', status: 'warning', latency: 12.3, type: '工业网关' },
  { name: '5G-gNB', ip: '10.8.0.5', status: 'online', latency: 2.0, type: '5G基站' },
  { name: 'PLC-Bridge', ip: '10.8.3.1', status: 'online', latency: 5.7, type: 'PLC网桥' },
  { name: 'DMZ-FW', ip: '10.8.0.254', status: 'online', latency: 0.8, type: '防火墙' },
  { name: 'SCADA-Server', ip: '10.8.4.20', status: 'warning', latency: 8.9, type: 'SCADA服务器' },
];

const MOCK_EVENTS: ThreatEvent[] = [
  { id: '1', time: '14:32:18', level: 'warning', message: 'IoT-GW 延迟超过 10ms 阈值' },
  { id: '2', time: '14:28:05', level: 'info', message: 'MEC-01 完成固件升级校验' },
  { id: '3', time: '14:15:42', level: 'critical', message: '检测到非授权 Modbus 端口暴露' },
  { id: '4', time: '13:58:11', level: 'info', message: '5G-gNB 信号质量恢复至正常范围' },
  { id: '5', time: '13:45:30', level: 'warning', message: 'TLS 证书将于 30 天内过期' },
  { id: '6', time: '13:22:09', level: 'info', message: '核心网关路由表刷新完成' },
];

function generateTimeSeries(length: number, base: number, variance: number): number[] {
  const data: number[] = [];
  let val = base;
  for (let i = 0; i < length; i++) {
    val += (Math.random() - 0.5) * variance;
    val = Math.max(base - variance * 2, Math.min(base + variance * 2, val));
    data.push(Math.round(val * 10) / 10);
  }
  return data;
}

function MiniAreaChart({ data, color, unit, label, value }: { data: number[]; color: string; unit: string; label: string; value: string }) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    chart.setOption({
      grid: { left: 0, right: 0, top: 4, bottom: 0 },
      xAxis: { type: 'category', show: false, data: data.map((_, i) => i) },
      yAxis: { type: 'value', show: false },
      series: [{
        type: 'line',
        data,
        smooth: true,
        symbol: 'none',
        lineStyle: { color, width: 1.5 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: color.replace(')', ', 0.3)').replace('rgb', 'rgba') },
            { offset: 1, color: 'transparent' },
          ]),
        },
      }],
      animation: false,
    });
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { chart.dispose(); window.removeEventListener('resize', handleResize); };
  }, [data, color]);

  return (
    <div className="network-metric-card glass-panel">
      <div className="network-metric-header">
        <span className="network-metric-label">{label}</span>
        <span className="network-metric-value" style={{ color }}>{value}<span className="network-metric-unit">{unit}</span></span>
      </div>
      <div ref={chartRef} className="network-metric-chart" />
    </div>
  );
}

type ResultStatus = 'idle' | 'success' | 'warning' | 'error';

export default function NetworkAwarenessPanel() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [params, setParams] = useState<Record<string, string>>({});
  const [resultStatus, setResultStatus] = useState<Record<string, ResultStatus>>({});

  const [latencyData, setLatencyData] = useState(() => generateTimeSeries(30, 4.5, 1.2));
  const [packetLossData, setPacketLossData] = useState(() => generateTimeSeries(30, 0.3, 0.15));
  const [throughputData, setThroughputData] = useState(() => generateTimeSeries(30, 850, 80));

  useEffect(() => {
    const timer = setInterval(() => {
      setLatencyData((prev) => {
        const next = [...prev.slice(1)];
        const last = prev[prev.length - 1];
        next.push(Math.round((last + (Math.random() - 0.5) * 2) * 10) / 10);
        return next;
      });
      setPacketLossData((prev) => {
        const next = [...prev.slice(1)];
        const last = prev[prev.length - 1];
        next.push(Math.max(0, Math.round((last + (Math.random() - 0.5) * 0.2) * 100) / 100));
        return next;
      });
      setThroughputData((prev) => {
        const next = [...prev.slice(1)];
        const last = prev[prev.length - 1];
        next.push(Math.round(last + (Math.random() - 0.5) * 60));
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleRun = (toolId: string) => {
    setRunning(true);
    setOutput([`$> 正在启动 ${TOOLS.find((t) => t.id === toolId)?.name}...`]);

    const mockLines = getMockOutput(toolId);
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= mockLines.length) {
        clearInterval(interval);
        setRunning(false);
        const fullOutput = mockLines.join(' ');
        let status: ResultStatus = 'success';
        if (fullOutput.includes('⚠️') || fullOutput.includes('WARNING')) status = 'warning';
        if (fullOutput.includes('FAIL') || fullOutput.includes('ERROR') || fullOutput.includes('❌')) status = 'error';
        setResultStatus((prev) => ({ ...prev, [toolId]: status }));
        setOutput((prev) => [...prev, '', `[完成] 巡检结束，共发现 ${Math.floor(Math.random() * 5) + 1} 项需关注`]);
        return;
      }
      const ts = new Date();
      const timeStr = `[${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}:${String(ts.getSeconds()).padStart(2, '0')}]`;
      setOutput((prev) => [...prev, `${timeStr} ${mockLines[idx]}`]);
      idx++;
    }, 300);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output.join('\n'));
  };

  return (
    <div className="security-panel">
      <div className="security-header">
        <h2 className="security-title">5G 工业网络态势感知</h2>
        <p className="security-subtitle">
          预测性维护系统的可靠性取决于底层网络基础设施的健康程度。本模块对 5G 边缘计算节点、工业网关及数据传输通道执行周期性安全巡检，
          确保从设备侧到分析平台的数据链路安全、可用、可信。
        </p>
      </div>

      {/* Real-time metrics */}
      <div className="network-metrics-row">
        <MiniAreaChart
          data={latencyData}
          color="#3b82f6"
          unit="ms"
          label="平均延迟"
          value={latencyData[latencyData.length - 1].toFixed(1)}
        />
        <MiniAreaChart
          data={packetLossData}
          color="#f59e0b"
          unit="%"
          label="丢包率"
          value={packetLossData[packetLossData.length - 1].toFixed(2)}
        />
        <MiniAreaChart
          data={throughputData}
          color="#10b981"
          unit="Mbps"
          label="吞吐量"
          value={Math.round(throughputData[throughputData.length - 1]).toString()}
        />
      </div>

      {/* Connection status grid */}
      <div className="network-connections-section">
        <div className="network-section-title">节点连接状态</div>
        <div className="network-connections-grid">
          {MOCK_NODES.map((node) => (
            <div key={node.name} className={`connection-node-card glass-panel node-${node.status}`}>
              <div className="node-header">
                <span className={`node-status-dot ${node.status}`} />
                <span className="node-name">{node.name}</span>
              </div>
              <div className="node-type">{node.type}</div>
              <div className="node-info">
                <span className="node-ip">{node.ip}</span>
                <span className="node-latency">{node.latency}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Threat event timeline */}
      <div className="network-threats-section">
        <div className="network-section-title">安全事件</div>
        <div className="network-threats-list">
          {MOCK_EVENTS.map((event) => (
            <div key={event.id} className="threat-event-row">
              <span className="threat-time">{event.time}</span>
              <span className={`threat-badge badge-${event.level}`}>
                {event.level === 'critical' ? '紧急' : event.level === 'warning' ? '预警' : '信息'}
              </span>
              <span className="threat-message">{event.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Audit log */}
      <AuditLog />

      {/* 5G capability showcase */}
      <FiveGCapabilityPanel />

      {/* Tool cards */}
      <div className="network-section-title" style={{ marginTop: 20 }}>安全巡检工具</div>
      <div className="security-cards">
        {TOOLS.map((tool) => (
          <div
            key={tool.id}
            className={`security-card glass-panel ${activeTool === tool.id ? 'card-active' : ''} card-${resultStatus[tool.id] || 'idle'}`}
            onClick={() => { setActiveTool(tool.id); setOutput([]); setParams({}); }}
          >
            <div className="security-card-icon">{tool.icon}</div>
            <div className="security-card-body">
              <div className="security-card-name">{tool.name}</div>
              <div className="security-card-desc">{tool.description}</div>
            </div>
            <div className="security-card-status">
              {running && activeTool === tool.id ? (
                <span className="running-dots">执行中<span className="dots" /></span>
              ) : (
                <span className="card-arrow">→</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {activeTool && (
        <div className="security-execution glass-panel">
          <div className="security-exec-header">
            <span>{TOOLS.find((t) => t.id === activeTool)?.name}</span>
            <div className="security-exec-actions">
              {output.length > 0 && <button className="copy-btn" onClick={handleCopy}>复制输出</button>}
            </div>
          </div>

          <div className="security-params">
            {TOOLS.find((t) => t.id === activeTool)?.params.map((p) => (
              <div key={p.key} className="param-field">
                <label className="param-label">{p.label}{p.required && ' *'}</label>
                <input
                  className="param-input"
                  placeholder={p.placeholder}
                  value={params[p.key] || ''}
                  onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: e.target.value }))}
                />
              </div>
            ))}
            <button
              className="run-btn"
              disabled={running}
              onClick={() => handleRun(activeTool)}
            >
              {running ? '执行中...' : '开始巡检'}
            </button>
          </div>

          {output.length > 0 && (
            <div className="terminal-output">
              {output.map((line, idx) => (
                <div key={idx} className="terminal-line">{line}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const AUDIT_LOGS = [
  { id: 'a1', time: '2026-06-14 14:30:12', user: '管理员', action: '查看气缸 CYL-07 详细数据', ip: '10.8.0.100' },
  { id: 'a2', time: '2026-06-14 13:45:08', user: '运维工程师', action: '确认告警 AL-0042，标记为已处理', ip: '10.8.1.52' },
  { id: 'a3', time: '2026-06-14 12:10:33', user: '管理员', action: '修改异常阈值参数: σ=3.0→3.5', ip: '10.8.0.100' },
  { id: 'a4', time: '2026-06-14 11:28:15', user: '系统', action: '自动备份数据至离线存储节点', ip: '-' },
  { id: 'a5', time: '2026-06-14 10:05:44', user: '审计员', action: '导出本月告警统计报表', ip: '10.8.0.200' },
];

function AuditLog() {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div className="network-section-title" style={{ marginTop: 8 }}>
        操作审计日志
      </div>
      <div style={{
        border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
        background: 'var(--bg-card)', overflow: 'hidden',
      }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 140 }}>时间</th>
              <th style={{ width: 90 }}>用户</th>
              <th>操作</th>
              <th style={{ width: 100 }}>IP 地址</th>
            </tr>
          </thead>
          <tbody>
            {AUDIT_LOGS.map((log) => (
              <tr key={log.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                  <span style={{ opacity: 0.6 }}>{log.time.slice(0, 10)}</span>{' '}
                  <span style={{ fontWeight: 600 }}>{log.time.slice(11)}</span>
                </td>
                <td>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: log.user === '系统' ? 'var(--accent-dim)' : 'rgba(16,185,129,0.08)',
                    color: log.user === '系统' ? 'var(--accent)' : 'var(--level-normal)',
                  }}>
                    {log.user}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: 'var(--text-primary)' }}>{log.action}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dimmed)' }}>
                  {log.ip}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FiveGCapabilityPanel() {
  const [expanded, setExpanded] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !expanded) return;
    const chart = echarts.init(chartRef.current);
    const now = Date.now();
    const data = Array.from({ length: 60 }, (_, i) => {
      const t = now - (59 - i) * 1000;
      return [t, 3 + Math.random() * 12, 8 + Math.random() * 25, 2 + Math.random() * 5];
    });
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['URLLC延迟', 'eMBB吞吐', 'mMTC连接'], bottom: 0, textStyle: { color: '#8a9bb5', fontSize: 10 }, itemWidth: 12, itemHeight: 8 },
      grid: { left: 50, right: 50, top: 20, bottom: 36 },
      xAxis: { type: 'time', axisLabel: { color: '#6b8ab5', fontSize: 9 }, splitLine: { show: false } },
      yAxis: [
        { type: 'value', name: 'ms', axisLabel: { color: '#6b8ab5', fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(59,130,246,0.06)' } } },
        { type: 'value', name: 'Mbps/个', axisLabel: { color: '#6b8ab5', fontSize: 9 }, splitLine: { show: false } },
      ],
      series: [
        { name: 'URLLC延迟', type: 'line', yAxisIndex: 0, smooth: true, symbol: 'none', lineStyle: { color: '#ef4444', width: 1.5 }, data: data.map(d => [d[0], d[1]]) },
        { name: 'eMBB吞吐', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'none', lineStyle: { color: '#3b82f6', width: 1.5 }, data: data.map(d => [d[0], d[2]]) },
        { name: 'mMTC连接', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'none', lineStyle: { color: '#10b981', width: 1.5 }, data: data.map(d => [d[0], d[3]]) },
      ],
    });
    const h = () => chart.resize();
    window.addEventListener('resize', h);
    return () => { chart.dispose(); window.removeEventListener('resize', h); };
  }, [expanded]);

  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div className="network-section-title" style={{ cursor: 'pointer', marginBottom: 8 }} onClick={() => setExpanded(!expanded)}>
        5G 网络特性展示
        <span style={{ fontSize: 9, marginLeft: 8, color: 'var(--text-dimmed)', fontWeight: 400 }}>
          {expanded ? '▼' : '►'} URLLC · eMBB · mMTC
        </span>
      </div>
      {expanded && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 12 }}>
            <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '3px solid #ef4444' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#f87171', marginBottom: 4 }}>⚡ URLLC 超低延迟</div>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 22, fontWeight: 700, color: '#ef4444' }}>1.2<span style={{ fontSize: 12, color: '#8a9bb5' }}>ms</span></div>
              <div style={{ fontSize: 9, color: '#6b8ab5', marginTop: 2 }}>工业控制指令 <b style={{ color: '#22c55e' }}>✓ 达标</b> (&lt;5ms)</div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(239,68,68,0.1)', marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: '24%', height: '100%', background: '#ef4444', borderRadius: 2 }} />
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '3px solid #3b82f6' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#60a5fa', marginBottom: 4 }}>📶 eMBB 增强宽带</div>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>847<span style={{ fontSize: 12, color: '#8a9bb5' }}>Mbps</span></div>
              <div style={{ fontSize: 9, color: '#6b8ab5', marginTop: 2 }}>数字孪生视频流 <b style={{ color: '#22c55e' }}>✓ 流畅</b> (&gt;100Mbps)</div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(59,130,246,0.1)', marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: '85%', height: '100%', background: '#3b82f6', borderRadius: 2 }} />
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '3px solid #10b981' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#34d399', marginBottom: 4 }}>📡 mMTC 海量连接</div>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 22, fontWeight: 700, color: '#10b981' }}>12,847<span style={{ fontSize: 12, color: '#8a9bb5' }}>台</span></div>
              <div style={{ fontSize: 9, color: '#6b8ab5', marginTop: 2 }}>传感器在线 <b style={{ color: '#22c55e' }}>99.7%</b> 接入成功率</div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(16,185,129,0.1)', marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: '64%', height: '100%', background: '#10b981', borderRadius: 2 }} />
              </div>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#c0d0e0', marginBottom: 8 }}>5G 网络切片实时监测</div>
            <div ref={chartRef} style={{ height: 160 }} />
          </div>
          <div style={{
            display: 'flex', gap: 12, marginTop: 10, fontSize: 10, color: '#6b8ab5',
            padding: '8px 12px', borderRadius: 6, background: 'rgba(59,130,246,0.04)',
          }}>
            <span>🔒 <b style={{ color: '#c0d0e0' }}>网络切片 3</b> (工业控制/视频回传/传感器)</span>
            <span style={{ color: 'var(--border-color)' }}>|</span>
            <span>📍 <b style={{ color: '#c0d0e0' }}>5G SA</b> 独立组网</span>
            <span style={{ color: 'var(--border-color)' }}>|</span>
            <span>📡 <b style={{ color: '#c0d0e0' }}>3.5GHz</b> + <b style={{ color: '#c0d0e0' }}>2.1GHz</b> 双频覆盖</span>
          </div>
        </div>
      )}
    </div>
  );
}

function getMockOutput(toolId: string): string[] {
  if (toolId === 'scanner') {
    return [
      '正在扫描目标端口...',
      'PORT     STATE   SERVICE        BANNER',
      '22/tcp   open    ssh            OpenSSH 8.9',
      '80/tcp   open    http           nginx/1.24.0',
      '443/tcp  open    https          nginx/1.24.0',
      '502/tcp  open    modbus         Modbus/TCP',
      '8080/tcp open    http-proxy     Industrial Gateway v2.1',
      '8883/tcp open    mqtt-ssl       EMQX 5.0',
      '',
      '⚠️  端口 502 (Modbus) 暴露于网络，建议限制访问源 IP',
      '⚠️  端口 8080 工业网关管理界面公开暴露',
      '✓  SSH/HTTPS 服务正常，版本较新',
      '',
      'OS 指纹推测: Linux 5.x (嵌入式)',
    ];
  }
  if (toolId === 'cybereye') {
    return [
      '正在执行网络拓扑侦测...',
      '',
      '[GeoIP] 目标位置: 中国 江苏 常熟',
      '[DNS]   A  记录: 10.8.1.47',
      '[DNS]   PTR记录: edge-mec-03.factory.local',
      '[路由追踪]',
      '  1  gateway.local (10.8.0.1)      1.2ms',
      '  2  core-switch.local (10.8.1.1)  2.4ms',
      '  3  edge-mec-03 (10.8.1.47)       3.1ms',
      '',
      '✓ 路由路径完整，3 跳可达',
      '✓ DNS 正反解析一致',
      '⚠️  未检测到冗余路径',
    ];
  }
  return [
    '正在评估数据通道安全性...',
    '',
    '[TLS] 证书颁发者: Let\'s Encrypt R3',
    '[TLS] 有效期至: 2026-09-15 (剩余 97 天)',
    '[TLS] 协议: TLSv1.3, 密码套件: TLS_AES_256_GCM_SHA384',
    '',
    '[安全头检查]',
    '  ✓ Strict-Transport-Security: max-age=31536000',
    '  ✓ X-Content-Type-Options: nosniff',
    '  ⚠️ 缺少 Content-Security-Policy 头',
    '  ⚠️ 缺少 X-Frame-Options 头',
    '',
    '[Cookie] 检测到 2 个 Cookie',
    '  session_id: Secure=✓ HttpOnly=✓ SameSite=Strict',
    '  _ga: Secure=✗ HttpOnly=✗ (非敏感追踪)',
    '',
    '综合安全评级: B+ (78/100)',
  ];
}
