import { useRef, useEffect, useState, type ReactNode } from 'react';
import type { AppView } from '../../shared/types';

const tabs: { key: AppView; label: string; icon: ReactNode }[] = [
  {
    key: 'dashboard',
    label: '预测维护驾驶舱',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  },
  {
    key: 'algorithm',
    label: 'TADPE 引擎',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.4V11h3a3 3 0 0 1 3 3v1.6c1.2.6 2 1.9 2 3.4a4 4 0 1 1-6-3.4V14a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v1.6A4 4 0 1 1 4 19c0-1.5.8-2.8 2-3.4V14a3 3 0 0 1 3-3h3V9.4A4 4 0 0 1 12 2z"/></svg>,
  },
  {
    key: 'bigscreen',
    label: '数字孪生大屏',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  },
  {
    key: 'security',
    label: '网络态势感知',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  },
  {
    key: 'benchmark',
    label: '行业基准库',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 4 4-6"/></svg>,
  },
  {
    key: 'roiCalculator',
    label: 'ROI分析',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 10l4-4 4 4M8 14l4 4 4-4"/></svg>,
  },
];

interface Props {
  current: AppView;
  onChange: (view: AppView) => void;
  isFullscreen?: boolean;
}

export default function NavBar({ current, onChange }: Props) {
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

  return (
    <nav className="nav-bar" ref={containerRef}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          data-view={tab.key}
          className={`nav-tab ${current === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
      <div
        className="nav-indicator"
        style={{ left: indicator.left, width: indicator.width }}
      />
    </nav>
  );
}
