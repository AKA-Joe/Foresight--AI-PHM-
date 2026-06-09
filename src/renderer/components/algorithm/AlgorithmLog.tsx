import { useEffect, useRef } from 'react';

interface Props {
  logs: string[];
}

export default function AlgorithmLog({ logs }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div className="algo-log glass-panel">
      <div className="algo-log-header">
        <span className="algo-log-title">引擎日志</span>
        <span className={`algo-log-pulse ${logs.length > 0 ? 'active' : ''}`} />
      </div>
      <div className="algo-log-content" ref={scrollRef}>
        {logs.length === 0 ? (
          <div className="algo-log-empty">等待启动...</div>
        ) : (
          logs.map((line, idx) => (
            <div key={idx} className="algo-log-line">{line}</div>
          ))
        )}
      </div>
    </div>
  );
}
