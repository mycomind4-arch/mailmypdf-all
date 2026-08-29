import type { AgentExecutor, AgentTask, AgentResult } from './index.js';
import { ToolRegistry } from './tools.js';
import { GovernedToolExecutor } from './tool-executor.js';

export interface SmokeReport {
  planned: boolean;
  agentSucceeded: boolean;
  toolSucceeded: boolean;
  fulfillmentAllowed: boolean;
}

/** Deterministic local smoke harness; live providers are validated separately at deployment. */
export async function runProductionSmoke(): Promise<SmokeReport> {
  const task: AgentTask<{ caseId: string }> = {
    id: 'smoke-task', role: 'case-agent', objective: 'inspect case', modelClass: 'REASONING', input: { caseId: 'smoke-case' }, maxAttempts: 1,
  };
  const executor: AgentExecutor = {
    async execute<I, O>(t: AgentTask<I>): Promise<AgentResult<O>> {
      return { taskId: t.id, status: 'succeeded', output: { ok: true } as O, confidence: 1, evidence: ['smoke:evidence'] };
    },
  };
  const result = await executor.execute(task);
  const registry = new ToolRegistry();
  registry.register({
    name: 'smoke.inspect', description: 'CI smoke tool', inputSchema: { type: 'object' }, risk: 'LOW',
    requiresApproval: false, reversible: true, idempotent: true, execute: async () => ({ ok: true }),
  });
  const tool = new GovernedToolExecutor(registry);
  const toolResult = await tool.invoke(
    { tool: 'smoke.inspect', input: {}, runId: 'smoke-run', caseId: 'smoke-case', idempotencyKey: 'smoke-1' }, {},
  );
  return {
    planned: true,
    agentSucceeded: result.status === 'succeeded',
    toolSucceeded: toolResult.status === 'SUCCEEDED',
    fulfillmentAllowed: result.status === 'succeeded' && toolResult.status === 'SUCCEEDED',
  };
}
