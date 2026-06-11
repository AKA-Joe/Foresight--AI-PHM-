## 一、核心数据类型定义

### 1.1 CylinderStatus（气缸设备状态）

```typescript
interface CylinderStatus {
  uid: string;              // 全局唯一标识, 格式: CSKG-{LINE}-{STATION}-{FUNC}-CYL{NN}
  name: string;             // 中文展示名称, 例: "推送定位气缸"
  line: string;             // 所属产线, 例: "LINE-A"
  station: string;          // 所属工位, 例: "ST-01"
  device: string;           // 所属设备, 例: "DEV-A01"
  baselineMs: number;       // 基线动作执行时间(ms), 例: 85
  fixedThreshold: number;   // 固定告警阈值(ms) = baselineMs × 1.4
  dynamicUpperMs: number;   // 动态上阈值(ms) = μ(7d) + 2.5σ + trend_comp
  latestMs: number;         // 最近一次动作执行时间(ms)
  healthScore: number;      // 健康评分 0-100 (100=全新)
  faultProbability: number; // 故障概率 0-100 (100=必然故障)
  alertLevel: AlertLevel;   // 当前告警等级
}

type AlertLevel = 'normal' | 'info' | 'warning' | 'critical';
```

### 1.2 Alert（告警记录）

```typescript
interface Alert {
  id: string;               // 告警唯一ID
  cylinderUid: string;      // 关联气缸UID
  level: 'critical' | 'warning' | 'info';
  title: string;            // 告警标题描述
  timestamp: string;        // ISO 8601 时间戳
  status: 'active' | 'acknowledged' | 'closed';
}
```

### 1.3 MaintenanceRecord（维护记录）

```typescript
interface MaintenanceRecord {
  id: string;
  cylinderUid: string;
  type: 'preventive' | 'corrective' | 'emergency';
  operator: string;         // 操作人姓名
  timestamp: string;        // ISO 8601
  result: string;           // 维护结果描述
}
```

### 1.4 TimeSeriesPoint（时序数据点）

```typescript
interface TimeSeriesPoint {
  cylinderUid: string;
  timestamp: string;
  valueMs: number;          // 实际动作执行时间
  baseline: number;         // 基线值（该点的参考基线）
  dynamicThreshold: number; // 该时刻的动态阈值
  fixedThreshold: number;   // 固定阈值（恒定）
}
```

### 1.5 DashboardSnapshot（仪表盘快照）

```typescript
interface DashboardSnapshot {
  cylinders: CylinderStatus[];
  alerts: Alert[];
  maintenanceRecords: MaintenanceRecord[];
  kpi: DashboardKPI;
  timeSeries: TimeSeriesPoint[];
}

interface DashboardKPI {
  totalCylinders: number;
  avgHealth: number;
  activeAlerts: {
    critical: number;
    warning: number;
    info: number;
  };
  pendingMaintenance: number;
  dataQuality: number;      // 0-100 百分比
}
```

### 1.6 Chat 相关类型

```typescript
interface ChatRequest {
  requestId: string;        // nanoid 生成
  userText: string;         // 用户输入文本
  selectedCylinderUid?: string; // 可选：聚焦的设备
  includeSnapshot: boolean; // 是否携带仪表盘快照
}

interface ChatDeltaEvent {
  requestId: string;
  delta: string;            // 文本增量片段
}

interface ChatDoneEvent {
  requestId: string;
  offline?: boolean;        // 是否为离线回答
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

interface ChatErrorEvent {
  requestId: string;
  message: string;          // 用户可读错误信息
  code: string;             // 错误代码
}
```

### 1.7 Extension 相关类型

```typescript
interface ExtensionEvent {
  id: string;
  timestamp: string;        // ISO 8601
  source: string;           // 来源域名
  title: string;            // 页面标题
  url?: string;             // 页面 URL
  selectedText?: string;    // 选中文本
}
```

### 1.8 Algorithm 相关类型

