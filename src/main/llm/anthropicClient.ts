import Anthropic from '@anthropic-ai/sdk';
import type { WebContents } from 'electron';
import type { ChatDoneEvent, ChatErrorEvent, ChatRequest } from '../../shared/types';
import { buildDashboardUserPrompt, maintenanceSystemPrompt } from './dashboardPrompt';

const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const baseURL = process.env.ANTHROPIC_BASE_URL || undefined;
const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);

function sendMockResponse(webContents: WebContents, request: ChatRequest) {
  const chunks = getMockChunks(request.userText);

  chunks.forEach((delta, index) => {
    setTimeout(() => {
      webContents.send('chat:delta', { requestId: request.requestId, delta });
      if (index === chunks.length - 1) {
        const done: ChatDoneEvent = { requestId: request.requestId, offline: true };
        webContents.send('chat:done', done);
      }
    }, index * 180);
  });
}

function getMockChunks(prompt: string): string[] {
  if (prompt.includes('最高风险') || prompt.includes('维修建议')) {
    return [
      '## 🔴 最高风险气缸分析报告\n\n',
      '> 基于 TADPE 引擎实时推理结果，当前产线风险评估如下：\n\n',
      '---\n\n',
      '### 风险目标\n\n',
      '| 属性 | 值 |\n',
      '|------|----|\n',
      '| 气缸编号 | **CYL-07** |\n',
      '| 名称 | 升降复位气缸 |\n',
      '| 所属工位 | ST-03（装配主线） |\n',
      '| 健康评分 | **28**/100 🔴 |\n',
      '| 故障概率 | **78%** |\n',
      '| 剩余寿命 (RUL) | **≈12 天** |\n\n',
      '### 异常特征分析\n\n',
      '**1. 动作执行超时**\n',
      '- 当前值：**143ms**（基线 85ms，阈值 120ms）\n',
      '- 超阈比例：+19.2%\n',
      '- 连续触发：3 次（已满紧急告警条件）\n\n',
      '**2. 退化趋势加速**\n',
      '- 72h 趋势斜率：**+0.8ms/hr**（正常范围 <0.2ms/hr）\n',
      '- 退化加速度：近 24h 斜率较前 48h 增长 60%\n',
      '- 预测曲线：呈指数型上升趋势\n\n',
      '**3. 频谱异常**\n',
      '- 主频偏移：0.017Hz → 0.024Hz（+41%）\n',
      '- 高频噪声能量增加 2.3 倍，提示机械间隙增大\n\n',
      '### 📋 维修建议（按优先级排序）\n\n',
      '| 优先级 | 操作 | 预估耗时 | 所需资源 |\n',
      '|--------|------|----------|----------|\n',
      '| P0 | 立即停机，检查机械限位及气源管路 | 30min | 维修工程师×1 |\n',
      '| P1 | 测量缸筒内壁磨损，检查密封圈 | 45min | 内窥镜+千分尺 |\n',
      '| P2 | 校准气源压力至 0.5MPa 标准值 | 15min | 压力表 |\n',
      '| P3 | 更换密封组件（如磨损超限） | 2hr | 备件 SKU-07-SEAL |\n',
      '| P4 | 维修后重采基线，更新动态阈值 | 1hr | TADPE 系统自动完成 |\n\n',
      '### ⏰ 时间窗口建议\n\n',
      '- **最迟处理时限**：48 小时内（超时将触发保护性停机）\n',
      '- **推荐窗口**：最近一次换班间隙，预计影响产能 ≤2%\n',
      '- **若延迟处理**：非计划停机概率 >90%，影响范围扩展至相邻工位',
    ];
  }

  if (prompt.includes('告警规则') || prompt.includes('触发原因')) {
    return [
      '## 📊 告警规则体系与当前触发分析\n\n',
      '> 系统基于 TADPE 引擎的多层级自适应阈值机制运行，融合固定阈值、动态阈值和趋势预测三重判断逻辑。\n\n',
      '---\n\n',
      '### 一、三级告警机制\n\n',
      '| 等级 | 标识 | 触发条件 | 响应时限 | 响应要求 |\n',
      '|------|------|----------|----------|----------|\n',
      '| 紧急 | 🔴 | 动作时间 > 固定阈值（基线×1.4）连续 3 次 | **立即** | 停机检修，通知主管 |\n',
      '| 预警 | 🟡 | 超出动态阈值 或 趋势斜率超限 或 RUL < 14天 | **24h 内** | 计划窗口检修 |\n',
      '| 提示 | 🔵 | 健康评分下降 >10 分但未越限 | **本周内** | 加强监测频率 |\n\n',
      '### 二、阈值计算方法\n\n',
      '**固定阈值**\n',
      '- 公式：`Threshold_fixed = Baseline × 1.4`\n',
      '- 特点：绝对上限，不随时间变化，触发即为紧急\n\n',
      '**动态阈值**（TADPE 自适应计算）\n',
      '- 公式：`Threshold_dynamic = μ(7d) + 2.5σ(7d) + trend_compensation`\n',
      '- 更新周期：每小时滑动窗口重算\n',
      '- 优势：能识别"缓慢退化"类故障模式\n\n',
      '**趋势斜率阈值**\n',
      '- 正常范围：< 0.2 ms/hr\n',
      '- 预警线：≥ 0.3 ms/hr 持续 6h 以上\n\n',
      '### 三、当前活跃告警详情\n\n',
      '#### 🔴 CYL-07 紧急告警\n\n',
      '```\n',
      '触发时间：2024-01-15 14:23:07\n',
      '告警条件：动作执行时间 143ms > 固定阈值 120ms（基线 85ms × 1.4 = 119ms）\n',
      '连续次数：3/3（满足紧急条件）\n',
      '当前状态：待处理\n',
      '```\n\n',
      '#### 🟡 CYL-12 预警\n\n',
      '```\n',
      '触发时间：2024-01-15 12:45:31\n',
      '告警条件：趋势斜率 +0.5ms/hr 超出动态阈值范围\n',
      '附加条件：预测 RUL = 12天 < 安全阈值 14天\n',
      '当前状态：已排入计划检修\n',
      '```\n\n',
      '### 四、告警统计（近 7 天）\n\n',
      '| 指标 | 数值 |\n',
      '|------|------|\n',
      '| 紧急告警 | 1 次 |\n',
      '| 预警 | 3 次 |\n',
      '| 提示 | 7 次 |\n',
      '| 平均响应时间 | 23 分钟 |\n',
      '| 告警准确率 | 94.2% |',
    ];
  }

  if (prompt.includes('交接摘要') || prompt.includes('班组')) {
    return [
      '## 📋 班组交接摘要\n\n',
      '| 项目 | 内容 |\n',
      '|------|------|\n',
      '| 交接时间 | 当班周期结束 |\n',
      '| 交班人 | 当班值班工程师 |\n',
      '| 系统健康度 | **76/100**（较上班次 ↓3） |\n',
      '| 活跃告警 | 紧急 1 / 预警 2 / 提示 3 |\n\n',
      '---\n\n',
      '### 🔴 一、紧急事项（需立即关注）\n\n',
      '**CYL-07（升降复位气缸 · 工位 ST-03）**\n\n',
      '- 状态：已触发紧急告警，**未处理**\n',
      '- 表现：动作超时 143ms（阈值 120ms），连续 3 次\n',
      '- 风险：78% 故障概率，RUL ≈ 12 天\n',
      '- **建议**：下一班次优先安排停机检修，预计需要 2-3 小时\n',
      '- 备件准备：密封圈组件 SKU-07-SEAL（库存确认：有货）\n\n',
      '### 🟡 二、预警关注（计划窗口处理）\n\n',
      '**CYL-12（夹爪缩回气缸 · 工位 ST-05）**\n',
      '- 趋势劣化预警，斜率 +0.5ms/hr\n',
      '- RUL 约 12 天，建议本周末安排计划检修\n',
      '- 初步判断：气缸活塞密封老化，需更换\n\n',
      '**CYL-03（定位推送气缸 · 工位 ST-01）**\n',
      '- 健康评分从 82 降至 71（↓11），暂未越限\n',
      '- 退化斜率 +0.15ms/hr，接近预警线\n',
      '- 建议：提升监测频率至每 2 小时采样一次\n\n',
      '### ✅ 三、已完成维护\n\n',
      '| 设备 | 维护内容 | 结果 |\n',
      '|------|----------|------|\n',
      '| CYL-09 | 润滑保养 | ✅ 动作时间恢复至基线水平 |\n',
      '| CYL-15 | 气源管路清洁 | ✅ 压力恢复正常 |\n\n',
      '### 📝 四、其他备注\n\n',
      '- 产线整体 OEE：87.3%（目标 90%），主要受 CYL-07 影响\n',
      '- TADPE 引擎运行正常，最近一次全量推理：14:30\n',
      '- 下一次计划性维护窗口：本周六 06:00-10:00\n',
      '- 备件库存预警：CYL-12 专用密封件库存仅剩 1 套，建议补货',
    ];
  }

  if (prompt.includes('运行效率') || prompt.includes('产能影响')) {
    return [
      '## 📈 设备运行效率与产能影响评估\n\n',
      '> 基于过去 24 小时运行数据与 TADPE 引擎预测模型综合分析。\n\n',
      '---\n\n',
      '### 一、OEE 综合效率\n\n',
      '| 指标 | 当前值 | 目标值 | 差距 |\n',
      '|------|--------|--------|------|\n',
      '| **OEE 综合** | **87.3%** | 90.0% | -2.7% |\n',
      '| 可用率 | 94.1% | 96.0% | -1.9% |\n',
      '| 性能率 | 95.8% | 97.0% | -1.2% |\n',
      '| 合格率 | 96.9% | 97.0% | -0.1% |\n\n',
      '### 二、产能影响因素排序\n\n',
      '#### 🔴 因素 1：CYL-07 停机风险（影响度：高）\n\n',
      '- **现状**：动作超时导致 ST-03 工位节拍延长 12%\n',
      '- **预测**：若未在 48h 内处理，将触发保护停机\n',
      '- **影响范围**：ST-03 工位产出 ↓15%，下游 ST-04/ST-05 联动受限\n',
      '- **经济损失预估**：约 ¥2.8万/天（含停工+赶工成本）\n\n',
      '#### 🟡 因素 2：CYL-12 性能降级（影响度：中）\n\n',
      '- **现状**：动作时间延长 → 单工位节拍增加 8%\n',
      '- **瓶颈效应**：ST-05 已成为当前线体瓶颈工位\n',
      '- **产能折损**：理论产能 1,200件/班 → 实际 1,104件/班（↓8%）\n\n',
      '#### 🔵 因素 3：微停累计（影响度：低）\n\n',
      '- 过去 24h 因告警引发短暂停顿：累计 **12 分钟**\n',
      '- 单次微停平均 18 秒，共 40 次\n',
      '- 影响产出约 24 件\n\n',
      '### 三、产能恢复路径\n\n',
      '```\n',
      '当前 OEE 87.3%\n',
      '  │\n',
      '  ├─ 处理 CYL-07 → OEE +2.1% → 89.4%\n',
      '  │\n',
      '  ├─ 修复 CYL-12 → OEE +1.5% → 90.9%\n',
      '  │\n',
      '  └─ 优化微停策略 → OEE +0.3% → 91.2%\n',
      '```\n\n',
      '### 四、建议措施与预期收益\n\n',
      '| 措施 | 时间窗口 | 预期 OEE 提升 | 投入成本 |\n',
      '|------|----------|---------------|----------|\n',
      '| CYL-07 换班窗口检修 | 最近换班 | +2.1% | 人工 3h + 备件 ¥800 |\n',
      '| CYL-12 周末计划检修 | 本周六 | +1.5% | 人工 2h + 备件 ¥500 |\n',
      '| 微停阈值参数调优 | 随时 | +0.3% | TADPE 参数调整 |\n\n',
      '**总结**：优先处理 CYL-07 是投入产出比最高的措施，预计恢复后 OEE 可达 91%+，超过目标值。',
    ];
  }

  return [
    '## 📊 系统综合态势概览\n\n',
    '> 以下为当前预测性维护平台实时状态摘要。\n\n',
    '---\n\n',
    '### 设备总览\n\n',
    '| 指标 | 数值 | 状态 |\n',
    '|------|------|------|\n',
    '| 监测气缸总数 | 16 台 | — |\n',
    '| 整体健康度 | **76**/100 | 🟡 偏低 |\n',
    '| 系统 OEE | 87.3% | 🟡 低于目标 |\n',
    '| TADPE 引擎状态 | 正常运行 | ✅ |\n\n',
    '### 告警状态\n\n',
    '| 等级 | 数量 | 最新事件 |\n',
    '|------|------|----------|\n',
    '| 🔴 紧急 | 1 条 | CYL-07 动作超时 |\n',
    '| 🟡 预警 | 2 条 | CYL-12 趋势劣化、CYL-03 评分下降 |\n',
    '| 🔵 提示 | 3 条 | 常规退化监测 |\n\n',
    '### 风险 TOP 3\n\n',
    '| 排名 | 设备 | 健康评分 | 故障概率 | RUL |\n',
    '|------|------|----------|----------|-----|\n',
    '| 1 | CYL-07（升降复位） | 28 🔴 | 78% | ≈12天 |\n',
    '| 2 | CYL-12（夹爪缩回） | 52 🟡 | 45% | ≈18天 |\n',
    '| 3 | CYL-03（定位推送） | 71 🟡 | 22% | ≈30天 |\n\n',
    '### 建议后续操作\n\n',
    '1. **紧急**：处理 CYL-07 停机风险（选择上方对应预设问题可获取详细维修方案）\n',
    '2. **计划**：安排 CYL-12 周末检修窗口\n',
    '3. **监测**：提升 CYL-03 采样频率\n\n',
    '---\n\n',
    '*可使用上方预设问题深入分析特定主题，或直接输入自定义问题。*',
  ];
}

