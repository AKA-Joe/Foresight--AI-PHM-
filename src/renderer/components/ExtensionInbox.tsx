import { useMemo, useState, useCallback } from 'react';
import type { ExtensionEvent } from '../../shared/types';

interface Props { events: ExtensionEvent[] }
interface MockEvent { id: string; title: string; summary: string; detail: string; timestamp: string; source: string; }

const mockEvents: MockEvent[] = [
  { id: 'mock-1', title: '设备手册 - 气缸维护指南', summary: 'SMC CG系列气缸维护手册节选，包含密封件更换周期和注意事项。', detail: '适用型号: CG1BN32-100Z, CG1BN40-150Z\n密封件更换周期: 1000万次或12个月\n润滑方式: ISO VG32 液压油\n注意事项: 更换密封件后需进行3次空载磨合测试', timestamp: new Date(Date.now() - 3600000).toISOString(), source: '网页推送' },
  { id: 'mock-2', title: '供应商召回通知 - 密封圈批次', summary: '供应商B批次密封圈存在早期磨损风险，涉及注塑机A-3#当前安装批次。', detail: '涉及批次: B2024-105 ~ B2024-132\n风险等级: 中等\n建议行动: 1.停机检查该批次密封圈 2.联系供应商更换 3.加强监测频率至每2小时一次\n涉及设备: 注塑机A-3# (CYL-07, CYL-12)', timestamp: new Date(Date.now() - 7200000).toISOString(), source: '网页推送' },
  { id: 'mock-3', title: '行业案例：同类设备故障分析', summary: '某制造企业同类注塑机气缸故障案例复盘，退化模式与当前设备高度相似。', detail: '行业: 汽车零部件注塑\n故障模式: 气缸密封件早期磨损\n根本原因: 压缩空气中含水量超标\n解决方案: 加装冷冻式干燥机，维护周期缩短至1月/次\n参考价值: 高', timestamp: new Date(Date.now() - 10800000).toISOString(), source: '插件推送' },
  { id: 'mock-4', title: '新版本发布 - TADPE v2.1.0', summary: '预测引擎升级：新增多尺度特征提取模块，劣化预测精度提升12%。', detail: '版本: v2.1.0\n新增: 多尺度时间注意力机制\n优化: 保形预测区间缩小15%\n修复: 边缘节点断连后自动重连\n兼容性: 需更新边缘网关至 v1.3+', timestamp: new Date(Date.now() - 14400000).toISOString(), source: '系统推送' },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  return mins < 60 ? mins + '分钟前' : mins < 1440 ? Math.floor(mins / 60) + '小时前' : Math.floor(mins / 1440) + '天前';
}

function eventIcon(title: string): string {
  if (title.includes('手册')) return '📄'; if (title.includes('召回')) return '⚠️'; if (title.includes('案例')) return '📋'; return '🔍';
}

type SourceFilter = 'all' | '网页推送' | '插件推送' | '系统推送';

