export type AlertLevel = 'normal' | 'info' | 'warning' | 'critical';
export type CylinderActionType = 'extend' | 'retract' | 'rotate' | 'reset';
export type QualityFlag = 'good' | 'suspect' | 'dirty';

export interface CylinderAsset {
  uid: string;
  deviceId: string;
  deviceName: string;
  stationId: string;
  lineId: string;
  name: string;
  actionType: CylinderActionType;
  baselineMs: number;
  fixedThresholdMs: number;
  installDate: string;
  healthScore: number;
  alertLevel: AlertLevel;
  faultProbability: number;
}

export interface ActionTimeRecord {
  id: string;
  timestamp: string;
  deviceId: string;
  cylinderUid: string;
  actionType: CylinderActionType;
  executionTimeMs: number;
  dynamicUpperMs: number;
  baselineMs: number;
  fixedThresholdMs: number;
  qualityFlag: QualityFlag;
}

export interface AlertRecord {
  id: string;
  timestamp: string;
  level: Exclude<AlertLevel, 'normal'>;
  cylinderUid: string;
  deviceId: string;
  title: string;
  reason: string;
  suggestion: string;
  status: 'active' | 'acknowledged' | 'closed';
}

export interface MaintenanceRecord {
  id: string;
  cylinderUid: string;
  deviceId: string;
  createdAt: string;
  completedAt?: string;
  type: 'inspection' | 'seal_replacement' | 'lubrication' | 'air_pressure_check';
  result: string;
  operator: string;
}

export interface DashboardKpis {
  totalCylinders: number;
  averageHealthScore: number;
  infoAlerts: number;
  warningAlerts: number;
  criticalAlerts: number;
  pendingMaintenance: number;
  dataGoodRate: number;
}

export interface RiskItem {
  cylinderUid: string;
  deviceId: string;
  deviceName: string;
  stationId: string;
  name: string;
  healthScore: number;
  alertLevel: AlertLevel;
  faultProbability: number;
  latestExecutionTimeMs: number;
  baselineMs: number;
  dynamicUpperMs: number;
  fixedThresholdMs: number;
  reason: string;
}

export interface StationHealth {
  stationId: string;
  deviceId: string;
  healthScore: number;
  alertLevel: AlertLevel;
}

export interface DashboardSnapshot {
  generatedAt: string;
  cylinders: CylinderAsset[];
  records: ActionTimeRecord[];
  alerts: AlertRecord[];
  maintenance: MaintenanceRecord[];
  kpis: DashboardKpis;
  topRisks: RiskItem[];
  stationHealth: StationHealth[];
  selectedCylinderUid: string;
}

export interface ChatRequest {
  requestId: string;
  userText: string;
  selectedCylinderUid?: string;
  includeSnapshot: boolean;
}

export interface ChatDeltaEvent {
  requestId: string;
  delta: string;
}

export interface ChatDoneEvent {
  requestId: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  offline?: boolean;
}

export interface ChatErrorEvent {
  requestId: string;
  message: string;
  code?: string;
}

export interface ExtensionEvent {
  id: string;
  source: 'popup' | 'content-script';
  page: {
    url: string;
    title: string;
  };
  selectedText?: string;
  note?: string;
  createdAt: string;
}

export interface AppStatus {
  llm: {
    enabled: boolean;
    model: string;
  };
  bridge: {
    port: number;
    tokenConfigured: boolean;
  };
}

export type AppView = 'dashboard' | 'algorithm' | 'bigscreen' | 'security' | 'benchmark' | 'roiCalculator';

export type AlgorithmPhase =
  | 'idle'
  | 'feature_extraction'
  | 'attention_encoding'
  | 'physics_constraint'
  | 'conformal_prediction'
  | 'decision_fusion'
  | 'complete';

export interface AlgorithmMetrics {
  rul: number;
  faultProbability: number;
  degradationRate: number;
  confidence: number;
  healthScore: number;
  constraintLoss: number;
  iteration: number;
  maxIterations: number;
}

export interface ToolParam {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  required?: boolean;
  default?: string | number | boolean;
  placeholder?: string;
  options?: string[];
}

export interface ToolInfo {
  id: string;
  name: string;
  script: string;
  description: string;
  icon: string;
  params: ToolParam[];
}

export interface ToolOutputEvent {
  runId: string;
  stream: 'stdout' | 'stderr';
  line: string;
}

export interface ToolCompleteEvent {
  runId: string;
  exitCode: number | null;
  signal: string | null;
}
