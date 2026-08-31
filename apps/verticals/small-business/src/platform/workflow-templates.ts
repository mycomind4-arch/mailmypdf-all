export interface WorkflowTemplate { id: string; subject: string; purpose: string; requiredFacts: string[]; mailClass: 'FIRST_CLASS' | 'CERTIFIED' | 'REGISTERED' }

export const smallBusinessWorkflowTemplates: WorkflowTemplate[] = [
  { id: 'payment-reminder', subject: 'Payment reminder', purpose: 'Request payment while preserving a professional customer relationship.', requiredFacts: ['amount', 'invoiceNumber', 'dueDate', 'paymentMethod'], mailClass: 'CERTIFIED' },
  { id: 'payment-demand', subject: 'Formal payment demand', purpose: 'Create a documented demand supported by the supplied business records.', requiredFacts: ['amount', 'invoiceNumber', 'dueDate', 'agreementOrInvoice'], mailClass: 'CERTIFIED' },
  { id: 'contract-renewal', subject: 'Contract renewal notice', purpose: 'Notify a counterparty about an upcoming renewal or expiration.', requiredFacts: ['contractName', 'expirationDate', 'renewalTerms'], mailClass: 'CERTIFIED' },
  { id: 'compliance-notice', subject: 'Compliance notice', purpose: 'Prepare a documented business compliance communication.', requiredFacts: ['requirement', 'deadline', 'supportingRecord'], mailClass: 'CERTIFIED' },
  { id: 'customer-dispute-response', subject: 'Customer dispute response', purpose: 'Prepare an evidence-backed response to a customer dispute.', requiredFacts: ['disputeSummary', 'transactionRecord', 'requestedResolution'], mailClass: 'CERTIFIED' },
]
