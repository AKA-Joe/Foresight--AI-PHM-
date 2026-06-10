# AI 设备预测性维护 Demo — 项目状态与后续规划

## Context

项目目标：为"AI青年特训营"线下培训构建一个视觉吸引力强的演示 Demo，融合 Electron 桌面应用 + LLM (Claude) + AI Chatbot + 浏览器插件。场景为"非标设备 5G+AI 预测性维护"。

**当前状态：所有核心功能模块已完成，应用已能正常显示运行。**

## 已完成模块（100%）

| 模块 | 状态 | 关键文件 |
|------|------|----------|
| Electron 应用骨架 | ✅ 完成 | `src/main/index.ts`, `electron.vite.config.ts` |
| 工业驾驶舱 UI | ✅ 完成 | `src/renderer/App.tsx`, 9个组件 |
| ECharts 图表（趋势、告警分布、风险排行、热力图）| ✅ 完成 | `src/renderer/components/` |
| KPI 卡片 | ✅ 完成 | `KpiCards.tsx` |
| Mock 数据与分析聚合 | ✅ 完成 | `src/main/mock/` |
| AI Chatbot（流式输出）| ✅ 完成 | `ChatPanel.tsx`, `src/main/llm/` |
| LLM 集成（Claude API + 离线兜底）| ✅ 完成 | `anthropicClient.ts` |
| 浏览器插件（Manifest V3）| ✅ 完成 | `extension/` |
| 本地桥接服务 | ✅ 完成 | `localBridgeServer.ts` |
| Preload 安全隔离 | ✅ 完成 | `src/preload/index.ts` |
| 插件消息收件箱 | ✅ 完成 | `ExtensionInbox.tsx` |

## 后续规划：演示前验证与优化

### 阶段 1：功能端到端验证

1. **Dashboard 数据验证**
   - 确认 KPI 数字正确渲染
   - 确认 4 个 ECharts 图表均有数据、交互正常（点击风险排行切换趋势图）
   - 确认告警表和维护表有内容

2. **Chatbot 离线模式验证**
   - 不配置 `ANTHROPIC_API_KEY`，发送消息
   - 确认收到模拟流式回复，显示"演示模式"标识

3. **Chatbot LLM 模式验证**（可选，需 API Key）
   - 配置 `.env` 中 `ANTHROPIC_API_KEY`
   - 发送"请分析当前风险最高的气缸"
   - 确认流式输出正常、回答引用 mock 数据

4. **浏览器插件验证**
   - 在 Chrome/Edge 加载 `extension/` 为 unpacked extension
   - 配置 popup 中的 port 和 token
   - 选中网页文本，点击发送
   - 确认 Electron ExtensionInbox 收到消息

### 阶段 2：演示体验优化（可选）

根据展示需要，可考虑以下优化：

1. **视觉打磨**
   - 添加启动加载动画
   - 图表添加动态入场效果
   - 调整深色主题配色一致性

2. **演示流程引导**
   - 添加预设演示脚本（一键触发典型场景）
   - Chatbot 预置更多快捷问题

3. **稳定性**
   - 处理窗口 resize 时图表自适应
   - 网络断开时的优雅降级提示

### 阶段 3：打包分发（可选）

如需在培训现场分发：
- `npm run build` 构建生产包
- 使用 electron-builder 打包为 `.exe` 安装包
- 需要在 `package.json` 添加 electron-builder 配置

## 验证步骤（快速自检清单）

```bash
# 1. 启动应用
npm run dev

# 2. 检查 Dashboard
# → 窗口显示深色工业风界面、KPI 数字、图表、表格

# 3. 测试 Chatbot
# → 点击快捷问题或输入文字，观察流式回复

# 4. 测试浏览器插件（需手动）
# → Chrome → 扩展管理 → 加载已解压的扩展程序 → 选择 extension/ 目录
# → 打开任意网页 → 选中文字 → 点击插件 popup → 发送
# → 回到 Electron 查看收件箱

# 5. 可选：测试真实 LLM
# → 创建 .env 文件：ANTHROPIC_API_KEY=sk-ant-xxx
# → 重启 npm run dev
# → 发送问题，观察 Claude 实时回复
```

## 当前遗留问题

- 无自动化测试（Demo 项目，不影响演示）
- Chat 历史为会话级，关闭窗口后清空（符合演示需求）
- Bridge 无 TLS，使用明文 token（仅本地 127.0.0.1，Demo 可接受）
