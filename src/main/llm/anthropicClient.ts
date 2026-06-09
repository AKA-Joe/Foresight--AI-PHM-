import Anthropic from '@anthropic-ai/sdk';
import type { WebContents } from 'electron';
import type { ChatDoneEvent, ChatErrorEvent, ChatRequest } from '../../shared/types';
import { buildDashboardUserPrompt, maintenanceSystemPrompt } from './dashboardPrompt';

const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);

function sendMockResponse(webContents: WebContents, request: ChatRequest) {
  let cancelled = false;

  const chunks = [
    '【演示离线模式】当前未配置 ANTHROPIC_API_KEY，因此返回本地模拟分析。\n\n',
    '从 mock 数据看，最高风险点集中在升降复位气缸和夹爪缩回气缸：前者已触发固定阈值保护，建议立即停机确认机械卡滞、气源压力和限位信号；',
    '后者连续多次超过动态阈值，动作执行时间从基线附近持续爬升，符合趋势劣化预警，应安排计划检修。\n\n',
    '建议闭环动作：1）先处理紧急告警；2）为预警气缸安排周末窗口检查密封圈和润滑；3）维修后回填结果，用于优化后续健康评分。',
  ];

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

export function getLlmStatus() {
  return { enabled: hasApiKey, model };
}

export async function streamMaintenanceAssistant(webContents: WebContents, request: ChatRequest) {
  if (!hasApiKey) {
    sendMockResponse(webContents, request);
    return;
  }

  try {
    const client = new Anthropic();
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
