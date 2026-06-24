import { useCallback, useEffect, useState, useRef } from 'react';
import * as echarts from 'echarts';

type Protocol = 'opcua' | 'modbus' | 'mqtt';

interface TagDef {
  id: string; name: string; address: string; type: string; value: number; unit: string;
  min: number; max: number; trend: 'up' | 'down' | 'stable';
}

const TAGS: TagDef[] = [
  { id: 'T1', name: '气缸动作时间', address: 'ns=3;s="CYL-CT01"', type: 'Float', value: 128.5, unit: 'ms', min: 80, max: 320, trend: 'up' },
  { id: 'T2', name: '进气压力', address: 'ns=3;s="PRS-IN01"', type: 'Float', value: 0.62, unit: 'MPa', min: 0.4, max: 0.8, trend: 'stable' },
  { id: 'T3', name: '油温', address: 'ns=3;s="TMP-OT01"', type: 'Float', value: 47.2, unit: '°C', min: 20, max: 80, trend: 'up' },
  { id: 'T4', name: '振动幅值', address: 'ns=3;s="VIB-AX01"', type: 'Float', value: 2.1, unit: 'mm/s', min: 0, max: 10, trend: 'up' },
  { id: 'T5', name: '电机电流', address: 'ns=3;s="CUR-MT01"', type: 'Float', value: 12.4, unit: 'A', min: 5, max: 25, trend: 'stable' },
  { id: 'T6', name: '电磁阀状态', address: 'ns=3;s="SOLV-01"', type: 'Bool', value: 1, unit: '', min: 0, max: 1, trend: 'stable' },
];

const PROTO_INFO: Record<Protocol, { icon: string; name: string; endpoint: string; desc: string; color: string }> = {
  opcua: { icon: '🏭', name: 'OPC UA', endpoint: 'opc.tcp://192.168.1.100:4840', desc: '工业互操作性标准', color: '#3b82f6' },
  modbus: { icon: '🔧', name: 'Modbus TCP', endpoint: 'modbus://192.168.1.100:502', desc: '最广泛工业协议', color: '#f59e0b' },
  mqtt: { icon: '📡', name: 'MQTT', endpoint: 'mqtt://192.168.1.100:1883', desc: '物联网轻量级协议', color: '#10b981' },
};

