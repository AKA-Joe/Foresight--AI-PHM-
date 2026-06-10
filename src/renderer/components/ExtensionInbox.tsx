import type { ExtensionEvent } from '../../shared/types';

interface Props {
  events: ExtensionEvent[];
}

export default function ExtensionInbox({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="extension-inbox">
        <div className="ext-empty">
          暂无浏览器插件消息。\n\n可在 Chrome / Edge 加载 extension/ 目录后，
          使用插件把网页标题、URL 和选中文本发送到本地 Electron 应用。
        </div>
      </div>
    );
  }

  return (
    <div className="extension-inbox">
      {events.map((event) => (
        <div key={event.id} className="ext-item">
          <div className="ext-item-title">{event.page.title || '未命名页面'}</div>
          <div className="ext-item-url">{event.page.url}</div>
          {event.note ? (
            <div style={{ color: '#3b82f6', fontSize: 11, marginBottom: 6 }}>备注：{event.note}</div>
          ) : null}
          {event.selectedText ? <div className="ext-item-text">{event.selectedText}</div> : null}
          <div className="ext-item-time">
            来源：{event.source === 'popup' ? '插件弹窗' : '内容脚本'} · {new Date(event.createdAt).toLocaleString('zh-CN')}
          </div>
        </div>
      ))}
    </div>
  );
}
