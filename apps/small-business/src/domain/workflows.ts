import type { MailClass, WorkflowAction, Trigger } from './models'

export type SmallBusinessWorkflowId =
  | 'payment-reminder'
  | 'payment-demand'
  | 'contract-renewal'
  | 'compliance-notice'
  | 'customer-dispute-response'

export interface SmallBusinessWorkflowDefinition {
  id: SmallBusinessWorkflowId
  name: string
  description: string
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  requiresApproval: boolean
  defaultMailClass: MailClass
  trigger: Trigger
  actions: WorkflowAction[]
}

export const SMALL_BUSINESS_WORKFLOWS: readonly SmallBusinessWorkflowDefinition[] = [
  { id: 'payment-reminder', name: 'Payment Reminder', description: 'Friendly reminder for an overdue balance.', risk: 'LOW', requiresApproval: false, defaultMailClass: 'standard', trigger: { type: 'event', eventName: 'invoice.overdue' }, actions: [{ type: 'generate_document', templateId: 'payment-reminder' }, { type: 'send_mail', mailClass: 'standard' }, { type: 'notify', channel: 'in_app' }] },
  { id: 'payment-demand', name: 'Payment Demand', description: 'Formal demand for payment with an auditable record.', risk: 'HIGH', requiresApproval: true, defaultMailClass: 'certified', trigger: { type: 'condition', conditions: [{ field: 'invoice.daysOverdue', operator: 'greater_than', value: 30 }] }, actions: [{ type: 'generate_document', templateId: 'payment-demand' }, { type: 'require_approval', approverRole: 'owner' }, { type: 'send_mail', mailClass: 'certified' }, { type: 'notify', channel: 'in_app' }] },
  { id: 'contract-renewal', name: 'Contract Renewal', description: 'Prepare and send renewal correspondence before expiration.', risk: 'MEDIUM', requiresApproval: true, defaultMailClass: 'certified', trigger: { type: 'condition', conditions: [{ field: 'contract.daysToExpiry', operator: 'less_than', value: 45 }] }, actions: [{ type: 'generate_document', templateId: 'contract-renewal' }, { type: 'require_approval', approverRole: 'admin' }, { type: 'send_mail', mailClass: 'certified' }] },
  { id: 'compliance-notice', name: 'Compliance Notice', description: 'Evidence-backed notice for a regulatory or contractual obligation.', risk: 'HIGH', requiresApproval: true, defaultMailClass: 'certified', trigger: { type: 'event', eventName: 'compliance.deadline' }, actions: [{ type: 'generate_document', templateId: 'compliance-notice' }, { type: 'require_approval', approverRole: 'owner' }, { type: 'send_mail', mailClass: 'certified' }, { type: 'notify', channel: 'email' }] },
  { id: 'customer-dispute-response', name: 'Customer Dispute Response', description: 'Organize evidence and prepare a measured response to a customer dispute.', risk: 'HIGH', requiresApproval: true, defaultMailClass: 'certified', trigger: { type: 'event', eventName: 'dispute.opened' }, actions: [{ type: 'generate_document', templateId: 'customer-dispute-response' }, { type: 'require_approval', approverRole: 'admin' }, { type: 'send_mail', mailClass: 'certified' }] },
]

export function getWorkflow(id: SmallBusinessWorkflowId) { return SMALL_BUSINESS_WORKFLOWS.find(workflow => workflow.id === id) }
