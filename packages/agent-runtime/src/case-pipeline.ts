import type { AgentExecutor, AgentResult, AgentTask } from './index.js';
import type { FulfillmentAction, FulfillmentExecutor } from './fulfillment.js';

export interface CasePipelineInput { caseId: string; tasks: AgentTask[]; action?: FulfillmentAction; }
export interface CasePipelineResult { caseId: string; agentResults: AgentResult[]; actionStatus?: FulfillmentAction['status']; }

export async function executeCasePipeline(input: CasePipelineInput, agent: AgentExecutor, fulfillment?: FulfillmentExecutor): Promise<CasePipelineResult> {
  const results: AgentResult[] = [];
  for (const task of input.tasks) results.push(await agent.execute(task));
  const failed = results.some((r) => r.status === 'failed' || r.status === 'blocked');
  if (failed || !input.action || !fulfillment) return { caseId: input.caseId, agentResults: results, actionStatus: input.action?.status };
  const completed = await fulfillment.execute(input.action);
  return { caseId: input.caseId, agentResults: results, actionStatus: completed.status };
}