export default function DataAcquisition({ embedded, narrow }: { embedded?: boolean; narrow?: boolean }) {
  const [protocol, setProtocol] = useState<Protocol>('opcua');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [bytesTotal, setBytesTotal] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [dataQuality, setDataQuality] = useState(98.5);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInst = useRef<echarts.ECharts | null>(null);
  const [waveData, setWaveData] = useState<number[]>(() => Array.from({ length: 60 }, () => 80 + Math.random() * 40));
  const [secondaryData, setSecondaryData] = useState<number[]>(() => Array.from({ length: 60 }, () => 60 + Math.random() * 30));

  const protocolTags = TAGS;
  const generateWaveData = useCallback(() => {
    switch (protocol) {
      case 'opcua': {
        const drift = (Math.random() - 0.48) * 2;
        const spike = Math.random() > 0.97 ? 20 : 0;
        return Math.max(60, Math.min(170, waveData[waveData.length - 1] + drift + spike));
      }
      case 'modbus': {
        const step = (Math.random() - 0.5) * 6;
        const jitter = Math.random() > 0.9 ? 15 : 0;
        return Math.max(55, Math.min(180, waveData[waveData.length - 1] + step + jitter));
      }
      case 'mqtt': {
        const baseDrift = (Math.random() - 0.5) * 4;
        const dropout = Math.random() > 0.95 ? -25 : 0;
        const catchup = Math.random() > 0.85 ? 12 : 0;
        return Math.max(50, Math.min(190, waveData[waveData.length - 1] + baseDrift + dropout + catchup));
      }
    }
  }, [protocol, waveData]);


  useEffect(() => {
    if (chartRef.current) {
      chartInst.current = echarts.init(chartRef.current);
      return () => chartInst.current?.dispose();
    }
  }, []);

  useEffect(() => {
    if (!connected) return;
    const timer = setInterval(() => {
      const newVal = Math.max(70, Math.min(140, waveData[waveData.length - 1] + (Math.random() - 0.48) * 8));
      setWaveData(prev => [...prev.slice(1), Math.round(newVal * 10) / 10]);
      const newSec = Math.max(55, Math.min(85, secondaryData[secondaryData.length - 1] + (Math.random() - 0.48) * 5));
      setSecondaryData(prev => [...prev.slice(1), Math.round(newSec * 10) / 10]);
      setMsgCount(c => c + 6);
      setBytesTotal(c => c + Math.floor(Math.random() * 600 + 400));
      setDataQuality(prev => Math.max(85, Math.min(99.9, prev + (Math.random() - 0.5) * 0.5)));
    }, 1200);
    return () => clearInterval(timer);
  }, [connected]);

  useEffect(() => {
    if (!chartInst.current || !connected) return;
    chartInst.current.setOption({
      grid: { left: 45, right: 45, top: 12, bottom: 24 },
      xAxis: { type: 'category', data: Array.from({ length: 60 }, (_, i) => `${i}`), show: false },
      yAxis: { type: 'value', show: false, min: 40, max: 150 },
      series: [
        {
          type: 'line', data: waveData, smooth: true, symbol: 'none',
          lineStyle: { color: '#3b82f6', width: 2.5, shadowBlur: 4, shadowColor: 'rgba(59,130,246,0.3)' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(59,130,246,0.25)' }, { offset: 1, color: 'transparent' }]) },
        },
        {
          type: 'line', data: secondaryData, smooth: true, symbol: 'none',
          lineStyle: { color: '#f59e0b', width: 1.5, type: 'dashed', opacity: 0.6 },
        },
      ],
    }, true);
  }, [waveData, secondaryData, connected]);

  const handleConnect = () => {
    setConnecting(true);
    const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    setLog(l => [...l, `[${now}] ⏳ 连接 ${PROTO_INFO[protocol].endpoint}...`]);
    setTimeout(() => {
      setConnecting(false); setConnected(true);
      setLog(l => [...l, `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] ✅ 已连接 · ${protocol.toUpperCase()} · 订阅 ${protocolTags.length} 点位`]);
    }, 1200);
  };

  const handleDisconnect = () => {
    setConnected(false); setMsgCount(0); setBytesTotal(0);
    setLog(l => [...l, `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] ⏹ 断开连接`]);
  };

  // ===== NARROW MODE (right panel, 380px) =====
  if (narrow) {
    return (
      <div style={{ padding: 12, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Status + connect */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>🔌</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#eef5ff' }}>工业数据采集</span>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#10b981' : '#6b7280', boxShadow: connected ? '0 0 6px rgba(16,185,129,0.5)' : 'none' }} />
          </div>
          {!connected ? (
            <button onClick={handleConnect} disabled={connecting}
              style={{ padding: '5px 14px', borderRadius: 5, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>
              {connecting ? '...' : '⚡ 连接'}
            </button>
          ) : (
            <button onClick={handleDisconnect}
              style={{ padding: '5px 14px', borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: 11 }}>
              断开
            </button>
          )}
        </div>

        {/* Protocol selector */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['opcua', 'modbus', 'mqtt'] as Protocol[]).map(p => (
            <span key={p} onClick={() => { if (!connected) setProtocol(p); }}
              style={{
                flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: connected ? 'default' : 'pointer',
                border: `2px solid ${protocol === p ? PROTO_INFO[p].color : 'rgba(59,130,246,0.15)'}`,
                background: protocol === p ? 'rgba(59,130,246,0.08)' : 'transparent',
                color: protocol === p ? PROTO_INFO[p].color : '#6b8ab5',
                opacity: connected && protocol !== p ? 0.35 : 1,
              }}
            >{PROTO_INFO[p].name}</span>
          ))}
        </div>

        {/* Top metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)', background: 'rgba(15,35,65,0.5)', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#6b8ab5' }}>采样频率</div>
            <div style={{ fontSize: 24, fontFamily: 'var(--font-data)', fontWeight: 700, color: connected ? '#10b981' : '#6b8ab5' }}>
              {connected ? '5' : '--'}<span style={{ fontSize: 11 }}>Hz</span>
            </div>
            <div style={{ fontSize: 8, color: '#6b8ab5' }}>每 200ms 采集一次</div>
          </div>
          <div style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)', background: 'rgba(15,35,65,0.5)', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#6b8ab5' }}>报文速率</div>
            <div style={{ fontSize: 24, fontFamily: 'var(--font-data)', fontWeight: 700, color: connected ? '#60a5fa' : '#6b8ab5' }}>
              {connected ? msgCount : '--'}<span style={{ fontSize: 11 }}>msg</span>
            </div>
            <div style={{ fontSize: 8, color: '#6b8ab5' }}>累计 6 数据点/周期</div>
          </div>
        </div>

        {/* Waveform bars - protocol specific */}
        <div style={{ padding: 10, borderRadius: 8, border: `1px solid ${connected ? (protocol === 'opcua' ? 'rgba(59,130,246,0.3)' : protocol === 'modbus' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)') : 'rgba(59,130,246,0.15)'}`, background: 'rgba(15,35,65,0.5)' }}>
          <div style={{ fontSize: 9, color: '#6b8ab5', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>实时波形</span>
            <span style={{ fontWeight: 700, color: connected ? (protocol === 'opcua' ? '#3b82f6' : protocol === 'modbus' ? '#f59e0b' : '#10b981') : '#6b8ab5' }}>
              {connected ? (protocol === 'opcua' ? 'OPC UA · 800ms/次' : protocol === 'modbus' ? 'Modbus · 400ms/次' : 'MQTT · 1200ms/次') : '未连接'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 50 }}>
            {waveData.slice(-40).map((v, i) => {
              const barColor = !connected ? '#1e3a5f' : protocol === 'opcua' ? '#3b82f6' : protocol === 'modbus' ? '#f59e0b' : '#10b981';
              // Modbus: alternating block patterns simulating register reads
              const blockH = protocol === 'modbus' && connected ? Math.floor((v - 70) / 70 * 48 / 10) * 10 + 4 : Math.max(2, (v - 70) / 70 * 48);
              // MQTT: random gaps simulating packet loss
              const gap = protocol === 'mqtt' && connected && Math.random() > 0.9 ? 0 : 1;
              return (
                <div key={i} style={{
                  flex: 1,
                  height: connected ? `${blockH * gap}px` : '1px',
                  background: barColor,
                  borderRadius: protocol === 'modbus' ? 0 : 1,
                  opacity: protocol === 'opcua' ? 1 : protocol === 'modbus' ? 0.75 : gap ? 1 : 0.2,
                  transition: 'height 0.5s ease',
                }} />
              );
            })}
          </div>
        </div>

        {/* Data points */}
        <div style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)', background: 'rgba(15,35,65,0.5)' }}>
          <div style={{ fontSize: 9, color: '#6b8ab5', marginBottom: 6 }}>数据点 ({protocolTags.length})</div>
          {protocolTags.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 10, borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
              <span style={{ color: '#8a9bb5' }}>{t.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: connected ? '#60a5fa' : '#6b8ab5' }}>
                {connected ? `${t.value.toFixed(1)}${t.unit}` : '---'}
              </span>
            </div>
          ))}
        </div>

        {/* Connection info */}
        <div style={{ fontSize: 9, color: '#6b8ab5', padding: '4px 8px', borderRadius: 4, background: 'rgba(15,35,65,0.3)', textAlign: 'center', borderLeft: `3px solid ${connected ? (protocol === 'opcua' ? '#3b82f6' : protocol === 'modbus' ? '#f59e0b' : '#10b981') : 'transparent'}` }}>
          {PROTO_INFO[protocol].endpoint} &nbsp;·&nbsp; 延迟 {protocol === 'opcua' ? '2.3' : protocol === 'modbus' ? '4.7' : '8.1'}ms &nbsp;·&nbsp; 质量 {dataQuality.toFixed(1)}%
        </div>
      </div>
    );
  }

  // ===== EMBEDDED MODE (compact dashboard panel, no echarts) =====
  if (embedded) {
    return (
      <div style={{
        marginBottom: 'var(--space-3)',
        border: '2px solid #3b82f6',
        borderRadius: 10,
        background: '#081428',
        overflow: 'hidden',
      }}>
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', cursor: 'pointer',
            background: '#0c1e3a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15 }}>🔌</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#eef5ff' }}>工业数据采集</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#10b981' : '#6b7280' }} />
            <span style={{ fontSize: 10, color: '#8a9bb5' }}>{connected ? 'OPC UA 已连接' : '未连接'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!connected ? (
              <button onClick={(e) => { e.stopPropagation(); handleConnect(); }} disabled={connecting}
                style={{ padding: '6px 16px', borderRadius: 5, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>
                {connecting ? '连接中...' : '⚡ 连接模拟器'}
              </button>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); handleDisconnect(); }}
                style={{ padding: '6px 16px', borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: 11 }}>
                断开
              </button>
            )}
            <span style={{ fontSize: 10, color: '#8a9bb5' }}>{expanded ? '收起 ▲' : '展开 ▼'}</span>
          </div>
        </div>

        {expanded && (
          <div style={{ padding: '12px 16px 14px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {(['opcua', 'modbus', 'mqtt'] as Protocol[]).map(p => (
                <span key={p} onClick={() => { if (!connected) setProtocol(p); }}
                  style={{
                    padding: '5px 14px', borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: connected ? 'default' : 'pointer',
                    border: `2px solid ${protocol === p ? PROTO_INFO[p].color : 'rgba(59,130,246,0.2)'}`,
                    background: protocol === p ? 'rgba(59,130,246,0.1)' : 'transparent',
                    color: protocol === p ? PROTO_INFO[p].color : '#6b8ab5',
                  }}
                >{PROTO_INFO[p].icon} {PROTO_INFO[p].name}</span>
              ))}
              {connected && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#6b8ab5', fontFamily: 'var(--font-mono)' }}>📨{msgCount} 📦{(bytesTotal/1024).toFixed(0)}KB</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 220px', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)', background: 'rgba(15,35,65,0.5)' }}>
                <div style={{ fontSize: 9, color: '#6b8ab5', marginBottom: 4 }}>采样频率</div>
                <div style={{ fontSize: 28, fontFamily: 'var(--font-data)', fontWeight: 700, color: connected ? '#10b981' : '#6b8ab5' }}>
                  5<span style={{ fontSize: 12 }}>Hz</span>
                </div>
                <div style={{ fontSize: 8, color: '#6b8ab5' }}>丢包率 {(100-dataQuality).toFixed(2)}%</div>
              </div>
              <div style={{ borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)', background: 'rgba(15,35,65,0.5)', padding: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ fontSize: 9, color: '#6b8ab5', marginBottom: 8 }}>实时波形 · 气缸动作时间</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60 }}>
                  {waveData.slice(-30).map((v, i) => (
                    <div key={i} style={{
                      width: 4, height: connected ? `${Math.max(4, (v - 70) / 70 * 56)}px` : '2px',
                      background: connected ? '#3b82f6' : '#1e3a5f',
                      borderRadius: 2, transition: 'height 0.5s ease',
                    }} />
                  ))}
                </div>
              </div>
              <div style={{ borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)', background: 'rgba(15,35,65,0.5)', padding: '6px 10px' }}>
                <div style={{ fontSize: 9, color: '#6b8ab5', marginBottom: 5 }}>实时数据点</div>
                {protocolTags.slice(0, 5).map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 10 }}>
                    <span style={{ color: '#8a9bb5' }}>{t.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: connected ? '#60a5fa' : '#6b8ab5' }}>
                      {connected ? `${(t.value + (connected ? (Math.random()-0.5)*0.8 : 0)).toFixed(1)}${t.unit}` : '---'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== FULL PAGE MODE =====
  return (
    <div style={{ padding: 'var(--space-5)', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={{
          fontSize: 20, fontWeight: 700, letterSpacing: '0.5px',
          background: 'linear-gradient(90deg, #3b82f6, #10b981)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8,
        }}>🔌 工业数据采集适配器</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          支持 OPC UA / Modbus TCP / MQTT 三种主流工业协议，可接入 PLC、传感器网关、SCADA 系统的实时数据流，
          作为 TADPE 预测引擎的输入源。
        </p>
      </div>

      {/* Protocol selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['opcua', 'modbus', 'mqtt'] as Protocol[]).map(p => (
          <button key={p} onClick={() => { if (!connected) setProtocol(p); }}
            style={{
              padding: '10px 24px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 700,
              cursor: connected ? 'default' : 'pointer',
              border: protocol === p ? '2px solid var(--accent)' : '1px solid var(--border-color)',
              background: protocol === p ? 'var(--accent-dim)' : 'var(--bg-card)',
              color: protocol === p ? 'var(--accent)' : 'var(--text-secondary)',
              opacity: connected && protocol !== p ? 0.4 : 1,
            }}
          >
            {p === 'opcua' ? '🏭 OPC UA' : p === 'modbus' ? '🔧 Modbus TCP' : '📡 MQTT'}
          </button>
        ))}
      </div>

      {/* Connection panel */}
      <div style={{
        display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20,
        padding: '14px 18px', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)', background: 'var(--bg-card)',
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? 'var(--level-normal)' : 'var(--text-dimmed)', boxShadow: connected ? '0 0 8px var(--level-normal)' : 'none' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {connected ? `${protocol.toUpperCase()} 已连接` : '未连接'}
        </span>
        <span style={{ color: 'var(--text-dimmed)', fontSize: 11 }}>{PROTO_INFO[protocol].endpoint}</span>
        <div style={{ flex: 1 }} />
        {connected && (
          <>
            <span style={{ fontSize: 11, color: 'var(--text-dimmed)' }}>📨 {msgCount} 条</span>
            <span style={{ fontSize: 11, color: 'var(--text-dimmed)' }}>📦 {(bytesTotal / 1024).toFixed(1)} KB</span>
          </>
        )}
        {connected ? (
          <button onClick={handleDisconnect} style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: 'var(--level-critical)', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>断开</button>
        ) : (
          <button onClick={handleConnect} disabled={connecting} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: 'var(--gradient-accent)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12, opacity: connecting ? 0.5 : 1 }}>
            {connecting ? '连接中...' : '⚡ 模拟连接'}
          </button>
        )}
      </div>

      {/* Live data monitor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--space-4)', marginBottom: 20 }}>
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontSize: 13, fontWeight: 700, color: 'var(--text-bright)' }}>
            实时数据点 ({protocolTags.length})
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead><tr><th>名称</th><th>地址</th><th>当前值</th><th>趋势</th></tr></thead>
              <tbody>
                {protocolTags.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dimmed)' }}>{t.address}</td>
                    <td style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                      color: t.trend === 'up' && t.value > t.min + (t.max - t.min) * 0.7 ? 'var(--level-warning)' : 'var(--accent-bright)',
                    }}>{t.value}{t.unit}</td>
                    <td><span style={{ fontSize: 10, color: t.trend === 'up' ? '#f59e0b' : t.trend === 'down' ? '#22c55e' : '#6b8ab5', fontWeight: 600 }}>{t.trend === 'up' ? '↑' : t.trend === 'down' ? '↓' : '→'} {t.trend === 'up' ? '上升' : t.trend === 'down' ? '下降' : '稳定'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>📈 双通道实时波形</div>
            <div ref={chartRef} style={{ height: 140 }} />
          </div>
          <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-terminal)', padding: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>📋 连接日志</div>
            <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-terminal)', lineHeight: 1.8 }}>
              {log.length === 0 && <span style={{ color: 'var(--text-dimmed)' }}>等待连接...</span>}
              {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
        </div>
      </div>

      {/* Protocol description */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
        {[
          { icon: '🏭', title: 'OPC UA', desc: '工业互操作性标准，支持复杂数据建模、安全认证和事件订阅。适用于西门子、罗克韦尔等主流 PLC。' },
          { icon: '🔧', title: 'Modbus TCP', desc: '最广泛使用的工业协议，简单可靠。支持读写 Holding Register 和 Input Register。' },
          { icon: '📡', title: 'MQTT', desc: '物联网轻量级发布/订阅协议，适合大规模传感器网络和 5G 边缘网关场景。' },
        ].map(p => (
          <div key={p.title} style={{ padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-elevated)' }}>
            <div style={{ fontSize: 16, marginBottom: 6 }}>{p.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{p.title}</div>
            <div style={{ fontSize: 10, color: 'var(--text-dimmed)', lineHeight: 1.6 }}>{p.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