export default function ExtensionInbox({ events }: Props) {
  const baseEvents = useMemo(() => (events.length > 0 ? events : mockEvents), [events]) as any[];
  const [items, setItems] = useState<any[]>(baseEvents);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [showUndo, setShowUndo] = useState<string | null>(null);

  const filtered = sourceFilter === 'all' ? items : items.filter(e => e.source === sourceFilter);
  const unreadCount = items.length - readIds.size;

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItems(prev => prev.filter(i => i.id !== id));
    setShowUndo(id);
    setTimeout(() => setShowUndo(null), 5000);
  };

  const handleUndo = () => {
    setItems(baseEvents);
    setShowUndo(null);
  };

  const handleNewPush = () => {
    const newId = `mock-new-${Date.now()}`;
    const newItem = {
      id: newId, title: 'AI 预测告警 - CYL-03 趋势劣化', summary: 'CYL-03 (定位推送) 连续8次超动态上界，退化速率升至 1.7ms/天。', detail: '告警等级: 预警\n关联设备: 注塑机A-3#\n当前健康分: 52 (-8 较昨日)\n建议: 安排周末检修，优先检查导向滑块\n状态: 待处理', timestamp: new Date().toISOString(), source: '系统推送',
    };
    setItems(prev => [newItem, ...prev]);
    setReadIds(prev => new Set(prev));
    setExpandedId(newId);
  };

  const sources: SourceFilter[] = ['all', '网页推送', '插件推送', '系统推送'];

  return (
    <div className="extension-inbox">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dimmed)' }}>
          收件箱 · {filtered.length}/{items.length}
          {unreadCount > 0 && <span style={{ color: 'var(--level-warning)', marginLeft: 4 }}>{unreadCount} 未读</span>}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleNewPush} style={{ fontSize: 9, color: '#fff', background: '#3b82f6', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontWeight: 600 }}>+ 新推送</button>
          {unreadCount > 0 && <button onClick={() => setReadIds(new Set(items.map(e => e.id)))} style={{ fontSize: 9, color: 'var(--accent)', background: 'var(--accent-dim)', border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontWeight: 600 }}>全部已读</button>}
        </div>
      </div>

      {/* Source filter chips */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 8, flexWrap: 'wrap' }}>
        {sources.map(s => (
          <span key={s} onClick={() => setSourceFilter(s)} style={{ padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 700, cursor: 'pointer', background: sourceFilter === s ? 'var(--accent-dim)' : 'transparent', color: sourceFilter === s ? 'var(--accent)' : 'var(--text-dimmed)', border: '1px solid ' + (sourceFilter === s ? 'var(--accent)' : 'var(--border-color)') }}>
            {s === 'all' ? '全部' : s}
          </span>
        ))}
      </div>

      {/* Undo toast */}
      {showUndo && (
        <div style={{ fontSize: 9, color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 4, background: 'var(--bg-elevated)', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-color)' }}>
          <span>已移除 1 条推送</span>
          <button onClick={handleUndo} style={{ fontSize: 9, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}>撤销</button>
        </div>
      )}

      {filtered.map((event: any) => {
        const isExpanded = expandedId === event.id;
        const isUnread = !readIds.has(event.id);
        const isNew = event.id.startsWith('mock-new-');
        return (
          <div key={event.id} style={{ marginBottom: 6, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid ' + (isExpanded ? 'var(--accent)' : isNew ? 'rgba(59,130,246,0.3)' : 'var(--border-color)'), borderLeft: '3px solid ' + (isNew ? '#3b82f6' : isUnread ? 'var(--accent)' : 'transparent'), background: 'var(--bg-elevated)', transition: 'all 0.2s', position: 'relative' }}
            onClick={() => { setExpandedId(isExpanded ? null : event.id); setReadIds(prev => new Set(prev).add(event.id)); }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{eventIcon(event.title)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: isUnread ? 800 : 600, color: 'var(--text-bright)', marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{event.title}{isNew && <span style={{ fontSize: 8, color: '#3b82f6', marginLeft: 4, fontWeight: 700 }}>NEW</span>}</span>
                  <span style={{ fontSize: 9, fontWeight: 400, color: isExpanded ? 'var(--accent)' : 'transparent', fontFamily: 'var(--font-mono)' }}>▲</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {isExpanded ? (event.detail || event.summary).split('\n').map((l: string, i: number) => <span key={i}>{l}<br /></span>) : event.summary}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 9, color: 'var(--text-dimmed)' }}>
                  <span>{relativeTime(event.timestamp)}</span>
                  <span style={{ padding: '1px 5px', borderRadius: 3, background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 600, fontSize: 8 }}>{event.source}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-dimmed)' }}>
                    {isExpanded ? '收起' : '详情 →'}
                  </span>
                  <button onClick={(e) => handleDismiss(e, event.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dimmed)', fontSize: 12, padding: '0 2px', opacity: 0.4 }} title="关闭">✕</button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ padding: 30, textAlign: 'center', fontSize: 11, color: 'var(--text-dimmed)', lineHeight: 2 }}>
          {sourceFilter !== 'all' ? '该分类暂无推送' : '📭 暂无推送消息\n点击上方"+ 新推送"模拟接收'}
        </div>
      )}
    </div>
  );
}
