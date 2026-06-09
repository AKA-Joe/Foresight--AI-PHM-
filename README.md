# AI 设备预测性维护 Demo

基于 **Electron + React + TypeScript + Vite + ECharts + Claude API** 的桌面演示项目，面向“非标设备 5G+AI 预测性维护”场景。

## 演示能力

- 工业风预测性维护驾驶舱
- 动作执行时间、基线、动态阈值、固定阈值趋势图
- 活跃告警与维护闭环表格
- AI 运维助手 Chatbot
- Chrome / Edge 浏览器插件桥接收件箱
- 无 API Key 时可运行离线 mock AI 回复

## 技术栈

- Electron
- React + TypeScript
- Vite / electron-vite
- ECharts
- `@anthropic-ai/sdk`
- Chrome Extension Manifest V3

## 启动方式

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example`，在本地创建自己的环境变量配置：

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-opus-4-8
ELECTRON_BRIDGE_PORT=17654
ELECTRON_BRIDGE_TOKEN=demo-bridge-token
```

如果不设置 `ANTHROPIC_API_KEY`，应用会自动进入**离线 mock 模式**，仍可完整演示 Chatbot 交互。

### 3. 启动项目

```bash
npm run dev
```

### 4. 类型检查

```bash
npm run typecheck
```

### 5. 打包构建

```bash
npm run build
```

## 浏览器插件加载方式

1. 打开 Chrome / Edge 扩展管理页。
2. 开启“开发者模式”。
3. 选择“加载已解压的扩展程序”。
4. 选择本项目的 `extension/` 目录。
5. 确保 Electron 应用已经启动。
6. 在插件中输入与本地 `.env` 一致的 bridge token。

## 插件作用

插件会采集：

- 当前网页标题
- 当前网页 URL
- 当前页面选中文本
- 用户输入备注

并发送到本地 Electron 应用的 **插件收件箱**，供 AI 运维助手后续结合当前告警与风险分析。

## 重要说明

- Claude / Anthropic API Key **只在 Electron Main Process 中使用**。
- Renderer 和浏览器插件**不会直接接触 API Key**。
- 本项目当前使用本地 HTTP loopback bridge（`127.0.0.1`）连接浏览器插件与 Electron。
- 该 bridge 仅用于演示，不应直接视为生产方案；生产环境建议升级为 Native Messaging 或更严格的本地安全通道。

## 建议演示流程

1. 打开 Electron 桌面应用，展示工业驾驶舱。
2. 选中高风险气缸，查看动作执行时间趋势。
3. 通过 AI 运维助手提问：
   - “请分析当前最高风险气缸，并给出维修建议。”
   - “请根据当前告警生成班组交接摘要。”
4. 打开任意网页，选中文本，通过浏览器插件发送到桌面应用。
5. 在“插件收件箱”中展示接收到的网页内容。
6. 继续让 AI 运维助手结合插件资料生成分析建议。

## 目录结构

```text
src/main        Electron Main、IPC、LLM、mock 数据、插件桥接
src/preload     安全 preload API
src/renderer    React UI、ECharts、Chatbot、插件收件箱
extension       浏览器插件
```
