import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatDeltaEvent, ChatDoneEvent, ChatErrorEvent } from '../../shared/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  offline?: boolean;
  pending?: boolean;
}

interface Props {
  selectedCylinderUid?: string;
}

const quickPrompts = [
  '请分析当前最高风险气缸，并给出维修建议。',
  '请解释当前告警规则和触发原因。',
  '请根据当前告警生成班组交接摘要。',
  '请用适合领导汇报的方式总结项目价值。',
];

export default function ChatPanel({ selectedCylinderUid }: Props) {
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
            {msg.content || '正在分析当前趋势与告警上下文...'}
            {msg.offline ? '\n\n（当前为离线 mock 模式）' : ''}
          </div>
        ))}
      </div>

      <div className="chat-input-area">
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void sendPrompt(input);
            }
          }}
        />
        <button className="chat-send-btn" disabled={sending || !input.trim()} onClick={() => void sendPrompt(input)}>
          发送
        </button>
      </div>
    </>
  );
}
