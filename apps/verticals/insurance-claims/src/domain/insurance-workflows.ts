import { INSURANCE_WORKFLOW_CONFIGS } from './workflow-engine'

export type InsuranceWorkflowFamily =
  | 'New Claims & General'
  | 'Property & Loss'
  | 'Auto Claims'
  | 'Denials & Appeals'
  | 'Health & Disability'
  | 'Specialized Claims'

export interface InsuranceWorkflowSummary {
  id: string
  name: string
  family: InsuranceWorkflowFamily
  description: string
  outputs: string[]
  requiresReview: boolean
  primaryKeyword: string
  supportingKeywords: string[]
}

function familyFor(id: string): InsuranceWorkflowFamily {
  if (/health|medical|prior-auth|disability/.test(id)) return 'Health & Disability'
  if (/home|property|renters|commercial|fire|water|storm|roof|flood/.test(id)) return 'Property & Loss'
  if (/auto|vehicle/.test(id)) return 'Auto Claims'
  if (/denial|appeal|dispute|coverage|underpayment|reconsider|bad-faith/.test(id)) return 'Denials & Appeals'
  if (/life|travel|pet|workers-comp|business|liability|umbrella/.test(id)) return 'Specialized Claims'
  return 'New Claims & General'
}

export const INSURANCE_WORKFLOWS: InsuranceWorkflowSummary[] = Object.values(INSURANCE_WORKFLOW_CONFIGS).map((config) => {
  const family = familyFor(config.workflowId)
  const keyword = config.workflowName.toLowerCase()
  return {
    id: config.workflowId,
    name: config.workflowName,
    family,
    description: `${config.workflowName} with the policy or claim identifiers, relevant facts, supporting evidence, and insurer correspondence kept in one structured record.`,
    outputs: [
      'Structured claim record and evidence references',
      'Draft correspondence for your review',
      'Validation checks before approval and mailing',
    ],
    requiresReview: true,
    primaryKeyword: keyword,
    supportingKeywords: [config.workflowId.replace(/-/g, ' '), family.toLowerCase()],
  }
})

export type InsuranceWorkflowId = string
