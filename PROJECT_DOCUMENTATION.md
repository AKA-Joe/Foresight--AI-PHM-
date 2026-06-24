# 明鉴——AI+设备预测性维护平台 · 项目完整技术文档

> **文档版本**：v2.0.0  
> **最后更新**：2026-06-18  
> **作者**：项目组  
> **适用对象**：接手本项目的全栈开发者 / 后续维护与优化人员

---

## 目录

1. [项目概览](#1-项目概览)
2. [技术全景](#2-技术全景)
3. [环境要求与快速启动](#3-环境要求与快速启动)
4. [完整目录结构说明](#4-完整目录结构说明)
5. [核心模块与代码深度剖析](#5-核心模块与代码深度剖析)
6. [关键业务流程](#6-关键业务流程)
7. [配置系统详解](#7-配置系统详解)
8. [数据与存储设计](#8-数据与存储设计)
9. [API 接口全览](#9-api-接口全览)
10. [状态管理与数据流](#10-状态管理与数据流)
11. [测试方案与质量保障](#11-测试方案与质量保障)
12. [已知问题、限制与技术债](#12-已知问题限制与技术债)
13. [优化与扩展建议](#13-优化与扩展建议)
14. [附录](#14-附录)

---

## 1. 项目概览

### 1.1 项目名称与定位

| 字段 | 值 |
|------|-----|
| **项目名** | 明鉴——AI+设备预测性维护平台 |
| **英文名** | Aura PHM（Predictive Health Management） |
| **一句话定位** | 面向非标自动化产线设备的 5G+AI 预测性维护决策系统 |
| **核心故事关键词** | "感知盲区"→"两段链路"（数据链路 + 认知链路）→"两层 AI"（TADPE + LLM 因果推断） |

### 1.2 核心解决的问题

**痛点**：非标设备（自定制产线设备）无法复用市面上的标准化预测性维护方案。工厂 MES、ERP、SCADA 等系统**铺满了**，但当设备即将故障时，没有人能回答"下一台会坏的设备是谁？什么时候？该怎么办？"

**本质**：一道"感知盲区"由两段断裂的链路构成——

1. **数据链路断了**：设备退化信号隐藏在每天几万条原始数据里，MES 不管设备状态，SCADA 只采不分析，等阈值报警响了产线已经停了
2. **认知链路断了**：即使把数据拿出来（健康分 72、故障概率 34%），非标设备每台脾性不一样，经验无法跨设备迁移，SOP 写了怎么操作没写什么时候该修

### 1.3 应用场景

- **主场景**：非标自动化产线（电子制造、汽车零部件、装备制造）的气缸类执行器预测性维护
- **可扩展场景**：有运行数据的能源设备、基础设施设备
- **典型用户**：设备工程师、生产运维人员、工厂管理层

### 1.4 主要功能列表

| 编号 | 功能模块 | 说明 |
|------|----------|------|
| F1 | **驾驶舱总览** | 全局 KPI 卡（总设备数/平均健康分/告警统计/数据质量）+ 多面板联动 |
| F2 | **告警等级分布** | 三级告警（紧急🔴/预警🟡/提示🔵）环形图 + 按工站堆叠柱状图 + 24h 趋势迷你图 |
| F3 | **设备风险排行榜** | Top 6 高风险设备排行，含健康评分连续渐变条、故障概率指示、trend sparkline |
| F4 | **设备健康热力图** | 气泡散点图（X=健康评分/Y=故障概率/气泡大小=偏离幅度/颜色=告警等级），支持点击选中 |
| F5 | **动作执行时间趋势图** | 5 条曲线（执行时间/基线/动态阈值/固定阈值/预测）+ 置信区间带 + 异常标记点 + 数据质量标志条 + 预测延伸区 + dataZoom 滑块 |
| F6 | **AI 诊断面板** | 自动生成选中气缸的故障原因分析（含置信度进度条）+ 推荐处置方案 + 一键导出 HTML 诊断报告 |
| F7 | **AI 对话（NLP 问答）** | 快捷提问按钮 + 自定义输入，底层 TADPE 提炼退化语义 → 大模型因果推断生成维修建议，支持 Markdown 渲染和流式输出 |
| F8 | **TADPE 算法面板** | 五步流水线可视化（多尺度特征提取→注意力编码→物理约束正则化→保形预测→决策融合）+ 置信度仪表盘 + 实时计算日志 |
| F9 | **数据查询面板** | 设备列表筛选、按健康分排序、快速定位 |
| F10 | **设备详情面板** | 单设备完整画像（安装日期/动作类型/基线/阈值/健康趋势/关联告警/维护记录） |
| F11 | **工单调度面板** | 维护工单的创建、进度追踪、完成确认 |
| F12 | **浏览器插件收件箱** | 接收来自浏览器插件的网页内容摘录（Extension Inbox） |
| F13 | **数据采集面板** | 模拟/展示数据采集通道状态 |
| F14 | **传感器模拟器** | 可调节参数（基线漂移/噪声幅度/劣化速率等）注入算法引擎，验证 TADPE 鲁棒性 |
| F15 | **大屏视图** | 独立全屏驾驶舱展示模式，适配演示/展厅场景 |
| F16 | **网络安全感知面板** | 展示网络流量、安全告警等辅助信息 |
| F17 | **行业对标面板** | 行业基准数据展示（用于汇报对比） |
| F18 | **ROI 计算器** | 输入产线参数计算投资回报率（年节省、回收周期） |

---

## 2. 技术全景

### 2.1 技术栈详情

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **桌面壳** | Electron | 31.7.7 | 跨平台桌面应用框架（Windows/macOS） |
| **前端 UI** | React | 19.0.0 | 声明式 UI 框架（函数组件 + Hooks） |
| **数据可视化** | ECharts | 5.6.0 | 趋势图、饼图、柱状图、气泡散点图、仪表盘 |
| **3D 扩展** | echarts-gl | 2.1.0 | ECharts 3D 组件（预留） |
| **Markdown** | react-markdown + remark-gfm | 10.1.0 / 4.0.1 | AI 对话内容的 Markdown 渲染（含表格/任务列表） |
| **类型系统** | TypeScript | 5.7.0 | 全栈类型安全 |
| **构建 Vite** | Vite | 6.2.0 | 前端开发服务器 + 生产构建 |
| **构建 Electron** | electron-vite | 3.1.0 | Electron 三进程统一构建（main/preload/renderer） |
| **React 插件** | @vitejs/plugin-react | 4.4.0 | Vite React JSX/TSX 支持 |
| **LLM SDK** | @anthropic-ai/sdk | 0.39.0 | 对接 Claude API（流式对话 + extended thinking） |
| **数据校验** | zod | 3.24.0 | Runtime 类型校验（IPC 入参 / HTTP 请求体） |
| **ID 生成** | nanoid | 5.1.0 | 扩展事件 ID / 请求 ID 生成 |
| **打包** | electron-builder | 25.1.8 | NSIS 安装包 / Portable 免安装 / DMG（macOS） |

### 2.2 架构风格

**分层架构 + 三进程模型（Electron 经典模式）**：

```
┌─────────────────────────────────────────────────┐
│                  Renderer Process                │
│  React 19 + ECharts + CSS Variables             │
│  ┌─────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ 驾驶舱页 │ │ 算法页   │ │ 安全/对标/ROI页  │ │
│  └─────────┘ └──────────┘ └──────────────────┘ │
│          ↕ contextBridge (preload)               │
├─────────────────────────────────────────────────┤
│                   Preload Script                  │
│  IPC Bridge: dashboard / chat / extension / app │
│  窗口控制: minimize / maximize / close          │
├─────────────────────────────────────────────────┤
│                   Main Process                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ IPC 路由 │  │ LLM 客户端│  │ HTTP Bridge   │ │
│  │ (ipc.ts) │  │ (Claude)  │  │ (端口 17654)  │ │
│  └──────────┘  └──────────┘  └───────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ 窗口管理 │  │ Mock 数据 │  │ 扩展事件收集  │ │
│  │ (创建/控 │  │ (内存)    │  │ (浏览器插件)  │ │
│  └──────────┘  └──────────┘  └───────────────┘ │
└─────────────────────────────────────────────────┘
         ↕                   ↕
┌─────────────────┐  ┌───────────────────┐
│ Launcher Daemon │  │ Browser Extension │
│ (端口 9346)      │  │ (HTTP POST 摘录)  │
└─────────────────┘  └───────────────────┘
```

**核心设计原则**：
- **Context Isolation**：Renderer 无法直接访问 Node.js API，所有系统能力通过 preload 桥接暴露
- **消息驱动**：Main ↔ Renderer 通过 IPC（`ipcMain.handle` / `ipcRenderer.invoke` / `webContents.send`）通信
- **Mock First**：演示数据完全通过内存中的 mock 生成，无需数据库。当配置了 `ANTHROPIC_API_KEY` 时自动切换到真实 LLM

### 2.3 模块调用关系（文字架构图）

```
App.tsx（根组件）
  ├─ SplashScreen（开屏动画，2.2s 后自动淡出）
  ├─ NavBar（顶部导航：驾驶舱/算法/大屏/安全/对标/ROI）
  ├─ HudClock（右上角时间显示）
  │
  ├─ [驾驶舱视图] ── 主布局：左侧 main + 右侧 aside
  │   ├─ KpiCards（4 张 KPI 卡片）
  │   ├─ QuickQuery（快捷提问入口）
  │   ├─ AlertDistributionChart（告警分布三面板）
  │   ├─ charts-grid（并排两图表）
  │   │   ├─ RiskRankingChart（风险排行）
  │   │   └─ EquipmentHeatmap（健康热力气泡图）
  │   ├─ TrendChart（趋势图 + 预测）
  │   ├─ tables-grid（并排两表格）
  │   │   ├─ AlertsTable（告警列表）
  │   │   └─ MaintenanceTable（维护记录）
  │   └─ aside 右侧面板（Tab 切换）
  │       ├─ AiDiagnosisPanel（AI 诊断）
  │       ├─ DataQueryPanel（数据查询）
  │       ├─ EquipmentDetailPanel（设备详情）
  │       ├─ WorkOrderPanel（工单调度）
  │       ├─ ExtensionInbox（插件收件箱）
  │       └─ DataAcquisition（数据采集）
  │
  ├─ [算法视图] ── AlgorithmPanel
  │   ├─ PipelineStages（五步流水线进度）
  │   ├─ ConfidenceGauge（置信度仪表盘）
  │   ├─ DegradationChart（退化曲线）
  │   ├─ MetricsGrid（指标网格）
  │   ├─ AttentionHeatmap（注意力热力图）
  │   ├─ AlgorithmLog（实时日志）
  │   └─ SensorSimulator（参数注入器）
  │
  ├─ [大屏视图] ── BigScreenView（独立全屏驾驶舱）
  ├─ [安全视图] ── NetworkAwarenessPanel
  ├─ [对标视图] ── IndustryBenchmarkPanel
  └─ [ROI 视图] ── ROICalculator
```

---

## 3. 环境要求与快速启动

### 3.1 操作系统与运行时

| 要求项 | 说明 |
|--------|------|
| **操作系统** | Windows 10/11（x64）或 macOS 12+（Apple Silicon / Intel） |
| **Node.js** | ≥ 18.0.0（推荐 20 LTS） |
| **npm** | ≥ 9.0.0（随 Node.js 自带） |
| **磁盘空间** | ~500MB（含 `node_modules`） |
| **内存** | ≥ 8GB（开发模式热重载需要） |

### 3.2 依赖清单

**运行时依赖**（`dependencies`）：

| 包名 | 版本 | 用途 |
|------|------|------|
| `@anthropic-ai/sdk` | ^0.39.0 | Claude API SDK，流式对话 |
| `echarts` | ^5.6.0 | 数据可视化图表库 |
| `echarts-gl` | ^2.1.0 | ECharts 3D 扩展 |
| `nanoid` | ^5.1.0 | 唯一 ID 生成 |
| `react` | ^19.0.0 | UI 框架 |
| `react-dom` | ^19.0.0 | React DOM 渲染器 |
| `react-markdown` | ^10.1.0 | Markdown 解析渲染 |
| `remark-gfm` | ^4.0.1 | GFM 扩展（表格/删除线/任务列表） |
| `zod` | ^3.24.0 | TypeScript-first Schema 校验 |

**开发依赖**（`devDependencies`）：

| 包名 | 版本 | 用途 |
|------|------|------|
| `@types/node` | ^22.0.0 | Node.js 类型定义 |
| `@types/react` | ^19.0.0 | React 类型定义 |
| `@types/react-dom` | ^19.0.0 | React DOM 类型定义 |
| `@vitejs/plugin-react` | ^4.4.0 | Vite React 插件 |
| `electron` | ^31.7.7 | Electron 运行时 |
| `electron-builder` | ^25.1.8 | 打包/分发工具 |
| `electron-vite` | ^3.1.0 | Electron 构建工具 |
| `typescript` | ^5.7.0 | TypeScript 编译器 |
| `vite` | ^6.2.0 | 构建工具 |

### 3.3 环境变量说明

所有环境变量在 `.env.example` 中定义。复制为 `.env` 后修改：

| 变量名 | 作用 | 默认值 | 必填 |
|--------|------|--------|------|
| `ANTHROPIC_API_KEY` | Anthropic API 密钥，用于真实 LLM 调用 | 无（缺省则使用 Mock 模式） | 否 |
| `ANTHROPIC_MODEL` | 使用的 Claude 模型 ID | `claude-opus-4-8` | 否 |
| `ANTHROPIC_BASE_URL` | API 基础 URL（用于代理/私有部署） | `https://api.anthropic.com` | 否 |
| `ELECTRON_BRIDGE_PORT` | 本地 HTTP 桥接服务端口 | `17654` | 否 |
| `ELECTRON_BRIDGE_TOKEN` | 桥接服务鉴权 Token | `demo-bridge-token` | 否 |

**环境变量加载机制**：
- `electron-vite` 在开发模式下自动从 `.env` 文件加载环境变量注入 `process.env.*`
- `ANTHROPIC_API_KEY` 为空时，`anthropicClient.ts:236` 自动降级为 Mock 流式响应
- `.env` 已在 `.gitignore` 中排除，不会提交到仓库

### 3.4 从零搭建步骤

```bash
# 1. 克隆仓库
git clone <repo-url>
cd AI设备预测性维护

# 2. 安装依赖（自动执行 postinstall 脚本）
npm install

# 3. 配置环境变量（可选，不配则使用 Mock AI）
cp .env.example .env
# 编辑 .env，填入 ANTHROPIC_API_KEY（如需真实 LLM）

# 4. 开发模式启动
npm run dev
# → 自动启动 Vite dev server + Electron 窗口
# → 开屏动画 2.2s → 进入驾驶舱

# 5. 仅类型检查（不构建）
npm run typecheck

# 6. 生产构建
npm run build
# → 输出到 out/ 目录

# 7. 打包为可分发安装包
npm run dist
# → 输出到 release/2.0.0/
#    ├── win-unpacked/（免安装目录）
#    ├── AI预测性维护演示平台-2.0.0-Setup.exe（安装包）
#    └── AI预测性维护演示平台-2.0.0-Portable.exe（便携版）
```

### 3.5 常见启动失败场景与解决

| 问题 | 可能原因 | 解决方法 |
|------|----------|----------|
| `npm install` 报错 | Node.js 版本过低 | 升级到 Node.js 20 LTS |
| `Electron failed to install` | 网络问题导致 Electron 二进制下载失败 | 设置镜像：`set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` |
| 启动后白屏 | Vite dev server 端口冲突（默认 5173） | 检查端口占用，杀掉占用进程 |
| `Cannot find module 'out/main/index.js'` | 未先构建就直接运行生产模式 | 运行 `npm run dev` 使用开发模式 |
| LLM 调用失败 `authentication_error` | API Key 无效 | 检查 `.env` 中 `ANTHROPIC_API_KEY` 格式（应以 `sk-ant-` 开头） |
| `payload_too_large` | 浏览器插件发送的文本超过 64KB | 缩减摘录文本长度 |
| TypeScript 编译错误 `Property 'window' does not exist` | 类型定义未更新 | 确认 `src/renderer/types.ts` 包含 `WinApi` 接口 |
| PPT 按钮点击无人响应 | 应用未预启动 | 先运行 `node launcher.mjs`，再打开 PPT |

---

## 4. 完整目录结构说明

```
项目根目录/
├── .claude/                        # Claude Code 会话数据（自动生成，勿手动编辑）
├── .env.example                    # 环境变量模板（提交到 git）
├── .env                            # 本地环境变量（.gitignore，不提交）
├── .gitignore                      # Git 忽略规则
├── index.html                      # 🔑 Vite 入口 HTML（renderer 进程入口）
├── package.json                    # 🔑 项目元数据 + 依赖 + electron-builder 配置
├── package-lock.json               # 依赖锁定文件
├── tsconfig.json                   # 🔑 TypeScript 配置（renderer + shared）
├── tsconfig.node.json              # TypeScript 配置（构建工具脚本）
├── electron.vite.config.ts         # 🔑 Electron-Vite 三进程构建配置
├── vite.config.ts                  # Vite 独立配置（供 IDE 识别，实际构建用 electron.vite.config.ts）
├── launcher.mjs                    # 🔑 PPT 启动器守护进程（预启动应用）
├── preview.html                    # 独立预览页面
├── README.md                       # 项目简介
├── Electron技术文档.md             # Electron 技术要点笔记
│
├── assets/                         # 静态资源（应用图标等）
│   └── icon.png                    # 应用图标（用于打包和窗口图标）
│
├── docs/                           # 项目文档集合
│
├── competition/                    # 竞赛相关资料
│
├── scripts/                        # 构建辅助脚本
│   └── postinstall.cjs             # npm install 后自动执行（构建原生模块等）
│
├── tools/                          # 🔑 随应用分发的工具（打包到 extraResources）
│
├── extension/                      # 浏览器插件源码
│
├── src/                            # 🔑 全部源代码
│   ├── shared/                     # 🔑 Main / Preload / Renderer 三进程共享的类型定义
│   │   └── types.ts                #   全部类型/接口定义（详见 §5.1）
│   │
│   ├── main/                       # 🔑 Electron 主进程
│   │   ├── index.ts                #   应用入口：窗口创建、协议注册、单实例锁
│   │   ├── ipc.ts                  #   IPC 路由注册：dashboard/chat/extension/window 处理器
│   │   ├── bridge/                 #   HTTP 桥接服务
│   │   │   └── localBridgeServer.ts #  本地 HTTP Server（端口 17654）：/launch /health /extension/ingest
│   │   ├── llm/                    #   LLM 集成
│   │   │   ├── anthropicClient.ts  #   Claude API 客户端：Mock/真实两种模式
│   │   │   └── dashboardPrompt.ts  #   System Prompt 模板 + 上下文构建
│   │   └── mock/                   #   Mock 数据层
│   │       ├── mockData.ts         #   75 台气缸 + 动作记录 + 告警 + 维护记录生成器
│   │       └── analytics.ts        #   仪表盘快照聚合计算：KPI/TopRisks/StationHealth
│   │
│   ├── preload/                    # 🔑 Electron Preload 脚本
│   │   └── index.ts                #   contextBridge 暴露 predMaint API + splash 重播转发
│   │
│   └── renderer/                   # 🔑 渲染进程（React 前端）
│       ├── main.tsx                #   React 根挂载入口
│       ├── App.tsx                 #   根组件：路由/状态/布局/事件监听
│       ├── types.ts                #   渲染进程专属类型（PredMaintApi 声明）
│       ├── styles.css              #   全局样式：CSS 变量、组件样式、动画
│       │
│       └── components/             #   UI 组件
│           ├── SplashScreen.tsx    #   开屏动画（SVG 旋转环 + 进度条 + 技术标签淡入）
│           ├── NavBar.tsx          #   顶部导航栏（6 个视图切换）
│           ├── HudClock.tsx        #   右上角 HUD 时钟（实时刷新）
│           ├── KpiCards.tsx        #   KPI 卡片组（4 张：设备总数/健康分/告警/数据质量）
│           ├── QuickQuery.tsx      #   快捷提问入口
│           ├── AlertDistributionChart.tsx # 告警分布（环形图+工站柱状图+24h迷你图）
│           ├── RiskRankingChart.tsx #   风险排行（水平柱状+sparkline+趋势箭头）
│           ├── EquipmentHeatmap.tsx #   设备健康气泡散点图（4 维度一图）
│           ├── TrendChart.tsx      #   趋势图（5 线+置信区间+预测+dataZoom）
│           ├── AlertsTable.tsx     #   告警列表表格
│           ├── MaintenanceTable.tsx #  维护记录表格
│           ├── AiDiagnosisPanel.tsx #  AI 诊断面板（根因分析+处置方案+HTML报告导出）
│           ├── ChatPanel.tsx       #   AI 对话面板（流式 Markdown + 快速提问 + CSV/HTML 导出）
│           ├── DataQueryPanel.tsx  #   数据查询面板
│           ├── EquipmentDetailPanel.tsx # 设备详情面板
│           ├── WorkOrderPanel.tsx  #   工单调度面板
│           ├── ExtensionInbox.tsx  #   浏览器插件收件箱
│           ├── DataAcquisition.tsx #   数据采集通道面板
│           ├── SensorSimulator.tsx #   传感器参数模拟器
│           ├── IndustryBenchmarkPanel.tsx # 行业对标面板
│           ├── ROICalculator.tsx   #   ROI 计算器
│           ├── security/           #   安全模块
│           │   └── NetworkAwarenessPanel.tsx
│           ├── algorithm/          #   TADPE 算法模块
│           │   ├── AlgorithmPanel.tsx  #   算法面板主组件
│           │   ├── useAlgorithmSimulation.ts # 算法仿真 Hook（5 阶段时序控制）
│           │   ├── PipelineStages.tsx #   五步进度条
│           │   ├── ConfidenceGauge.tsx #   置信度仪表盘
│           │   ├── DegradationChart.tsx #   退化趋势迷你图
│           │   ├── MetricsGrid.tsx  #   指标卡片组
│           │   ├── AttentionHeatmap.tsx # 注意力权重热力图
│           │   └── AlgorithmLog.tsx #   实时计算日志
│           └── bigscreen/          #   大屏模块
│               ├── BigScreenView.tsx #  全屏驾驶舱
│               └── useMockRealtimeData.ts # 模拟实时数据 Hook
│
├── out/                            # 构建输出（npm run build）
│   ├── main/index.js               #   主进程编译产物
│   ├── preload/index.mjs           #   Preload 编译产物
│   └── renderer/                   #   Renderer 编译产物
│
├── release/                        # 打包输出（npm run dist）
│   └── 2.0.0/
│       ├── win-unpacked/           #   免安装目录（含 .exe）
│       ├── *-Setup.exe             #   NSIS 安装包
│       └── *-Portable.exe          #   便携版
│
├── 6.18 路演/                      # 路演相关资料
├── 提交/                           # 竞赛提交材料
│   └── 路演终稿/
│       ├── 路演PPT.html            #   演示 PPT（6 页 + 启动按钮）
│       ├── 路演脚本.md             #   完整讲解词（~9 分钟）
│       └── QA大全-评委可能提问.md  #   评委预期问答 24 题
├── 初步方案/                       # 早期方案文档
├── 项目流程文档/                   # 项目流程记录
└── 项目背景文档/                   # 业务背景调研
```

---

## 5. 核心模块与代码深度剖析

### 5.1 共享类型系统 (`src/shared/types.ts`)

这是整个项目的"数据宪法"——Main、Preload、Renderer 三个进程共享同一套类型定义，任何数据结构变更必须从此文件开始。

#### 5.1.1 核心实体类型

```typescript
// ── 告警等级 ──
export type AlertLevel = 'normal' | 'info' | 'warning' | 'critical';

// ── 数据质量标志（TADPE 预处理阶段判定）──
export type QualityFlag = 'good' | 'suspect' | 'dirty';
// good: 数据可信，参与计算
// suspect: 可疑值（如传感器短暂跳变），标记但不排除
// dirty: 脏数据（如传感器故障），排除出计算队列

// ── 气缸资产（核心被监测对象）──
export interface CylinderAsset {
  uid: string;              // 全局唯一标识，如 "CYL-CSKG-ST-03-007"
  deviceId: string;         // 所属设备 ID
  deviceName: string;       // 设备中文名
  stationId: string;        // 所属工站（ST-01 ~ ST-15）
  lineId: string;           // 所属产线（LINE-A ~ LINE-E）
  name: string;             // 气缸名称（如 "升降复位缸"）
  actionType: CylinderActionType; // 动作类型：extend/retract/rotate/reset
  baselineMs: number;       // 基线动作执行时间（ms），设备健康时的统计均值
  fixedThresholdMs: number; // 固定报警阈值（ms），= baseline × 1.5
  installDate: string;      // 安装日期（ISO 格式）
  healthScore: number;      // 健康评分（0-100），综合 TADPE 输出计算
  alertLevel: AlertLevel;   // 当前告警等级
  faultProbability: number; // 故障概率（0-100%）
}

// ── 动作执行记录（时序数据点）──
export interface ActionTimeRecord {
  id: string;
  timestamp: string;        // ISO 时间戳
  deviceId: string;
  cylinderUid: string;      // 关联气缸
  actionType: CylinderActionType;
  executionTimeMs: number;  // 动作执行时间（核心监测指标）
  dynamicUpperMs: number;   // 动态阈值上界（TADPE 自适应计算）
  baselineMs: number;       // 该气缸的基线值
  fixedThresholdMs: number; // 固定阈值
  qualityFlag: QualityFlag; // 数据质量标记
}

// ── 告警记录 ──
export interface AlertRecord {
  id: string;               // 如 "ALM-20260609-001"
  timestamp: string;
  level: Exclude<AlertLevel, 'normal'>; // 仅 info/warning/critical
  cylinderUid: string;
  deviceId: string;
  title: string;            // 告警标题
  reason: string;           // 触发原因
  suggestion: string;       // 处置建议
  status: 'active' | 'acknowledged' | 'closed';
}
```

#### 5.1.2 Dashboard 快照类型

```typescript
// ── Dashboard 快照（一次性从主进程获取的完整数据包）──
export interface DashboardSnapshot {
  generatedAt: string;           // 快照生成时间
  cylinders: CylinderAsset[];    // 全部气缸（按告警等级排序）
  records: ActionTimeRecord[];   // 全部动作记录（未——全量，因 mock 数据量小）
  alerts: AlertRecord[];         // 全部告警
  maintenance: MaintenanceRecord[]; // 全部维护记录
  kpis: DashboardKpis;           // 聚合 KPI
  topRisks: RiskItem[];          // Top 6 高风险设备
  stationHealth: StationHealth[]; // 按工站的健康状态
  selectedCylinderUid: string;   // 默认选中气缸
}
```

#### 5.1.3 算法相关类型

```typescript
export type AlgorithmPhase =
  | 'idle'                   // 待机（初始状态）
  | 'feature_extraction'     // 阶段1：多尺度时序特征提取
  | 'attention_encoding'     // 阶段2：分层时间注意力编码
  | 'physics_constraint'     // 阶段3：物理约束正则化
  | 'conformal_prediction'   // 阶段4：保形概率退化预测
  | 'decision_fusion'        // 阶段5：自适应阈值决策融合
  | 'complete';              // 完成

export interface AlgorithmMetrics {
  rul: number;               // 剩余可用寿命（天）
  faultProbability: number;  // 故障概率（%）
  degradationRate: number;   // 退化速率（ms/天）
  confidence: number;        // 置信度（%），保形预测输出的覆盖率
  healthScore: number;       // 综合健康评分
  constraintLoss: number;    // 物理约束损失值（%），越低越符合物理规律
  iteration: number;         // 当前迭代步数
  maxIterations: number;     // 总迭代步数
}
```

### 5.2 主进程入口 (`src/main/index.ts`)

**职责**：Electron 应用生命周期管理 + 窗口创建 + 协议注册

**关键代码逻辑**：

```typescript
// ── 1. 无边框窗口配置 ──
// 为了实现自定义标题栏，使用 frame: false 去除系统边框
mainWindow = new BrowserWindow({
  width: 1440, height: 920,
  minWidth: 1080, minHeight: 720,
  frame: false,                    // 无边框
  titleBarStyle: 'hidden',        // macOS 隐藏标题栏
  autoHideMenuBar: true,          // 隐藏菜单栏
  webPreferences: {
    preload: join(__dirname, '../preload/index.mjs'),
    nodeIntegration: false,       // 🔒 安全：禁用 Node.js 集成
    contextIsolation: true,       // 🔒 安全：隔离上下文
    sandbox: false,               // 沙箱关闭（部分 IPC 需要）
  },
});

// ── 2. 单实例锁 ──
// 确保同一时间只有一个应用实例运行
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();  // 第二个实例直接退出
} else {
  // 第二个实例启动时，唤醒第一个实例（via second-instance 事件）
  app.on('second-instance', (_event, commandLine) => {
    // 解析 mingjian:// 协议 URL，聚焦已有窗口
  });
}

// ── 3. 启动流程 ──
app.whenReady().then(() => {
  app.setAsDefaultProtocolClient('mingjian');  // 注册自定义协议
  createWindow();
  registerIpcHandlers(mainWindow);   // 注册 IPC 路由
  startLocalBridge(mainWindow, bridgePort, bridgeToken); // 启动 HTTP 桥接
});
```

**设计要点**：
- `frame: false` + 自定义标题栏方案替代了系统原生窗口装饰
- `mingjian://` 协议用于外部（PPT HTML）拉起应用。Windows 下通过注册表，macOS 通过 `open-url` 事件
- 单实例锁防止多个窗口实例

### 5.3 IPC 通信路由 (`src/main/ipc.ts`)

**职责**：所有 Renderer ↔ Main 通信的中央路由。采用 Electron 的 `ipcMain.handle`（请求-响应模式）和 `ipcMain.on`（事件模式）。

```
IPC 通道一览表：
┌─────────────────────────┬──────────┬────────────────────────────────┐
│ 通道名                   │ 模式      │ 功能                           │
├─────────────────────────┼──────────┼────────────────────────────────┤
│ dashboard:getSnapshot   │ handle   │ 获取 Dashboard 完整快照        │
│ app:getStatus           │ handle   │ 获取 LLM/桥接状态              │
│ chat:send               │ handle   │ 发送对话请求，启动 LLM 流式    │
│ chat:cancel             │ handle   │ 取消进行中的对话请求           │
│ extension:listEvents    │ handle   │ 获取浏览器插件事件列表         │
│ window:minimize         │ on       │ 最小化窗口                     │
│ window:maximize         │ on       │ 最大化/还原窗口                 │
│ window:close            │ on       │ 关闭窗口                       │
│ chat:delta (推送)        │ send     │ Main→Renderer 流式文字增量     │
│ chat:done (推送)         │ send     │ Main→Renderer 对话完成         │
│ chat:error (推送)        │ send     │ Main→Renderer 对话错误         │
│ extension:event (推送)   │ send     │ Main→Renderer 新扩展事件       │
│ replay-splash (推送)     │ send     │ Main→Renderer 重播开屏动画     │
└─────────────────────────┴──────────┴────────────────────────────────┘
```

**关键代码逻辑——聊天请求入口**：

```typescript
ipcMain.handle('chat:send', (_event, payload: unknown) => {
  // 1. Zod 校验入参
  const parsed = chatSendSchema.parse(payload) as ChatRequest;
  // 2. 防重复：同一 requestId 已在处理中则返回
  if (activeRequests.has(parsed.requestId)) return { accepted: true, requestId: parsed.requestId };
  // 3. 启动流式处理，通过 webContents.send 向 Renderer 推送 delta/done/error
  activeRequests.add(parsed.requestId);
  streamMaintenanceAssistant(mainWindow.webContents, parsed);
  return { accepted: true, requestId: parsed.requestId };
});
```

**关键代码逻辑——浏览器插件事件轮询**：

```typescript
// 每 3 秒检查一次是否有新的插件事件，有则推送到 Renderer
setInterval(() => {
  const updated = listExtensionEvents();
  const newEvents = updated.filter((ev) => !knownExtensions.has(ev.id));
  for (const ev of newEvents) {
    knownExtensions.add(ev.id);
    mainWindow.webContents.send('extension:event', ev);
  }
}, 3000);
```

### 5.4 HTTP 桥接服务 (`src/main/bridge/localBridgeServer.ts`)

**职责**：暴露本地 HTTP API，使外部应用（PPT HTML、浏览器插件）无需 Electron IPC 即可与应用通信。

**监听端口**：`17654`（可通过 `ELECTRON_BRIDGE_PORT` 环境变量修改）

**路由表**：

| 方法 | 路径 | 鉴权 | 功能 |
|------|------|------|------|
| `GET` | `/health` | 无 | 健康检查，返回应用名和版本 |
| `GET` | `/launch` | 无 | **PPT 启动按钮端点**——恢复窗口 + 聚焦 + 重播开屏动画 |
| `POST` | `/extension/ingest` | Token | 接收浏览器插件发送的网页摘录 |
| `OPTIONS` | `*` | 无 | CORS 预检响应 |

**关键代码——launch 端点**：

```typescript
if (req.method === 'GET' && req.url === '/launch') {
  if (mainWindow.isMinimized()) mainWindow.restore();   // 如果最小化则恢复
  mainWindow.focus();                                    // 聚焦到前台
  mainWindow.show();                                     // 确保可见
  mainWindow.webContents.send('replay-splash');          // 触发开屏动画重播
  return json(res, 200, { ok: true, focused: true, splashReplay: true });
}
```

**关键代码——extension/ingest 端点**：

```typescript
if (req.method === 'POST' && req.url === '/extension/ingest') {
  const parsed = ingestSchema.parse(JSON.parse(await readBody(req)));
  if (parsed.token !== token) return json(res, 403, { ok: false, error: 'invalid_token' });
  // 构造事件对象，存入内存数组（最多保留 50 条）
  const event: ExtensionEvent = { id: nanoid(10), ... };
  events.push(event);
  if (events.length > 50) events.shift();  // FIFO 淘汰
  // 立即推送到 Renderer
  mainWindow.webContents.send('extension:event', event);
  return json(res, 200, { ok: true, eventId: event.id });
}
```

**安全设计**：
- 监听地址为 `127.0.0.1`（仅本机可访问）
- `/extension/ingest` 需要 Token 鉴权
- 请求体大小限制 64KB（防止内存溢出）
- CORS 头允许任意来源（仅本地，安全风险可控）

### 5.5 LLM 客户端 (`src/main/llm/anthropicClient.ts`)

**职责**：封装 Claude API 调用，支持两种模式——无 API Key 时自动降级为 Mock 流式响应。

**双模式架构**：

```typescript
export async function streamMaintenanceAssistant(
  webContents: WebContents,
  request: ChatRequest
) {
  // ── 模式 1：无 API Key → Mock ──
  if (!hasApiKey) {
    sendMockResponse(webContents, request);
    // sendMockResponse 根据用户提问内容匹配预设的 Markdown 响应模板
    // 通过 setTimeout 模拟流式输出，每 180ms 发送一个 chunk
    return;
  }

  // ── 模式 2：有 API Key → 真实 LLM ──
  try {
    const client = new Anthropic({ baseURL });
    const stream = client.messages.stream({
      model,                    // 默认 claude-opus-4-8
      max_tokens: 16000,        // 最大输出 token
      thinking: { type: 'enabled', budget_tokens: 8000 },  // 启用 extended thinking
      system: maintenanceSystemPrompt,  // 系统角色定义
      messages: [{ role: 'user', content: buildDashboardUserPrompt(request) }],
    });
    // 流式输出：每收到一段文本就推送到 Renderer
    stream.on('text', (delta) => {
      webContents.send('chat:delta', { requestId: request.requestId, delta });
    });
    // 完成后返回 token 用量
    const final = await stream.finalMessage();
    webContents.send('chat:done', { requestId: request.requestId, usage: { ... } });
  } catch (error) {
    // 分类错误：AuthenticationError / RateLimitError / APIError
    webContents.send('chat:error', { ... });
  }
}
```

**Mock 智能响应匹配**（`getMockChunks` 函数）：

```typescript
function getMockChunks(prompt: string): string[] {
  if (prompt.includes('最高风险') || prompt.includes('维修建议')) {
    return [/* CYL-07 完整诊断报告（含优先级维修方案表） */];
  }
  if (prompt.includes('告警规则') || prompt.includes('触发原因')) {
    return [/* 三级告警机制 + 阈值计算公——+ 当前活跃告警详情 */];
  }
  if (prompt.includes('交接摘要') || prompt.includes('班组')) {
    return [/* 班组交接摘要（紧急/预警/已完成维护/备注） */];
  }
  if (prompt.includes('运行效率') || prompt.includes('产能影响')) {
    return [/* OEE 综合效率 + 产能恢复路径 + 建议措施 */];
  }
  return [/* 默认：系统综合态势概览（设备总览/告警状态/风险TOP3/建议） */];
}
```

**System Prompt**（`dashboardPrompt.ts`）：

```typescript
export const maintenanceSystemPrompt = `你是工业预测性维护助手，服务于非标自动化设备气缸动作执行时间监测场景。
你只能基于当前演示系统提供的 mock 数据回答，不要声称连接了真实设备、真实数据库或真实生产系统。
重点解释：气缸 UID、动作执行时间、基线、动态阈值、固定阈值、告警等级、趋势劣化、维修闭环。
回答面向设备工程师、生产运维人员和项目汇报场景，结论先行，建议可执行。
如果用户要求汇报材料，请使用简洁、专业、适合领导阅读的中文表达。`;
```

### 5.6 Mock 数据层 (`src/main/mock/mockData.ts` + `analytics.ts`)

**职责**：在无真实设备连接的情况下，生成可信的演示数据。

#### 5.6.1 数据生成器 (`mockData.ts`)

**生成规模**：
- 75 台气缸（5 条产线 × 15 个工站，每个工站 5 台气缸）
- 每台气缸 36 条时序记录（12 小时跨度，10 分钟采样间隔）→ 总计 2700 条记录
- 告警记录：筛选健康分偏低的设备自动生成告警
- 维护记录：采样生成已完成/未完成的维护工单

**退化模式**（6 种，轮流分配给气缸）：

```typescript
type Pattern = 'normal' | 'drift' | 'critical' | 'volatile' | 'recovered' | 'dirty';

// normal   → 执行时间在基线附近正弦波动
// drift    → 执行时间线性缓慢上升（退化仿真）
// critical → 最后 7 个点超出固定阈值（紧急状态仿真）
// volatile → 大幅波动 + 周期性尖峰
// recovered → 前半段偏高，后半段恢复正常（维修后恢复仿真）
// dirty    → 周期性出现脏数据（传感器故障仿真）
```

**告警等级分布逻辑**：

```typescript
// 健康分 < 30 → critical（约占 8%）
// 健康分 30-50 → warning（约占 17%）
// 健康分 50-65 → info（约占部分）
// 健康分 > 65 → normal（约占 75%）
```

#### 5.6.2 数据分析引擎 (`analytics.ts`)

**核心函数**：

| 函数 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `getDashboardSnapshot(selectedCylinderUid?)` | 可选选中气缸 UID | `DashboardSnapshot` | 全局快照聚合 |
| `getCompactContext(selectedCylinderUid?)` | 可选选中气缸 UID | 压缩上下文 | 用于 LLM 对话上下文 |
| `buildKpis()` | 无（读全局 mock 数据） | `DashboardKpis` | 聚合全部 KPI 指标 |
| `buildTopRisks()` | 无 | `RiskItem[]` (Top 6) | 按健康评分升序排列 |

**KPI 计算逻辑**：

```typescript
function buildKpis(): DashboardKpis {
  return {
    totalCylinders: 75,
    averageHealthScore: Math.round(所有气缸健康分之和 / 75),
    infoAlerts: 活跃告警中 level='info' 的数量,
    warningAlerts: 活跃告警中 level='warning' 的数量,
    criticalAlerts: 活跃告警中 level='critical' 的数量,
    pendingMaintenance: 维护记录中未完成的数量,
    dataGoodRate: (good 标记的记录数 / 总记录数) × 100,
  };
}
```

### 5.7 Preload 桥接层 (`src/preload/index.ts`)

**职责**：在 Renderer 进程中暴露 `window.predMaint` API，同时保持 `contextIsolation: true` 的安全边界。

**暴露的 API 结构**：

```typescript
window.predMaint = {
  dashboard: {
    getSnapshot(selectedCylinderUid?): Promise<DashboardSnapshot>
  },
  chat: {
    send(userText, opts?): Promise<string>,  // 返回 requestId
    onDelta(callback): () => void,           // 返回取消订阅函数
    onDone(callback): () => void,
    onError(callback): () => void,
    cancel(requestId): void,
  },
  extension: {
    listEvents(): Promise<ExtensionEvent[]>,
    onEvent(callback): () => void,
  },
  app: {
    getStatus(): Promise<AppStatus>,
  },
  window: {
    minimize(): void,
    maximize(): void,
    close(): void,
  },
};
```

**Splash 重播转发机制**：

```typescript
// Main process → renderer 的 replay-splash 事件转发
// 因为 webContents.send 触发的是 IPC 事件，不能直接触发 Renderer 的 DOM 事件
// 所以在 preload 中监听 IPC 事件，再通过 window.dispatchEvent 转发为 DOM CustomEvent
ipcRenderer.on('replay-splash', () => {
  window.dispatchEvent(new CustomEvent('replay-splash'));
});
```

### 5.8 渲染进程根组件 (`src/renderer/App.tsx`)

**职责**：全局状态管理中心 + 视图路由 + 跨组件事件总线。

**全局状态**：

```typescript
const [currentView, setCurrentView] = useState<AppView>('dashboard');
// AppView = 'dashboard' | 'algorithm' | 'bigscreen' | 'security' | 'benchmark' | 'roiCalculator'

const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
// 全局唯一数据源——所有子组件从 snapshot 读取数据

const [selectedCylinderUid, setSelectedCylinderUid] = useState<string | undefined>();
// 全局选中气缸——TrendChart、AiDiagnosisPanel、QuickQuery 等依赖此状态联动

const [activePanel, setActivePanel] = useState<RightPanelTab>('diagnosis');
// 右侧面板 Tab 切换

const [showSplash, setShowSplash] = useState(true);
// 开屏动画状态
```

**组件间通信机制**：

```
选中气缸联动链路：
  用户点击图表组件
    → 组件调用 onSelect(cylinderUid)
    → 或 dispatchEvent(new CustomEvent('selectCylinder', { detail: uid }))
    → App.tsx setSelectedCylinderUid(uid)
    → TrendChart、AiDiagnosisPanel、QuickQuery 等全部更新

面板切换链路：
  组件内 dispatchEvent(new CustomEvent('switchPanel', { detail: 'diagnosis' }))
    → App.tsx setActivePanel('diagnosis')
    → 右侧面板渲染对应组件
```

**视图切换策略**：

```typescript
// 所有 6 个视图同时渲染，通过 CSS display 控制显隐
// view-active → display: block / visibility: visible
// view-inactive → display: none
// 优势：切换视图时保留状态，无需重新加载数据
<div className={`view-panel ${currentView === 'dashboard' ? 'view-active' : 'view-inactive'}`}>
  {/* 驾驶舱内容 */}
</div>
```

### 5.9 趋势图组件 (`src/renderer/components/TrendChart.tsx`)

**职责**：展示气缸动作执行时间的完整趋势，含实际数据、阈值线、预测延伸和置信区间。这是整个驾驶舱中**可视化维度最丰富**的图表。

**图表系列（按渲染层级从下到上）**：

| 层级 | 系列名 | 类型 | 说明 |
|------|--------|------|------|
| 1 | 上界 / 下界 | stacked area | 动态阈值置信区间带（半透明蓝色） |
| 2 | 预测上界 / 预测下界 | stacked area | 预测区域的置信区间带（半透明紫色，扇形扩散） |
| 3 | 执行时间 | line | 实际监测值，异常点变大变红 |
| 4 | 基线 | dashed line | 绿色虚线，设备健康参考值 |
| 5 | 动态阈值 | dotted line | 黄色点线，自适应上界 |
| 6 | 固定阈值 | dashed line | 红色虚线，绝对不能超过的线 |
| 7 | 预测 | dashed line | 紫色虚线，未来趋势预测 |
| 8 | markPoint / markArea / markLine | 标注 | 异常点/超限区域/分界线 |

**预测算法详解**（`TrendChart.tsx:49-84`）：

```typescript
// ── 输入 ──
// execution: 实际执行时间数组
// 要求至少 8 个数据点

// ── 第 1 步：基于最后 6 个点的线性回归 ──
const last6 = execution.slice(-6);     // 取末尾 6 点
const n = last6.length;                // n = 6
const xMean = (n - 1) / 2;            // = 2.5
const yMean = sum(last6) / n;
// 计算斜率 slope = Σ(xi-x̄)(yi-ȳ) / Σ(xi-x̄)²
let num = 0, den = 0;
for (let i = 0; i < n; i++) {
  num += (i - xMean) * (last6[i] - yMean);
  den += (i - xMean) ** 2;
}
const slope = num / den;               // 线性退化速率
const intercept = yMean - slope * xMean;

// ── 第 2 步：二次加速度修正 ──
// 假设退化速率每一步增加 15%（非匀速退化，越往后越快）
const accel = slope * 0.15;

// ── 第 3 步：残差标准差（用于置信区间扇形扩散）──
const residuals = last6.map((v, i) => v - (intercept + slope * i));
const rmse = Math.sqrt(sum(residuals²) / n);

// ── 第 4 步：生成 6 个预测点 ──
for (let p = 1; p <= 6; p++) {
  // 时间：每个预测点间隔 10 分钟
  predTimes.push(formatTime(lastTimeIdx + p * 10));
  // 值：线性外推 + 二次加速
  const predVal = intercept + slope * (n - 1 + p) + accel * p * p;
  predValues.push(Math.round(predVal));
  // 置信区间：随预测步数扇形扩散（不确定性递增）
  const fan = rmse * (1.5 + p * 0.8);
  predUpper.push(Math.round(predVal + fan));
  predLower.push(Math.round(predVal - fan * 0.6));
}
```

**交互功能**：

- **dataZoom**：内置缩放（鼠标滚轮）+ 底部滑块拖拽，支持任意时间段精细查看
- **Tooltip**：悬停显示完整数据（自动过滤 null 值）
- **markLine 分界线**：实际数据与预测数据的紫色虚线分隔
- **符号尺寸联动**：超限点自动放大为 12px 并变红

### 5.10 算法仿真引擎 (`useAlgorithmSimulation.ts`)

**职责**：驱动 TADPE 算法面板的五步流水线动画。这是**纯前端动画引擎**——所有指标变化通过 `setTimeout` 精确控制时序。

**五阶段配置**：

```typescript
const PHASES = [
  { key: 'feature_extraction',  duration: 3000, label: '多尺度时序特征提取' },
  { key: 'attention_encoding',  duration: 3000, label: '分层时间注意力编码' },
  { key: 'physics_constraint',  duration: 2500, label: '物理约束正则化网络' },
  { key: 'conformal_prediction', duration: 3000, label: '保形概率退化预测' },
  { key: 'decision_fusion',     duration: 2500, label: '自适应阈值决策融合' },
];
// 总时长 ≈ 14 秒
```

**指标变化插值**：

```typescript
function computeMetrics(phaseIdx, localT, globalT): AlgorithmMetrics {
  const t = easeInOutCubic(globalT);  // 全局 0→1 进度（带缓动）
  return {
    rul:              lerp(45, 12, t),     // 剩余寿命：45→12 天
    faultProbability: lerp(2, 67, t),     // 故障概率：2%→67%
    degradationRate:  lerp(0.2, 1.8, t),  // 退化速率：0.2→1.8 ms/天
    confidence:       lerp(0, 96.1, t),   // 置信度：0→96.1%
    healthScore:      lerp(98, 43, t),    // 健康分：98→43
    constraintLoss:   ...,                 // 物理约束损失：仅在阶段 3 起变化
  };
}
```

### 5.11 SplashScreen 开屏动画 (`SplashScreen.tsx`)

**职责**：应用启动时展示的品牌开场动画。

**动画时间线**（总计 2.2 秒 + 0.5 秒淡出）：

```
0ms         600ms        1200ms       2200ms   2700ms
│-----------│------------│------------│--------│
 进度条开始   技术标签       "系统就绪"    进度100%  调用onDone
             淡入显示       文字显示      触发淡出   回到驾驶舱
```

**视觉效果**：
- 双层旋转环（蓝色外环顺时钍 3s/圈，金色中环逆时针 2s/圈）
- 中心脉冲光点（缩放呼吸动画 1.5s/周期）
- 轨道旋转小点
- 4 个技术标签（5G MEC / TADPE 引擎 / 时序预测 / 数字孪生）依次淡入
- 渐变进度条（蓝→金色）

---

## 6. 关键业务流程

### 流程 1：驾驶舱数据加载与联动

```
步骤 1：App.tsx mount
  → useEffect 触发
  → 并行调用 window.predMaint.dashboard.getSnapshot()  // IPC → Main
           window.predMaint.app.getStatus()             // IPC → Main
           window.predMaint.extension.listEvents()       // IPC → Main
  → Main 进程 analytics.ts 计算 DashboardSnapshot
  → 返回 { cylinders, records, alerts, maintenance, kpis, topRisks, ... }

步骤 2：数据注入子组件
  → setSnapshot(dashboardData)
  → KpiCards 接收 kpis → 渲染 4 张卡片
  → RiskRankingChart 接收 topRisks → 渲染 Top 6 排行
  → EquipmentHeatmap 接收 cylinders → 渲染气泡散点图
  → AlertDistributionChart 接收 alerts → 渲染告警分布
  → TrendChart 接收 records + selectedCylinderUid → 渲染趋势图

步骤 3：用户点击交互 → 联动更新
  用户点击热力图气泡（CYL-07）
    → EquipmentHeatmap 调用 onSelect('CYL-07')
    → App.tsx setSelectedCylinderUid('CYL-07')
    → TrendChart 重渲染（过滤 CYL-07 的 records）
    → AiDiagnosisPanel 重渲染（分析 CYL-07）
    → QuickQuery 重渲染（上下文切换到 CYL-07）
    → RiskRankingChart 高亮 CYL-07
```

### 流程 2：AI 对话——从提问到流式回答

```
步骤 1：用户输入
  → ChatPanel 用户输入 "分析最高风险气缸"
  → 调用 window.predMaint.chat.send(text, { includeSnapshot: true })

步骤 2：Preload 生成 requestId
  → requestId = `${Date.now()}-${random6chars}`
  → ipcRenderer.invoke('chat:send', { requestId, userText, ... })

步骤 3：Main IPC 处理
  → ipc.ts: chatSendSchema.parse(payload)
  → activeRequests.add(requestId)  // 防止重复
  → streamMaintenanceAssistant(webContents, request)
    → hasApiKey?
       ├─ 是 → 调用 Claude API streaming
       │        stream.on('text', delta → webContents.send('chat:delta', ...))
       │        stream.finalMessage() → webContents.send('chat:done', ...)
       └─ 否 → sendMockResponse()
                setTimeout 模拟流式，每 180ms 发送一个 chunk
                → webContents.send('chat:delta', ...)
                → webContents.send('chat:done', { offline: true })

步骤 4：Renderer 接收流式数据
  → ChatPanel 中注册的回调触发
  → onDelta → 拼接 content 字符串 + setState 触发 Markdown 渲染
  → onDone  → 标记完成 + 显示 token 用量（在线模式）
  → onError → 显示错误消息
```

### 流程 3：PPT 一键启动应用

```
前提条件：
  1. 启动 launcher.mjs（node launcher.mjs）
     → spawn('npm', ['run', 'dev']) 预启动应用
     → HTTP Server 监听 localhost:9346

步骤 1：PPT 按钮点击
  → PPT HTML 中 JavaScript 执行：
     fetch('http://localhost:9346/launch')  // 先尝试 launcher
       .then(r => r.json())
     // 失败则降级：fetch('http://localhost:17654/launch')  // 直接桥接
     // 再失败则降级：window.open('http://localhost:5173')   // 开发服务器

步骤 2：launcher 收到请求
  → forward 'http://localhost:17654/launch' 到应用桥接
  → 桥接 localBridgeServer.ts 处理 /launch：
    → mainWindow.restore()      // 从最小化恢复
    → mainWindow.focus()        // 聚焦到前台
    → mainWindow.webContents.send('replay-splash')  // 通知渲染进程

步骤 3：Renderer 响应
  → preload index.ts: ipcRenderer.on('replay-splash', ...)
    → window.dispatchEvent(new CustomEvent('replay-splash'))
  → App.tsx: window.addEventListener('replay-splash', handleReplaySplash)
    → setShowSplash(true)
    → SplashScreen 组件渲染 → 2.2s 动画 → onDone → setShowSplash(false)
```

### 流程 4：TADPE 算法面板五步仿真

```
步骤 1：点击"启动引擎"
  → AlgorithmPanel → handleStart()
  → setFlashActive(true)  // 屏幕闪白效果 150ms
  → useAlgorithmSimulation.startSimulation()
    → setState({ phase: 'feature_extraction', isRunning: true, ... })

步骤 2：时序控制（useAlgorithmSimulation.ts）
  → 5 个 PHASE 依次执行，每个阶段内：
    - setTimeout 控制日志逐条输出（LOG_TEMPLATES 预定义文本）
    - setTimeout 控制指标逐帧更新（80ms/帧，easeInOutCubic 缓动）
    - 进度条从 0% → 100%
    - 注意力热力图权重动态变化（每个阶段不同的矩阵值）
  → 关键：使用 timeoutRefs.current 数组管理所有 setTimeout，
    确保 Reset 时能全部清除，防止内存泄漏

步骤 3：完成
  → setState({ phase: 'complete', progress: 100, metrics: 最终指标 })
  → 最终指标：RUL=12天, 故障概率=67%, 置信度=96.1%, 健康分=43
```

### 流程 5：浏览器插件数据采集

```
步骤 1：浏览器插件中用户选择文本并发送
  → 插件 popup/content-script 构造请求体：
     { token, source: 'popup', page: { url, title }, selectedText, note, createdAt }
  → HTTP POST to http://localhost:17654/extension/ingest

步骤 2：桥接服务处理
  → localBridgeServer.ts /extension/ingest：
    → Zod schema 校验
    → Token 鉴权（对比 ELECTRON_BRIDGE_TOKEN）
    → 构造 ExtensionEvent，存入内存数组（上限 50 条，FIFO）
    → webContents.send('extension:event', event)  // 推送到 Renderer

步骤 3：Renderer 显示
  → preload / App.tsx 中注册的 onEvent 回调
    → setExtensionEvents(prev => [event, ...prev])
    → 同时自动切换到 ExtensionInbox Tab（setActivePanel('extension')）
  → ExtensionInbox 渲染事件卡片列表

步骤 4：轮询补充（ipc.ts 中 setInterval）
  → 每 3 秒调用 listExtensionEvents()
  → 与已知事件 ID 集合对比，发现新事件则推送
  → 处理极端情况：插件直接 POST 到桥接但 IPC 推送丢失时，轮询兜底
```

---

## 7. 配置系统详解

### 7.1 配置项总表

#### 7.1.1 环境变量（`.env` 文件）

| 配置项 | 作用 | 默认值 | 修改影响 |
|--------|------|--------|----------|
| `ANTHROPIC_API_KEY` | Claude API 鉴权密钥 | 无 | 不设则 AI 对话使用 Mock 模式；设置则连接真实 LLM |
| `ANTHROPIC_MODEL` | Claude 模型 ID | `claude-opus-4-8` | 更换模型影响回答质量和速度；可选 `claude-sonnet-4-6` 等 |
| `ANTHROPIC_BASE_URL` | API 端点地址 | 默认 SDK 地址 | 用于代理转发或私有 Anthropic 部署 |
| `ELECTRON_BRIDGE_PORT` | HTTP 桥接端口 | `17654` | 修改后需同步更新 launcher 和 PPT HTML 中的端口 |
| `ELECTRON_BRIDGE_TOKEN` | 桥接鉴权 Token | `demo-bridge-token` | 修改后浏览器插件也需同步更新 |

#### 7.1.2 构建配置（`package.json` → `build` 字段）

| 配置项 | 位于 | 作用 | 默认值 |
|--------|------|------|--------|
| `appId` | `build.appId` | Windows 应用唯一标识 | `com.telecom.ai-predictive-maintenance` |
| `productName` | `build.productName` | 安装后显示的应用名 | `明鉴——AI+设备预测性维护平台` |
| `directories.output` | `build.directories.output` | 打包输出目录 | `release/${version}` |
| `win.target` | `build.win.target` | Windows 打包格式 | NSIS + Portable（均为 x64） |
| `nsis.oneClick` | `build.nsis.oneClick` | 是否一键安装（false=有安装向导） | `false` |
| `nsis.allowToChangeInstallationDirectory` | `build.nsis.allowToChangeInstallationDirectory` | 是否允许自定义安装路径 | `true` |
| `mac.target` | `build.mac.target` | macOS 打包格式 | DMG（universal） |
| `mac.identity` | `build.mac.identity` | macOS 签名证书 | `null`（未签名，部署受限） |

#### 7.1.3 TypeScript 配置（`tsconfig.json`）

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `target` | `ES2022` | 编译目标 JavaScript 版本 |
| `module` | `ESNext` | 模块系统 |
| `moduleResolution` | `Bundler` | 适用于 Vite/Webpack 等打包器 |
| `strict` | `true` | 启用所有严格类型检查 |
| `jsx` | `react-jsx` | 使用 React 17+ 的新 JSX Transform |
| `noEmit` | `true` | 仅类型检查，不输出文件（实际构建由 Vite 完成） |

#### 7.1.4 Electron-Vite 构建配置（`electron.vite.config.ts`）

| 进程 | 入口文件 | 插件 |
|------|----------|------|
| `main` | `src/main/index.ts` | `externalizeDepsPlugin()` — 将 Node 依赖外部化（不打包进 bundle） |
| `preload` | `src/preload/index.ts` | `externalizeDepsPlugin()` |
| `renderer` | `index.html` | `react()` — React JSX/TSX 转换 |

### 7.2 多环境建议配置

#### 开发环境

```bash
ANTHROPIC_API_KEY=           # 留空，使用 Mock 模式加快迭代
ANTHROPIC_MODEL=claude-opus-4-8
ELECTRON_BRIDGE_PORT=17654
ELECTRON_BRIDGE_TOKEN=demo-bridge-token
```

#### 路演/演示环境

```bash
ANTHROPIC_API_KEY=sk-ant-...  # 填入有效密钥，展示真实 AI 能力
ANTHROPIC_MODEL=claude-sonnet-4-6  # Sonnet 更快更便宜
ELECTRON_BRIDGE_PORT=17654
ELECTRON_BRIDGE_TOKEN=demo-bridge-token
```

#### 生产部署（理论）

```bash
ANTHROPIC_API_KEY=sk-ant-...  # 正式密钥
ANTHROPIC_MODEL=claude-opus-4-8  # 最强模型
ANTHROPIC_BASE_URL=https://your-proxy.example.com  # 通过内网代理
ELECTRON_BRIDGE_PORT=17654
ELECTRON_BRIDGE_TOKEN=<随机生成强Token>
```

---

## 8. 数据与存储设计

### 8.1 存储总览

**当前状态：纯内存存储，无持久化数据库。**

这是有意为之的设计决策——本项目是一个**演示平台**，所有数据在应用启动时由 mock 数据层动态生成，关闭后全部丢弃。

### 8.2 内存数据结构

#### 8.2.1 Mock 数据集合（`src/main/mock/mockData.ts`）

```
全局变量                         类型                  数量
─────────────────────────────────────────────────────────────
cylinders (导出)                 CylinderAsset[]        75 条
records (导出)                   ActionTimeRecord[]     2700 条 (75×36)
alerts (导出)                    AlertRecord[]          ~20 条
maintenance (导出)               MaintenanceRecord[]    ~50 条
```

这些全局变量在 Main 进程启动时**一次性计算**，之后每次 `getDashboardSnapshot()` 调用时基于它们做聚合计算，不产生新的持久化数据。

#### 8.2.2 运行时状态

```
位置                           状态                  类型                  生命周期
──────────────────────────────────────────────────────────────────────────────────
Main: localBridgeServer.ts     events[]               ExtensionEvent[]      应用运行期间（最多50条）
Main: ipc.ts                   activeRequests         Set<string>           对话期间（完成即清理）
Main: ipc.ts                   knownExtensions        Set<string>           应用运行期间
Renderer: App.tsx              snapshot               DashboardSnapshot     每次 getSnapshot 刷新
Renderer: App.tsx              selectedCylinderUid    string | undefined    用户交互期间
Renderer: App.tsx              extensionEvents        ExtensionEvent[]      应用运行期间
Renderer: ChatPanel.tsx        messages[]             ChatMessage[]         对话期间
```

### 8.3 数据生成与生命周期

```
应用启动
  │
  ├─ mockData.ts 模块加载（Main 进程初始化时执行一次）
  │   ├─ cylinders = generateCylinders()     ← 确定性随机生成 75 台气缸
  │   ├─ records = cylinders.flatMap(...)     ← 每台 36 条记录
  │   ├─ alerts = alertable.map(...)          ← 从低健康分设备生成告警
  │   └─ maintenance = cylinders.filter(...)  ← 采样生成维护记录
  │
  ├─ Renderer 请求 getSnapshot()
  │   └─ analytics.ts 聚合计算（读取全局 mock 数据，不修改）
  │       ├─ buildKpis()
  │       ├─ buildTopRisks()
  │       └─ buildStationHealth()
  │
  └─ 应用退出 → 所有数据释放（无持久化）
```

### 8.4 缓存策略

**当前无缓存设计**。每次 `getSnapshot()` 调用都重新计算统计数据。计算量极小（75 台设备的简单聚合），不存在性能瓶颈。

**如后续接入真实数据库**，建议的缓存策略：

| 缓存键 | 数据 | 过期时间 | 原因 |
|--------|------|----------|------|
| `kpi:summary` | DashboardKpis | 30s | KPI 变化慢，短缓存即可减少查询 |
| `risk:top6` | RiskItem[] | 60s | 风险排行变化不频繁 |
| `cylinder:{uid}:trend` | ActionTimeRecord[] | 5min | 趋势数据量大，按设备缓存 |
| `alert:active` | AlertRecord[] | 10s | 告警需较及时更新 |

### 8.5 消息队列/事件流

**当前无独立消息队列**。事件流通过以下机制实现：

1. **IPC 推送**（Main → Renderer）：`webContents.send('chat:delta', ...)` — 适合单窗口
2. **定时轮询**（extension events）：`setInterval(3000)` — 低频简单场景
3. **HTTP 推送**（插件 → 桥接 → Main → Renderer）：`POST /extension/ingest` → `webContents.send`

如扩展到多窗口或多用户场景，建议引入 Redis Pub/Sub 或 WebSocket 替代 setInterval 轮询。

---

## 9. API 接口全览

### 9.1 IPC 接口（Main ↔ Renderer，内部通信）

#### 9.1.1 `dashboard:getSnapshot`

```
通道：dashboard:getSnapshot
模式：ipcMain.handle / ipcRenderer.invoke（请求-响应）
参数：selectedCylinderUid?: string
返回：DashboardSnapshot

示例（Renderer 调用）：
  const data = await window.predMaint.dashboard.getSnapshot('CYL-CSKG-ST-03-007');

返回体示例（精简）：
{
  "generatedAt": "2026-06-09T02:00:00.000Z",
  "kpis": { "totalCylinders": 75, "averageHealthScore": 76, ... },
  "topRisks": [
    { "cylinderUid": "CYL-CSKG-ST-03-007", "healthScore": 28, "faultProbability": 78, ... }
  ],
  "selectedCylinderUid": "CYL-CSKG-ST-03-007",
  ...
}
```

#### 9.1.2 `chat:send` + 流式回调

```
通道：chat:send
模式：ipcMain.handle（触发）+ webContents.send（推送流式数据）
参数：{ requestId: string, userText: string, selectedCylinderUid?: string, includeSnapshot: boolean }
返回（立即）：{ accepted: true, requestId: string }

流式回调（异步推送）：
  chat:delta  → { requestId, delta: "## 🔴 最高风险..." }
  chat:done   → { requestId, usage?: { inputTokens, outputTokens }, offline?: true }
  chat:error  → { requestId, message, code }

示例（Renderer 调用）：
  const requestId = await window.predMaint.chat.send('分析最高风险气缸');
  window.predMaint.chat.onDelta((event) => { console.log(event.delta); });
  window.predMaint.chat.onDone((event) => { console.log('完成', event.usage); });
```

#### 9.1.3 窗口控制通道

```
通道：window:minimize / window:maximize / window:close
模式：ipcMain.on / ipcRenderer.send（单向事件）
参数：无
返回：无（单向发送，不等待响应）

示例：
  window.predMaint.window.minimize();
  window.predMaint.window.maximize();
  window.predMaint.window.close();
```

### 9.2 HTTP 接口（外部调用）

#### 9.2.1 健康检查

```
GET http://localhost:17654/health

响应 200：
{
  "ok": true,
  "app": "predictive-maintenance-demo",
  "version": "0.1.0"
}
```

#### 9.2.2 应用启动/聚焦

```
GET http://localhost:17654/launch

响应 200：
{
  "ok": true,
  "focused": true,
  "splashReplay": true
}

行为：
  1. 恢复最小化的窗口
  2. 聚焦窗口到前台
  3. 触发开屏动画重播
```

#### 9.2.3 浏览器插件摘录

```
POST http://localhost:17654/extension/ingest
Content-Type: application/json

请求体：
{
  "token": "demo-bridge-token",
  "source": "popup",
  "page": {
    "url": "https://example.com/mes/dashboard",
    "title": "MES 设备监控面板"
  },
  "selectedText": "CYL-07 执行时间持续偏高，建议检查。",
  "note": "需要进一步确认密封圈状态",
  "createdAt": "2026-06-09T10:30:00.000Z"
}

响应 200：
{ "ok": true, "eventId": "abc123xyz" }

响应 403（Token 无效）：
{ "ok": false, "error": "invalid_token" }

响应 400（参数不合法）：
{ "ok": false, "error": "invalid_payload" }

响应 413（请求体过大 >64KB）：
{ ok: false, error: "invalid_payload" }
```

### 9.3 Launcher 守护进程 HTTP 接口

```
GET http://localhost:9346/health

响应 200：
{ "ok": true, "appRunning": true }   // appRunning 为 false 表示应用已退出
```

```
GET http://localhost:9346/launch

行为：
  转发请求到 http://localhost:17654/launch
  若桥接未就绪 → 返回 { ok: true, status: "loading" }
  若桥接响应成功 → 返回 { ok: true, status: "focused" }
```

### 9.4 错误码定义

| 错误码 | 含义 | 触发条件 |
|--------|------|----------|
| `authentication_error` | Claude API Key 无效 | `Anthropic.AuthenticationError` |
| `rate_limit_error` | API 请求频率超限 | `Anthropic.RateLimitError` |
| `api_error` | Claude API 服务端错误 | `Anthropic.APIError` |
| `llm_error` | LLM 调用通用错误 | 其他未分类异常 |
| `invalid_token` | 桥接 Token 不匹配 | 插件发送的 token ≠ `ELECTRON_BRIDGE_TOKEN` |
| `invalid_payload` | 请求体格式不合法 | Zod Schema 校验失败 |
| `payload_too_large` | 请求体超过 64KB | 插件发送的文本过大 |
| `not_found` | HTTP 路由不匹配 | 请求了未定义的 URL 路径 |

---

## 10. 状态管理与数据流

### 10.1 状态管理总览

本项目**不使用 Redux/MobX/Zustand 等状态管理库**。状态管理采用 **React 内置方案**：

- **全局状态**：App.tsx 中的 `useState` + props 向下传递
- **跨组件事件**：CustomEvent + `window.dispatchEvent` / `window.addEventListener`
- **服务端状态**：Preload bridge 封装的 IPC 调用（每次请求从 Main 获取最新数据）

### 10.2 数据流图

```
┌──────────────────────────────────────────────────────────┐
│                      数据流向                              │
│                                                          │
│  Main Process (内存 Mock 数据)                            │
│       │                                                  │
│       │ IPC (ipcMain.handle / webContents.send)          │
│       ▼                                                  │
│  Preload Bridge (contextBridge.exposeInMainWorld)        │
│       │                                                  │
│       │ window.predMaint.*                               │
│       ▼                                                  │
│  Renderer Process                                        │
│       │                                                  │
│       │ React State (App.tsx)                            │
│       ├── snapshot: DashboardSnapshot                    │
│       ├── selectedCylinderUid: string                     │
│       ├── currentView: AppView                           │
│       ├── activePanel: RightPanelTab                     │
│       └── extensionEvents: ExtensionEvent[]              │
│       │                                                  │
│       │ Props / CustomEvent                               │
│       ▼                                                  │
│  子组件 (KpiCards, TrendChart, AiDiagnosisPanel, ...)    │
│       │                                                  │
│       │ 用户交互 (onClick / onChange / dispatchEvent)     │
│       ▼                                                  │
│  App.tsx (setState) → 重新渲染所有依赖子组件              │
└──────────────────────────────────────────────────────────┘
```

### 10.3 组件间通信的三种方式

| 方式 | 使用场景 | 示例 |
|------|----------|------|
| **Props 传递** | 父子组件直接通信 | `App → <TrendChart selectedCylinderUid={...} />` |
| **Callback Props** | 子→父通知 | `<RiskRankingChart onSelect={setSelectedCylinderUid} />` |
| **CustomEvent** | 跨层级/非父子组件通信 | `window.dispatchEvent(new CustomEvent('selectCylinder', { detail: uid }))` |

### 10.4 事件驱动机制

**全局自定义事件列表**：

| 事件名 | 方向 | Payload | 发送方 | 接收方 |
|--------|------|---------|--------|--------|
| `selectCylinder` | 任意→App | `string` (UID) | Heatmap/AlertsTable/QuickQuery 等 | App.tsx |
| `switchPanel` | 任意→App | `RightPanelTab` | QuickQuery 等 | App.tsx |
| `replay-splash` | Main→App | 无 | Main (webContents.send) → Preload → DOM | App.tsx |

**实现细节**：

```typescript
// ── 发送方（子组件）──
const uid = 'CYL-CSKG-ST-03-007';
window.dispatchEvent(new CustomEvent('selectCylinder', { detail: uid }));

// ── 接收方（App.tsx useEffect）──
const handleSelectCylinder = (e: Event) => {
  const uid = (e as CustomEvent<string>).detail;
  if (uid) setSelectedCylinderUid(uid);
};
window.addEventListener('selectCylinder', handleSelectCylinder);
return () => window.removeEventListener('selectCylinder', handleSelectCylinder);
```

### 10.5 视图切换数据保持

由于 6 个视图使用 CSS `display` 控制显隐（而非条件渲染），切换到非驾驶舱视图再切回时，**所有图表状态保持不变**（无需重新加载数据、无需重新渲染图表）。

**例外**：AlgorithmPanel 中使用 `useAlgorithmSimulation` 的仿真状态在组件保持挂载时不会丢失。但如果用户切换视图时恰好在仿真进行中，定时器仍会继续执行（因为组件仍在 DOM 中）。

---

## 11. 测试方案与质量保障

### 11.1 当前测试状况

**坦白说明：本项目目前没有正式的自动化测试。** 这是竞赛/演示项目的现实——所有验证依赖：

1. **手动功能测试**：开发过程中逐功能手动验证
2. **TypeScript 类型检查**：`npm run typecheck`（`tsc --noEmit`），作为编译时的静态分析
3. **构建验证**：`npm run build` 成功即证明所有模块正确编译和链接
4. **打包验证**：`npm run dist` 成功后，在目标平台启动 `.exe` 验证

### 11.2 TypeScript 类型检查

```bash
npm run typecheck
# 等同于 tsc --noEmit
# 检查所有 .ts / .tsx 文件的类型正确性
# 无输出 = 通过
```

**检查覆盖**：
- IPC 通信的请求/响应类型匹配
- 组件 Props 类型匹配
- Zod Schema 与 TypeScript 类型的协同
- 第三方库 API 调用签名

### 11.3 建议的测试方案（路线图）

如项目进入正式开发阶段，建议按以下优先级补充测试：

| 优先级 | 测试类型 | 覆盖范围 | 工具建议 |
|--------|----------|----------|----------|
| P0 | 单元测试 | `analytics.ts`（KPI 计算/TopRisks 排序） | Vitest |
| P0 | 单元测试 | `mockData.ts`（数据生成逻辑） | Vitest |
| P1 | 单元测试 | `anthropicClient.ts`（Mock 模式响应匹配） | Vitest |
| P1 | 组件测试 | `TrendChart.tsx`（ECharts 配置正确性） | Vitest + @testing-library/react |
| P2 | E2E 测试 | 驾驶舱数据加载→选中气缸→图表联动 | Playwright + Electron |
| P2 | E2E 测试 | AI 对话发送→流式接收→Markdown 渲染 | Playwright + Electron |

### 11.4 已知薄弱区域

- **算法仿真引擎**（`useAlgorithmSimulation.ts`）——大量 setTimeout 时序控制，无单元测试验证指标插值正确性
- **ECharts 配置**——所有图表配置通过肉眼验证，没有 snapshot 测试
- **IPC 错误处理**——缺少网络断开、JSON 序列化失败等异常场景的覆盖
- **窗口控制**——最小化/最大化/关闭在无边框模式下的行为，macOS 平台未测试

---

## 12. 已知问题、限制与技术债

### 12.1 已知 Bug

| 编号 | 严重程度 | 描述 | 影响 | 临时规避 |
|------|----------|------|------|----------|
| B1 | 低 | `mingjian://` 协议在部分 Windows 版本上注册表路径可能不完整 | PPT 按钮可能无法直接拉起应用 | 使用 `launcher.mjs` 预启动 + HTTP 桥接兜底 |
| B2 | 低 | 趋势图 dataZoom 滑块拖拽到最右端时，预测区域可能与实际数据区域比例失调 | 视觉上预测区过大 | 手动调整滑块范围 |
| B3 | 低 | 算法仿真在阶段切换时快速点击"停止"→"启动"，可能出现两个仿真并行运行 | 日志和指标混乱 | 等待当前仿真完成或刷新页面 |

### 12.2 未完成功能

| 编号 | 功能 | 完成度 | 说明 |
|------|------|--------|------|
| UF1 | 真实数据库集成 | 0% | 当前纯 Mock 内存数据，无任何持久化 |
| UF2 | 用户认证系统 | 0% | 无登录、无权限区分 |
| UF3 | 浏览器插件完整实现 | ~30% | Extension Inbox 可接收插件事件，但插件本身未完整开发 |
| UF4 | macOS 完整适配 | ~70% | 构建配置已就绪，但未在 macOS 上完整测试过所有功能 |
| UF5 | 暗色/亮色主题切换 | 0% | 仅有深色科技风主题，无切换功能 |
| UF6 | 国际化（i18n） | 0% | 全部中文硬编码 |

### 12.3 性能瓶颈

| 编号 | 瓶颈 | 触发条件 | 影响 |
|------|------|----------|------|
| P1 | 全量数据传递 | 每次 `getSnapshot()` 返回全部 2700 条 records | 当前数据量可忽略（<1MB）；如接入真实数据（百万级记录），需改为分页/按需加载 |
| P2 | ECharts 重渲染 | 选中不同气缸时 TrendChart 完全重新 `setOption` | 当前 36 个数据点无性能问题；数据量增大后需使用 `appendData` 增量更新 |
| P3 | 无 useMemo 优化 | `App.tsx` 中大量子组件每次重渲染都重新计算 | 当前组件树不深，无明显卡顿 |

### 12.4 技术债

| 编号 | 问题 | 改进方向 |
|------|------|----------|
| TD1 | Props drilling | App.tsx 中 `snapshot` 和 `selectedCylinderUid` 通过 props 穿透多层传递。建议引入轻量 Context 或 Zustand |
| TD2 | CustomEvent 滥用 | 跨组件通信混合使用 Props + CustomEvent + Callback，缺乏统一规范。建议全部迁移到 Context + useReducer |
| TD3 | Mock 数据硬编码 | 告警的 reason/suggestion 文本硬编码在 `mockData.ts` 中，难以维护。建议抽取为配置文件 |
| TD4 | 样式分散 | 全局 CSS（styles.css）+ 组件内联 style（SplashScreen）混用。建议统一使用 CSS 变量 |
| TD5 | 无错误边界 | React 组件树中没有 ErrorBoundary，任何单个图表崩溃会导致整个页面白屏 |
| TD6 | 构建产物未压缩 | `out/` 目录下的编译产物未经过代码压缩/混淆 |

---

## 13. 优化与扩展建议

### 13.1 性能优化

#### 13.1.1 大数据量下的数据加载

**问题**：当前 `getSnapshot()` 返回全量 2700 条 records。接入真实数据后可能达到百万级，IPC 传输和前端解析都会成为瓶颈。

**方案**：
```typescript
// 改为分页 + 按需加载
// 1. 趋势图仅加载选中气缸最近 N 条记录
// 2. KPI/排行使用预聚合数据（由 Main 进程计算后返回）

// analytics.ts 新增函数
export function getCylinderRecords(
  cylinderUid: string, 
  page: number, 
  pageSize: number
): { records: ActionTimeRecord[]; total: number } {
  // 按需返回单设备记录
}

// ipc.ts 新增通道
ipcMain.handle('dashboard:getCylinderRecords', (_event, uid, page, pageSize) => {
  return getCylinderRecords(uid, page, pageSize);
});
```

#### 13.1.2 React 渲染优化

```typescript
// App.tsx — 使用 useMemo 避免无关重渲染
const trendChartProps = useMemo(() => ({
  selectedCylinderUid,
  cylinders: snapshot?.cylinders ?? [],
  records: snapshot?.records ?? [],
}), [selectedCylinderUid, snapshot?.cylinders, snapshot?.records]);

// 子组件使用 React.memo
export default React.memo(TrendChart);
```

### 13.2 安全加固

#### 13.2.1 CSP 策略强化

当前 `index.html` 中 CSP 允许 `'unsafe-inline'` 和 `'unsafe-eval'`。建议：
- 将内联样式迁移到 CSS 文件（SplashScreen 的内联 style 移到 styles.css）
- 移除 `'unsafe-eval'`（ECharts 不需要 eval）

#### 13.2.2 桥接 Token 强化

当前默认 Token 为 `demo-bridge-token`，建议：
- 首次启动时自动生成随机 Token 并持久化到本地文件
- 提供 UI 界面供用户查看和刷新 Token

```typescript
// 生成随机 Token
import { randomBytes } from 'node:crypto';
const token = randomBytes(32).toString('hex');
```

### 13.3 可维护性改进

#### 13.3.1 引入轻量状态管理

```typescript
// 使用 React Context 替代 Props drilling

// context/DashboardContext.tsx
const DashboardContext = createContext<{
  snapshot: DashboardSnapshot | null;
  selectedCylinderUid: string | undefined;
  selectCylinder: (uid: string) => void;
}>({ ... });

// App.tsx — 提供 Context
<DashboardContext.Provider value={{ snapshot, selectedCylinderUid, selectCylinder }}>
  {/* 子组件直接 useContext，无需 props 传递 */}
</DashboardContext.Provider>
```

#### 13.3.2 抽取图表配置为独立文件

当前 TrendChart.tsx 中 ECharts option 构造逻辑与组件耦合在一起。建议：

```
src/renderer/charts/
  ├── trendChartOption.ts      ← 趋势图 option 工厂函数
  ├── alertChartOption.ts      ← 告警分布 option 工厂函数
  ├── heatmapOption.ts         ← 热力图 option 工厂函数
  └── riskChartOption.ts       ← 风险排行 option 工厂函数
```

#### 13.3.3 添加 ErrorBoundary

```tsx
// src/renderer/components/ErrorBoundary.tsx
class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <div>图表加载失败</div>;
    }
    return this.props.children;
  }
}
```

### 13.4 扩展建议

#### 13.4.1 真实数据接入方案

```
当前架构：
  Mock 数据 (mockData.ts) → analytics.ts → DashboardSnapshot → Renderer

建议架构：
  真实数据源 (PLC/MQTT/OPC-UA)
    → Data Collector Service (独立进程或 sidecar)
    → SQLite / PostgreSQL
    → analytics.ts 改为从数据库查询
    → DashboardSnapshot → Renderer
```

**最小改动方案**：保持 `DashboardSnapshot` 接口不变，仅替换 `analytics.ts` 中的数据源：
```typescript
// analytics.ts
export async function getDashboardSnapshot(uid?: string): Promise<DashboardSnapshot> {
  // 替换：const data = mock.cylinders
  // 为：  const data = await db.query('SELECT * FROM cylinders')
}
```

#### 13.4.2 WebSocket 实时推送

当前通过 IPC setInterval 3 秒轮询检查插件事件。建议：
```typescript
// localBridgeServer.ts — 升级为 WebSocket Server
import { WebSocketServer } from 'ws';
const wss = new WebSocketServer({ server }); // 复用 HTTP Server

// 插件事件 → 实时广播到所有连接的客户端
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'events', data: events }));
});
```

#### 13.4.3 多产线/多租户支持

当前数据结构中已有 `lineId` 和 `stationId` 字段，但前端未提供产线级别的筛选/聚合。建议在 NavBar 或 KpiCards 上方增加产线下拉选择器：

```tsx
// 新增组件 LineSelector.tsx
<select onChange={(e) => setFilterLine(e.target.value)}>
  <option value="">全部产线</option>
  <option value="LINE-A">装配一线</option>
  <option value="LINE-B">压装二线</option>
  ...
</select>
```

### 13.5 3-6 个月重构路线图

| 月份 | 里程碑 | 关键任务 |
|------|--------|----------|
| **第 1 月** | 测试与质量 | 补充核心模块单元测试（analytics/mockData/趋势预测算法）；添加 ErrorBoundary；修复已知 Bug |
| **第 2 月** | 架构清理 | 引入 Zustand 状态管理；统一事件通信机制；抽取图表配置文件；Clean CSS |
| **第 3 月** | 数据层真实化 | 设计 SQLite Schema；实现数据采集适配层（PLC/MQTT → DB）；保持 DashboardSnapshot 接口兼容 |
| **第 4-5 月** | 功能增强 | 用户认证；产线筛选；告警规则可配置化；数据导出增强（Excel/PDF）；Dashboard 自定义布局 |
| **第 6 月** | 生产就绪 | 性能压测与优化；安全审计；macOS 完整测试与签名；CI/CD 流水线；自动化 E2E 测试 |

---

## 14. 附录

### 14.1 术语表

| 缩写/术语 | 全称 | 说明 |
|-----------|------|------|
| **TADPE** | Temporal-Attentive Degradation Prediction Engine | 时序自适应退化预测引擎，本项目核心算法的品牌名 |
| **PHM** | Prognostics and Health Management | 故障预测与健康管理行业术语 |
| **RUL** | Remaining Useful Life | 剩余可用寿命（天） |
| **OEE** | Overall Equipment Effectiveness | 设备综合效率 = 可用率 × 性能率 × 合格率 |
| **MES** | Manufacturing Execution System | 制造执行系统 |
| **ERP** | Enterprise Resource Planning | 企业资源计划系统 |
| **SCADA** | Supervisory Control and Data Acquisition | 数据采集与监视控制系统 |
| **SOP** | Standard Operating Procedure | 标准作业程序 |
| **基线 (Baseline)** | — | 设备健康状态下动作执行时间的统计均值 |
| **动态阈值** | — | TADPE 基于最近 7 天数据自适应计算的上界（μ + 2.5σ） |
| **固定阈值** | — | 绝对不能超过的警报线（= 基线 × 1.5） |
| **保形预测 (Conformal Prediction)** | — | 输出预测区间而非单点值的统计方法，提供置信度保证 |
| **物理约束正则化 (Physics-Informed Regularization)** | — | 在模型中引入物理规律约束（如磨损单调性），排除物理上不可能的结果 |
| **IPC** | Inter-Process Communication | Electron 主进程与渲染进程之间的通信机制 |
| **contextBridge** | — | Electron 安全机制，在保持 contextIsolation 的同时暴露有限 API 到渲染进程 |
| **NSIS** | Nullsoft Scriptable Install System | Windows 安装包制作工具 |
| **DMG** | Disk Image | macOS 应用分发格式 |

### 14.2 学术前沿参考

本项目的 TADPE + LLM 两层架构设计参考了以下 PHM 领域前沿研究：

| 论文/综述 | 发表 | 与本项目的关联 |
|-----------|------|----------------|
| PhyNet: Physics-Informed Neural Networks for PHM | EAAI 2025（西交大） | TADPE 物理约束正则化——将物理规律编码为损失函数，排除不可能结果 |
| PHM-LM: Large Model Paradigms for PHM | MSSP 2025（北航） | 范式二"预测模型 + LLM 并行"——TADPE 做退化语义提炼，LLM 做因果推断，与论文框架一致 |

### 14.3 关键第三方服务

| 服务 | 用途 | 配置位置 |
|------|------|----------|
| **Anthropic Claude API** | AI 对话推理引擎 | 环境变量 `ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL` |
| **Google Fonts** | Noto Sans SC / Orbitron / JetBrains Mono 字体 | `src/renderer/styles.css` 第 1 行 `@import url(...) ` |

### 14.4 文件编码与换行约定

- 所有 `.ts` / `.tsx` 文件：UTF-8 编码，LF 换行
- `.css` 文件：UTF-8
- `.html` 文件：UTF-8，`lang="zh-CN"`
- `.md` 文件：UTF-8

### 14.5 参考文档与链接

| 文档 | 位置 |
|------|------|
| Electron 官方文档 | https://www.electronjs.org/docs |
| Electron-Vite 文档 | https://electron-vite.org |
| React 19 文档 | https://react.dev |
| ECharts 5 文档 | https://echarts.apache.org/zh/option.html |
| Anthropic SDK 文档 | https://docs.anthropic.com/en/docs |
| Zod 文档 | https://zod.dev |
| electron-builder 文档 | https://www.electron.build |
| 项目 PPT（路演） | `提交/路演终稿/路演PPT.html` |
| 路演脚本 | `提交/路演终稿/路演脚本.md` |
| QA 问答准备 | `提交/路演终稿/QA大全-评委可能提问.md` |
| Electron 技术笔记 | `Electron技术文档.md` |

---

> **文档结束**  
> 如有任何疑问或需要补充的章节，请联系项目组。本文档应随项目代码同步更新。
