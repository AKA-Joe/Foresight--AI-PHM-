import { useRef, useEffect, useState } from 'react';
import type { AppView } from '../../shared/types';

const tabs: { key: AppView; label: string }[] = [
  { key: 'dashboard', label: '预测维护驾驶舱' },
  { key: 'algorithm', label: 'TADPE 引擎' },
  { key: 'bigscreen', label: '数字孪生大屏' },
  { key: 'security', label: '网络态势感知' },
];

interface Props {
  current: AppView;
  onChange: (view: AppView) => void;
  isFullscreen: boolean;
}

export default function NavBar({ current, onChange, isFullscreen }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector(`[data-view="${current}"]`) as HTMLElement | null;
    if (activeBtn) {
      setIndicator({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [current]);

  if (isFullscreen) return null;

  return (
    <nav className="nav-bar" ref={containerRef}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          data-view={tab.key}
          className={`nav-tab ${current === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
      <div
        className="nav-indicator"
        style={{ left: indicator.left, width: indicator.width }}
      />
    </nav>
  );
}
