export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface VerticalManifest {
  id: 'mailmypdf-smallbusiness'
  name: 'MailMyPDF Small Business'
  version: string
  domain: 'small-business'
  riskProfile: RiskLevel
  capabilities: string[]
  workflows: Array<{
    id: string
    name: string
    risk: RiskLevel
    requiresApproval: boolean
    capabilities: string[]
  }>
  platformOwned: string[]
  mailmypdfOwned: string[]
}

export const smallBusinessManifest: VerticalManifest = {
  id: 'mailmypdf-smallbusiness',
  name: 'MailMyPDF Small Business',
  version: '1.0.0',
  domain: 'small-business',
  riskProfile: 'HIGH',
  capabilities: [
    'business-correspondence',
    'document-intelligence',
    'evidence-and-provenance',
    'deadline-tracking',
    'governed-ai',
    'voice-workflows',
    'multilingual-correspondence',
    'approval-gates',
    'workflow-automation',
    'mailing-and-proof',
  ],
  workflows: [
    { id: 'payment-reminder', name: 'Payment reminder', risk: 'MEDIUM', requiresApproval: true, capabilities: ['business-correspondence', 'deadline-tracking', 'approval-gates', 'mailing-and-proof'] },
    { id: 'payment-demand', name: 'Payment demand', risk: 'HIGH', requiresApproval: true, capabilities: ['business-correspondence', 'evidence-and-provenance', 'governed-ai', 'approval-gates', 'mailing-and-proof'] },
    { id: 'contract-renewal', name: 'Contract renewal', risk: 'MEDIUM', requiresApproval: true, capabilities: ['document-intelligence', 'deadline-tracking', 'approval-gates', 'mailing-and-proof'] },
    { id: 'compliance-notice', name: 'Compliance notice', risk: 'HIGH', requiresApproval: true, capabilities: ['document-intelligence', 'evidence-and-provenance', 'deadline-tracking', 'governed-ai', 'approval-gates', 'mailing-and-proof'] },
    { id: 'customer-dispute-response', name: 'Customer dispute response', risk: 'HIGH', requiresApproval: true, capabilities: ['business-correspondence', 'evidence-and-provenance', 'multilingual-correspondence', 'approval-gates', 'mailing-and-proof'] },
  ],
  platformOwned: [
    'document-intelligence',
    'evidence-and-provenance',
    'deadline-tracking',
    'governed-ai',
    'voice-workflows',
    'multilingual-correspondence',
    'approval-gates',
    'workflow-automation',
  ],
  mailmypdfOwned: [
    'identity',
    'billing',
    'mailing',
    'tracking',
    'proof-of-mailing',
  ],
}