export function getLlmStatus() {
  return { enabled: hasApiKey, model, baseURL: baseURL || 'https://api.anthropic.com' };
}

export async function streamMaintenanceAssistant(webContents: WebContents, request: ChatRequest) {
  if (!hasApiKey) {
    sendMockResponse(webContents, request);
    return;
  }

  try {
    const client = new Anthropic({ baseURL });
    const stream = client.messages.stream({
      model,
      max_tokens: 16000,
      thinking: { type: 'enabled', budget_tokens: 8000 },
      system: maintenanceSystemPrompt,
      messages: [{ role: 'user', content: buildDashboardUserPrompt(request) }],
    } as any);

    stream.on('text', (delta) => {
      webContents.send('chat:delta', { requestId: request.requestId, delta });
    });

    const final = await stream.finalMessage();
    webContents.send('chat:done', {
      requestId: request.requestId,
      usage: {
        inputTokens: final.usage.input_tokens,
        outputTokens: final.usage.output_tokens,
      },
    } satisfies ChatDoneEvent);
  } catch (error) {
    let message = 'LLM 调用失败，请检查网络、API Key 或模型权限。';
    let code = 'llm_error';

    if (error instanceof Anthropic.AuthenticationError) {
      message = 'Anthropic API Key 无效或未授权。';
      code = 'authentication_error';
    } else if (error instanceof Anthropic.RateLimitError) {
      message = 'Anthropic API 请求频率受限，请稍后重试。';
      code = 'rate_limit_error';
    } else if (error instanceof Anthropic.APIError) {
      message = `Anthropic API 错误：${error.message}`;
      code = (error as any).type ?? 'api_error';
    }

    webContents.send('chat:error', { requestId: request.requestId, message, code } satisfies ChatErrorEvent);
  }
}