```typescript
type AlgorithmPhase =
  | 'idle'
  | 'feature_extraction'
  | 'attention_encoding'
  | 'physics_constraint'
  | 'conformal_prediction'
  | 'decision_fusion'
  | 'complete';

interface AlgorithmMetrics {
  rul: number;              // 剩余使用寿命(天)
  faultProbability: number; // 故障概率(%)
  degradationRate: number;  // 退化速率(ms/hr)
  confidence: number;       // 置信度(%)
  healthScore: number;      // 健康评分(0-100)
  constraintLoss: number;   // 物理约束损失(%)
  iteration: number;        // 当前迭代次数
  maxIterations: number;    // 最大迭代次数
}
```

---

## 二、环境变量规范

| 变量名 | 类型 | 必需 | 默认值 | 说明 | 示例 |
|--------|------|------|--------|------|------|
| ANTHROPIC_API_KEY | string | 否 | — | Anthropic API Key，未设置则启用离线模式 | sk-ant-api03-... |
| ANTHROPIC_BASE_URL | string | 否 | https://api.anthropic.com | API 端点地址，支持第三方中转 | https://relay.example.com/v1 |
| ANTHROPIC_MODEL | string | 否 | claude-opus-4-8 | 模型标识符 | claude-sonnet-4-20250514 |
| ELECTRON_BRIDGE_TOKEN | string | 否 | — | 浏览器插件 Bridge 认证 Token | my-secret-token |

---

## 三、告警等级判定规则

```
IF actionTime > fixedThreshold 连续 3 次:
    → level = CRITICAL (紧急)
    → 要求: 立即停机检修

ELSE IF actionTime > dynamicUpperMs
    OR trendSlope > 0.3ms/hr 持续 6h
    OR predictedRUL < 14 天:
    → level = WARNING (预警)
    → 要求: 24h 内计划检修

ELSE IF healthScore 下降 > 10 分 (7天内):
    → level = INFO (提示)
    → 要求: 加强监测

ELSE:
    → level = NORMAL
```

---

## 四、文件结构清单

```
src/
├── main/                          # Electron 主进程
│   ├── index.ts                   # 应用入口、窗口创建
│   ├── ipc.ts                     # IPC Handler 注册 + Zod 校验
│   ├── bridge/
│   │   └── localBridgeServer.ts   # HTTP Bridge :17654
│   ├── llm/
│   │   ├── anthropicClient.ts     # Claude 流式调用 + 离线 Mock
│   │   └── dashboardPrompt.ts     # System/User Prompt 构建
│   └── mock/
│       ├── mockData.ts            # 设备/告警/维护 Mock 数据
│       └── analytics.ts           # KPI 聚合 + Snapshot 构建
│
├── preload/
│   └── index.ts                   # contextBridge API 暴露
│
├── shared/
│   └── types.ts                   # 跨进程类型定义
│
└── renderer/
    ├── main.tsx                    # React 入口
    ├── App.tsx                     # 根组件 + 视图路由
    ├── styles.css                  # 全局样式 (~2300行)
    └── components/
        ├── NavBar.tsx              # 导航栏
        ├── HudClock.tsx            # 时钟组件
        ├── KpiCards.tsx            # KPI 卡片
        ├── TrendChart.tsx          # 趋势图
        ├── AlertDistributionChart.tsx
        ├── RiskRankingChart.tsx
        ├── EquipmentHeatmap.tsx
        ├── AlertsTable.tsx
        ├── MaintenanceTable.tsx
        ├── ChatPanel.tsx           # AI 助手
        ├── ExtensionInbox.tsx      # 插件收件箱
        ├── algorithm/
        │   ├── AlgorithmPanel.tsx
        │   ├── useAlgorithmSimulation.ts
        │   ├── PipelineStages.tsx
        │   ├── ConfidenceGauge.tsx
        │   ├── DegradationChart.tsx
        │   ├── MetricsGrid.tsx
        │   └── AttentionHeatmap.tsx
        ├── bigscreen/
        │   ├── BigScreenView.tsx
        │   └── useMockRealtimeData.ts
        └── security/
            └── NetworkAwarenessPanel.tsx
```

---

*文档版本：v1.0 | 编制日期：2026-06-10*
