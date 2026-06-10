import { useEffect, useMemo, useState, useCallback } from 'react';
import type { AppView, DashboardSnapshot, ExtensionEvent, AppStatus } from '../shared/types';
import NavBar from './components/NavBar';
import HudClock from './components/HudClock';
import KpiCards from './components/KpiCards';
import TrendChart from './components/TrendChart';
import AlertDistributionChart from './components/AlertDistributionChart';
import RiskRankingChart from './components/RiskRankingChart';
import EquipmentHeatmap from './components/EquipmentHeatmap';
import AlertsTable from './components/AlertsTable';
import MaintenanceTable from './components/MaintenanceTable';
import ChatPanel from './components/ChatPanel';
import ExtensionInbox from './components/ExtensionInbox';
import AlgorithmPanel from './components/algorithm/AlgorithmPanel';
import BigScreenView from './components/bigscreen/BigScreenView';
import NetworkAwarenessPanel from './components/security/NetworkAwarenessPanel';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [selectedCylinderUid, setSelectedCylinderUid] = useState<string | undefined>(undefined);
  const [extensionEvents, setExtensionEvents] = useState<ExtensionEvent[]>([]);
  const [activePanel, setActivePanel] = useState<'chat' | 'extension'>('chat');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [dashboardData, appStatus, extEvents] = await Promise.all([
        window.predMaint.dashboard.getSnapshot(),
        window.predMaint.app.getStatus(),
        window.predMaint.extension.listEvents(),
      ]);

      if (!mounted) return;
      setSnapshot(dashboardData);
      setSelectedCylinderUid(dashboardData.selectedCylinderUid);
      setStatus(appStatus);
      setExtensionEvents(extEvents);
    };

    load();

    const offExtension = window.predMaint.extension.onEvent((event) => {
      setExtensionEvents((prev) => [event, ...prev.filter((item) => item.id !== event.id)]);
      setActivePanel('extension');
    });

    return () => {
      mounted = false;
      offExtension();
    };
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } else {
      document.exitFullscreen();
    }
  }, []);

  const selectedCylinder = useMemo(() => {
    if (!snapshot || !selectedCylinderUid) return undefined;
    return snapshot.cylinders.find((item) => item.uid === selectedCylinderUid);
  }, [snapshot, selectedCylinderUid]);

  if (!snapshot || !status) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="skeleton-loader">正在加载预测性维护演示平台...</div>
      </div>
    );
  }

  return (
    <div className={`app-container ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      <header className={`header ${isFullscreen ? 'header-hidden' : ''}`}>
        <div className="header-title">
          <svg className="logo-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" />
            <circle cx="10" cy="10" r="4" stroke="#f59e0b" strokeWidth="1.5" />
            <circle cx="10" cy="10" r="1.5" fill="#60a5fa">
              <animate attributeName="opacity" values="1;0.4;1" dur="2.5s" repeatCount="indefinite" />
            </circle>
          </svg>
          <div>
            <h1>非标设备 5G+AI 预测性维护演示平台</h1>
            <div className="subtitle">动作执行时间 · 动态阈值 · 告警闭环 · AI 运维助手</div>
          </div>
          <span className="version-badge">v1.0</span>
        </div>
        <NavBar current={currentView} onChange={setCurrentView} isFullscreen={isFullscreen} />
        <div className="header-right">
          <div className="header-status">
            <div className="status-indicator">
              <span className={`status-dot ${status.llm.enabled ? 'online' : 'offline'}`} />
              <span>LLM：{status.llm.enabled ? status.llm.model : '离线模式'}</span>
            </div>
            <div className="status-indicator">
              <span className={`status-dot ${status.bridge.tokenConfigured ? 'online' : 'offline'}`} />
              <span>桥接：{status.bridge.port}</span>
            </div>
          </div>
          <button className="fullscreen-btn" onClick={toggleFullscreen} title={isFullscreen ? '退出全屏' : '全屏'}>
            {isFullscreen ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 1H1v4M9 1h4v4M5 13H1V9M9 13h4V9"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9"/></svg>
            )}
          </button>
          <HudClock />
        </div>
      </header>

      {isFullscreen && (
        <div className="fullscreen-hover-zone" onMouseEnter={() => {}} />
      )}

      <div className="view-container">
        <div className={`view-panel ${currentView === 'dashboard' ? 'view-active' : 'view-inactive'}`}>
          <div className="main-layout">
            <main className="dashboard">
              <KpiCards snapshot={snapshot} />
              <div className="charts-grid">
                <AlertDistributionChart snapshot={snapshot} />
                <RiskRankingChart snapshot={snapshot} onSelect={setSelectedCylinderUid} />
              </div>
              <TrendChart
                snapshot={snapshot}
                selectedCylinderUid={selectedCylinderUid}
                cylinders={snapshot.cylinders}
                records={snapshot.records}
              />
              <div className="charts-grid">
                <EquipmentHeatmap snapshot={snapshot} />
                <div className="chart-card">
                  <div className="chart-title">当前选中气缸</div>
                  <div className="cylinder-detail">
                    {selectedCylinder ? (
                      <>
                        <div className="cylinder-detail-name">
                          <span className={`cylinder-detail-dot ${selectedCylinder.healthScore > 70 ? 'dot-normal' : selectedCylinder.healthScore > 40 ? 'dot-warning' : 'dot-critical'}`} />
                          {selectedCylinder.name}
                        </div>
                        <div className="cylinder-detail-row"><span className="cylinder-detail-label">气缸 UID</span><span className="cylinder-detail-value">{selectedCylinder.uid}</span></div>
                        <div className="cylinder-detail-row"><span className="cylinder-detail-label">设备</span><span className="cylinder-detail-value">{selectedCylinder.deviceName}</span></div>
                        <div className="cylinder-detail-row"><span className="cylinder-detail-label">工位</span><span className="cylinder-detail-value">{selectedCylinder.stationId}</span></div>
                        <div className="cylinder-detail-row"><span className="cylinder-detail-label">基线</span><span className="cylinder-detail-value">{selectedCylinder.baselineMs} ms</span></div>
                        <div className="cylinder-detail-row"><span className="cylinder-detail-label">固定阈值</span><span className="cylinder-detail-value">{selectedCylinder.fixedThresholdMs} ms</span></div>
                        <div className="cylinder-detail-row"><span className="cylinder-detail-label">健康评分</span><span className={`cylinder-detail-value ${selectedCylinder.healthScore > 70 ? 'val-normal' : selectedCylinder.healthScore > 40 ? 'val-warning' : 'val-critical'}`}>{selectedCylinder.healthScore}/100</span></div>
                        <div className="cylinder-detail-row"><span className="cylinder-detail-label">故障概率</span><span className={`cylinder-detail-value ${selectedCylinder.faultProbability < 30 ? 'val-normal' : selectedCylinder.faultProbability < 60 ? 'val-warning' : 'val-critical'}`}>{selectedCylinder.faultProbability}%</span></div>
                      </>
                    ) : (
                      <div className="cylinder-detail-empty">请从风险排行或告警表中选择气缸</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="tables-grid">
                <AlertsTable snapshot={snapshot} onSelect={setSelectedCylinderUid} />
                <MaintenanceTable snapshot={snapshot} />
              </div>
            </main>
            <aside className="right-panel">
              <div className="panel-tabs">
                <button className={`panel-tab ${activePanel === 'chat' ? 'active' : ''}`} onClick={() => setActivePanel('chat')}>
                  AI 运维助手
                </button>
                <button className={`panel-tab ${activePanel === 'extension' ? 'active' : ''}`} onClick={() => setActivePanel('extension')}>
                  插件收件箱
                </button>
              </div>
              <div className="panel-content">
                {activePanel === 'chat' ? (
                  <ChatPanel selectedCylinderUid={selectedCylinderUid} />
                ) : (
                  <ExtensionInbox events={extensionEvents} />
                )}
              </div>
            </aside>
          </div>
        </div>

        <div className={`view-panel ${currentView === 'algorithm' ? 'view-active' : 'view-inactive'}`}>
          {currentView === 'algorithm' && <AlgorithmPanel />}
        </div>

        <div className={`view-panel ${currentView === 'bigscreen' ? 'view-active' : 'view-inactive'}`}>
          {currentView === 'bigscreen' && <BigScreenView isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} />}
        </div>

        <div className={`view-panel ${currentView === 'security' ? 'view-active' : 'view-inactive'}`}>
          {currentView === 'security' && <NetworkAwarenessPanel />}
        </div>
      </div>

      {showToast && (
        <div className="toast-notification">按 ESC 退出全屏</div>
      )}
    </div>
  );
}
