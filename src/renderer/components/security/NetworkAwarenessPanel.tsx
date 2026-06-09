import { useState } from 'react';

interface ToolDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  params: { key: string; label: string; placeholder?: string; type: string; required?: boolean }[];
}

const TOOLS: ToolDef[] = [
  {
    id: 'scanner',
    name: '边缘节点端口巡检',
    description: '扫描 MEC 节点与工业网关端口暴露面，识别未授权服务与协议风险',
    icon: '⚔️',
    params: [
      { key: 'target', label: '目标地址', placeholder: '192.168.1.1', type: 'text', required: true },
      { key: 'ports', label: '端口范围', placeholder: 'top10', type: 'text' },
    ],
  },
  {
    id: 'cybereye',
    name: '网络拓扑态势侦测',
    description: '验证 5G 边缘基础设施可达性、DNS 解析健康度与路由路径完整性',
    icon: '🛡️',
    params: [
      { key: 'target', label: '目标地址/域名', placeholder: 'edge-node-01.local', type: 'text', required: true },
    ],
  },
  {
    id: 'shieldscan',
    name: '数据通道安全评级',
    description: '评估 OT 数据传输通道的 TLS 证书有效性、安全头合规性与整体防护等级',
    icon: '🔒',
    params: [
      { key: 'target', label: '目标 URL', placeholder: 'https://iot-gateway.local', type: 'text', required: true },
    ],
  },
];

export default function NetworkAwarenessPanel() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [params, setParams] = useState<Record<string, string>>({});

  const handleRun = (toolId: string) => {
    setRunning(true);
    setOutput([`$> 正在启动 ${TOOLS.find((t) => t.id === toolId)?.name}...`]);

    const mockLines = getMockOutput(toolId);
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= mockLines.length) {
        clearInterval(interval);
        setRunning(false);
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

      <div className="security-cards">
        {TOOLS.map((tool) => (
          <div
            key={tool.id}
            className={`security-card glass-panel ${activeTool === tool.id ? 'card-active' : ''}`}
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
