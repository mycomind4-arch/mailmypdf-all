import { applyStageResult, createFoundryRun, type OrchestratorState } from './orchestrator.js'
import type { FoundryStage, AgentRole, VerticalCandidate } from './foundry-contract.js'
import { makeTask, type AgentExecution, type AgentRuntimeAdapter } from './agent-runtime-adapter.js'
import { planStage } from './run-plan.js'

export class FoundryController {
  private state: OrchestratorState
  constructor(runId:string,candidate:VerticalCandidate) {
    const run=createFoundryRun(runId,candidate.id)
    this.state={run,currentStage:'RESEARCH',status:'RUNNABLE'}
  }
  getState():OrchestratorState { return this.state }
  async executeStage(candidate:VerticalCandidate, runtime:AgentRuntimeAdapter):Promise<OrchestratorState> {
    if(this.state.status!=='RUNNABLE') return this.state
    const stage=this.state.currentStage
    const tasks=planStage(candidate,stage)
    const executions:AgentExecution[]=[]
    for(const task of tasks) executions.push(await runtime.execute(task))
    const score=executions.length?Math.round(executions.reduce((s,e)=>s+e.score,0)/executions.length):0
    const blockers=executions.flatMap(e=>e.blockers)
    const reviewer=(tasks[0]?.role ?? 'release-judge') as AgentRole
    this.state=applyStageResult(this.state.run,{stage,score,blockers,status:executions.every(e=>e.status==='PASS')?'PASS':'FAIL',reviewer})
    return this.state
  }
}
