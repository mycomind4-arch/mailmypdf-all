import type {AgentRole} from './foundry-contract.js'
export type ModelClass='FAST'|'REASONING'|'VISION'|'CODE'|'MULTILINGUAL'|'EMBEDDING'
export interface ModelRoute { role:AgentRole; modelClass:ModelClass; provider:'cloudflare-ai-gateway'|'external-approved'; fallbackModelClass?:ModelClass }
export const defaultModelRoutes:readonly ModelRoute[]=[
 {role:'market-researcher',modelClass:'FAST',provider:'cloudflare-ai-gateway',fallbackModelClass:'REASONING'},
 {role:'competition-analyst',modelClass:'REASONING',provider:'cloudflare-ai-gateway',fallbackModelClass:'FAST'},
 {role:'product-strategist',modelClass:'REASONING',provider:'cloudflare-ai-gateway'},
 {role:'ux-architect',modelClass:'VISION',provider:'cloudflare-ai-gateway',fallbackModelClass:'REASONING'},
 {role:'vertical-architect',modelClass:'REASONING',provider:'cloudflare-ai-gateway'},
 {role:'builder',modelClass:'CODE',provider:'cloudflare-ai-gateway',fallbackModelClass:'REASONING'},
 {role:'security-qa',modelClass:'REASONING',provider:'cloudflare-ai-gateway'},
 {role:'ux-qa',modelClass:'VISION',provider:'cloudflare-ai-gateway'},
 {role:'domain-qa',modelClass:'REASONING',provider:'cloudflare-ai-gateway'},
 {role:'evidence-qa',modelClass:'REASONING',provider:'cloudflare-ai-gateway'},
 {role:'red-team',modelClass:'REASONING',provider:'cloudflare-ai-gateway'},
 {role:'release-judge',modelClass:'REASONING',provider:'cloudflare-ai-gateway'},
]
