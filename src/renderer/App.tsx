import { useEffect, useState } from 'react';
import type { AppView, DashboardSnapshot, ExtensionEvent, AppStatus } from '../shared/types';
import NavBar from './components/NavBar';
import HudClock from './components/HudClock';
import SplashScreen from './components/SplashScreen';
import KpiCards from './components/KpiCards';
import TrendChart from './components/TrendChart';
import AlertDistributionChart from './components/AlertDistributionChart';
import RiskRankingChart from './components/RiskRankingChart';
import EquipmentHeatmap from './components/EquipmentHeatmap';
import AlertsTable from './components/AlertsTable';
import MaintenanceTable from './components/MaintenanceTable';
import AiDiagnosisPanel from './components/AiDiagnosisPanel';
import DataQueryPanel from './components/DataQueryPanel';
import EquipmentDetailPanel from './components/EquipmentDetailPanel';
import ExtensionInbox from './components/ExtensionInbox';
import WorkOrderPanel from './components/WorkOrderPanel';
import AlgorithmPanel from './components/algorithm/AlgorithmPanel';
import BigScreenView from './components/bigscreen/BigScreenView';
import NetworkAwarenessPanel from './components/security/NetworkAwarenessPanel';
import IndustryBenchmarkPanel from './components/IndustryBenchmarkPanel';
import QuickQuery from './components/QuickQuery';
import DataAcquisition from './components/DataAcquisition';
import ROICalculator from './components/ROICalculator';

