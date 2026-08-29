import type {FoundryStage} from './foundry-contract.js'
export interface AutonomyDecision { allowed:boolean; reason:string; requiresHuman:boolean }
export function authorizeFoundryAction(stage:FoundryStage, action:string):AutonomyDecision { const consequential=stage==='DEPLOY'||stage==='REGISTER'||/\b(mail|charge|billing|payment|account|permission|publish)\b/i.test(action); if(consequential)return {allowed:false,reason:'consequential action requires explicit human approval',requiresHuman:true}; return {allowed:true,reason:'non-consequential foundry action',requiresHuman:false} }
