import { z } from 'zod'
import { planWorkflowExecution } from '../services/workflow-engine'

export const workflowPlanSchema = z.object({
  workflowId: z.enum(['payment-reminder', 'payment-demand', 'contract-renewal', 'compliance-notice', 'customer-dispute-response']),
  recipientId: z.string().optional(),
  documentId: z.string().optional(),
  evidenceCount: z.number().int().min(0).optional(),
})

export function createWorkflowPlan(input: unknown) {
  return planWorkflowExecution(workflowPlanSchema.parse(input))
}