type RightPanelTab = 'diagnosis' | 'dataquery' | 'equipment' | 'workorder' | 'extension' | 'datasource';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [selectedCylinderUid, setSelectedCylinderUid] = useState<string | undefined>(undefined);
  const [extensionEvents, setExtensionEvents] = useState<ExtensionEvent[]>([]);
  const [activePanel, setActivePanel] = useState<RightPanelTab>('diagnosis');
  const [showToast, setShowToast] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

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

    // Listen for intra-panel events
    const handleSelectCylinder = (e: Event) => {
      const uid = (e as CustomEvent<string>).detail;
      if (uid) setSelectedCylinderUid(uid);
    };
    const handleSwitchPanel = (e: Event) => {
      const tab = (e as CustomEvent<string>).detail;
      if (tab === 'diagnosis' || tab === 'dataquery' || tab === 'equipment' || tab === 'workorder' || tab === 'extension' || tab === 'datasource') {
        setActivePanel(tab);
      }
    };
    window.addEventListener('selectCylinder', handleSelectCylinder);
    window.addEventListener('switchPanel', handleSwitchPanel);

    // PPT launch button → replay splash animation
    const handleReplaySplash = () => setShowSplash(true);
    window.addEventListener('replay-splash', handleReplaySplash);

    return () => {
      mounted = false;
      offExtension();
      window.removeEventListener('selectCylinder', handleSelectCylinder);
      window.removeEventListener('switchPanel', handleSwitchPanel);
      window.removeEventListener('replay-splash', handleReplaySplash);
    };
  }, []);

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  if (!snapshot || !status) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="skeleton-loader">正在加载预测性维护演示平台...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Top bar container — wraps title bar + header */}
      <div className="top-bar-container">
        <div className="title-bar">
          <div className="title-bar-drag" />
          <div className="title-bar-controls">
            <button className="tb-btn tb-min" onClick={() => window.predMaint.window.minimize()} title="最小化">
              <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.2"/></svg>
            </button>
            <button className="tb-btn tb-max" onClick={() => window.predMaint.window.maximize()} title="最大化">
              <svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>
            </button>
            <button className="tb-btn tb-close" onClick={() => window.predMaint.window.close()} title="关闭">
              <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.2"/><line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.2"/></svg>
            </button>
          </div>
        </div>
        <header className="header">
        <div className="header-title">
          <svg className="logo-icon" width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="9" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" />
            <circle cx="11" cy="11" r="5" stroke="#f59e0b" strokeWidth="1.5" />
            <circle cx="11" cy="11" r="2" fill="#60a5fa">
              <animate attributeName="opacity" values="1;0.4;1" dur="2.5s" repeatCount="indefinite" />
            </circle>
          </svg>
          <div>
            <h1>明鉴——AI+设备预测性维护平台</h1>
            <div className="subtitle">AI 驱动的设备预测与健康管理</div>
          </div>
        </div>
        <NavBar current={currentView} onChange={setCurrentView} />
        <div className="header-right">
          <div className="role-badge">
            <span className="dot" /> 管理员
          </div>
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
          <HudClock />
        </div>
      </header>
      </div>{/* end top-bar-container */}

      <div className="view-container">
        <div className={`view-panel ${currentView === 'dashboard' ? 'view-active' : 'view-inactive'}`}>
          <div className="main-layout">
            <main className="dashboard">
              <KpiCards snapshot={snapshot} />
              <QuickQuery snapshot={snapshot} onSelectCylinder={setSelectedCylinderUid} />
              <AlertDistributionChart snapshot={snapshot} />
              <div className="charts-grid">
                <RiskRankingChart snapshot={snapshot} onSelect={setSelectedCylinderUid} />
                <EquipmentHeatmap snapshot={snapshot} onSelect={setSelectedCylinderUid} />
              </div>
              <TrendChart
                selectedCylinderUid={selectedCylinderUid}
                cylinders={snapshot.cylinders}
                records={snapshot.records}
              />
              <div className="tables-grid">
                <AlertsTable snapshot={snapshot} onSelect={setSelectedCylinderUid} />
                <MaintenanceTable snapshot={snapshot} />
              </div>
            </main>
            <aside className="right-panel">
              <div className="panel-tabs">
                <button className={`panel-tab ${activePanel === 'diagnosis' ? 'active' : ''}`} onClick={() => setActivePanel('diagnosis')}>
                  🧠 AI诊断
                </button>
                <button className={`panel-tab ${activePanel === 'dataquery' ? 'active' : ''}`} onClick={() => setActivePanel('dataquery')}>
                  📊 数据查询
                </button>
                <button className={`panel-tab ${activePanel === 'equipment' ? 'active' : ''}`} onClick={() => setActivePanel('equipment')}>
                  🔧 设备详情
                </button>
                <button className={`panel-tab ${activePanel === 'workorder' ? 'active' : ''}`} onClick={() => setActivePanel('workorder')}>
                  📋 工单调度
                </button>
                <button className={`panel-tab ${activePanel === 'extension' ? 'active' : ''}`} onClick={() => setActivePanel('extension')}>
                  📬 插件
                </button>
                <button className={`panel-tab ${activePanel === 'datasource' ? 'active' : ''}`} onClick={() => setActivePanel('datasource')}>
                  🔌 数据采集
                </button>
              </div>
              <div className="panel-content">
                {activePanel === 'diagnosis' && <AiDiagnosisPanel snapshot={snapshot} selectedCylinderUid={selectedCylinderUid} />}
                {activePanel === 'dataquery' && <DataQueryPanel snapshot={snapshot} />}
                {activePanel === 'equipment' && <EquipmentDetailPanel snapshot={snapshot} selectedCylinderUid={selectedCylinderUid} />}
                {activePanel === 'workorder' && <WorkOrderPanel compact />}
                {activePanel === 'extension' && <ExtensionInbox events={extensionEvents} />}
                {activePanel === 'datasource' && <DataAcquisition narrow />}
              </div>
            </aside>
          </div>
        </div>

        <div className={`view-panel ${currentView === 'algorithm' ? 'view-active' : 'view-inactive'}`}>
          {currentView === 'algorithm' && <AlgorithmPanel />}
        </div>

        <div className={`view-panel ${currentView === 'bigscreen' ? 'view-active' : 'view-inactive'}`}>
          {currentView === 'bigscreen' && <BigScreenView />}
        </div>

        <div className={`view-panel ${currentView === 'security' ? 'view-active' : 'view-inactive'}`}>
          {currentView === 'security' && <NetworkAwarenessPanel />}
        </div>

        <div className={`view-panel ${currentView === 'benchmark' ? 'view-active' : 'view-inactive'}`}>
          {currentView === 'benchmark' && <IndustryBenchmarkPanel />}
        </div>

        <div className={`view-panel ${currentView === 'roiCalculator' ? 'view-active' : 'view-inactive'}`}>
          {currentView === 'roiCalculator' && <ROICalculator />}
        </div>
      </div>

      {showToast && (
        <div className="toast-notification">按 ESC 退出全屏</div>
      )}
    </div>
  );
}
