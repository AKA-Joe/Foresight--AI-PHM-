import type { ChatRequest } from '../../shared/types';
import { getCompactContext } from '../mock/analytics';

export const maintenanceSystemPrompt = `你是工业预测性维护助手，服务于非标自动化设备气缸动作执行时间监测场景。
你只能基于当前演示系统提供的 mock 数据回答，不要声称连接了真实设备、真实数据库或真实生产系统。
重点解释：气缸 UID、动作执行时间、基线、动态阈值、固定阈值、告警等级、趋势劣化、维修闭环。
回答面向设备工程师、生产运维人员和项目汇报场景，结论先行，建议可执行。
如果用户要求汇报材料，请使用简洁、专业、适合领导阅读的中文表达。`;

export function buildDashboardUserPrompt(request: ChatRequest) {
  const context = request.includeSnapshot ? getCompactContext(request.selectedCylinderUid) : undefined;

  return `用户问题：
${request.userText}

当前演示系统上下文：
${context ? JSON.stringify(context, null, 2) : '用户未请求附带 dashboard 快照。'}

请基于上述上下文回答。不要编造真实生产连接，不要声称已经读取真实数据库。`;
}
