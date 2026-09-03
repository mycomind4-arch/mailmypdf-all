/**
 * Unified Workflow Registry
 * Central catalog of all 13 workflows across MailMyPDF
 * Used for discovery, SEO, and navigation
 */

export type WorkflowCategory =
  | 'appeals'
  | 'requests'
  | 'claims'
  | 'disputes'
  | 'permits'
  | 'tenant'
  | 'litigation'
  | 'immigration'
  | 'business';

export interface WorkflowMetadata {
  id: string;
  name: string;
  category: WorkflowCategory;
  description: string;
  longDescription: string;
  icon: string;
  keywords: string[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  featured: boolean;
  searchVolume?: number; // Estimated monthly searches
  difficulty: 'easy' | 'medium' | 'hard';
  timeToComplete: string; // e.g., "30 minutes"
  vertical: string; // Source vertical app
}

export const WORKFLOWS: Record<string, WorkflowMetadata> = {
  'insurance-appeal': {
    id: 'insurance-appeal',
    name: 'Insurance Claim Appeal',
    category: 'appeals',
    description: 'Appeal denied insurance claims with evidence and documentation',
    longDescription: 'Build a comprehensive insurance claim appeal with supporting evidence, medical records, and legal arguments. MailMyPDF guides you through the entire process from evidence gathering to appeal letter generation.',
    icon: '📋',
    keywords: ['insurance appeal', 'claim denial', 'appeal letter', 'insurance dispute'],
    seoTitle: 'Insurance Claim Appeal Generator | MailMyPDF',
    seoDescription: 'Appeal denied insurance claims online. Generate professional appeal letters with evidence documentation.',
    canonicalUrl: '/workflows/insurance-appeal',
    featured: true,
    searchVolume: 8900,
    difficulty: 'medium',
    timeToComplete: '45 minutes',
    vertical: 'appeal-mail',
  },

  'benefits-unemployment': {
    id: 'benefits-unemployment',
    name: 'Unemployment Benefits Appeal',
    category: 'appeals',
    description: 'Appeal unemployment benefit denials and decisions',
    longDescription: 'Contest unemployment benefit denials, overpayment notices, or eligibility decisions. MailMyPDF helps you document employment history, reasons for separation, and build a strong appeal case.',
    icon: '💼',
    keywords: ['unemployment appeal', 'unemployment benefits', 'UI appeal', 'job loss'],
    seoTitle: 'Unemployment Benefits Appeal | Fight Denials | MailMyPDF',
    seoDescription: 'Appeal unemployment benefit denials. Create compelling appeals with documentation and legal arguments.',
    canonicalUrl: '/workflows/unemployment-appeal',
    featured: true,
    searchVolume: 12000,
    difficulty: 'medium',
    timeToComplete: '40 minutes',
    vertical: 'benefits-appeal',
  },

  'immigration-biometrics': {
    id: 'immigration-biometrics',
    name: 'USCIS Biometric Appointment',
    category: 'immigration',
    description: 'Prepare for and respond to USCIS biometric appointment notices',
    longDescription: 'Understand your USCIS biometric appointment, prepare required documents, and generate appointment confirmation responses.',
    icon: '🛂',
    keywords: ['USCIS biometrics', 'immigration appointment', 'I-485', 'green card'],
    seoTitle: 'USCIS Biometric Appointment Guide | MailMyPDF',
    seoDescription: 'Prepare for your USCIS biometric appointment. Document requirements and response letters.',
    canonicalUrl: '/workflows/uscis-biometrics',
    featured: true,
    searchVolume: 6200,
    difficulty: 'easy',
    timeToComplete: '20 minutes',
    vertical: 'immigration-mail',
  },

  'tax-cp2000': {
    id: 'tax-cp2000',
    name: 'IRS CP2000 Notice Response',
    category: 'appeals',
    description: 'Respond to IRS CP2000 Correspondence examination notices',
    longDescription: 'Build a comprehensive response to IRS CP2000 notices. Extract data from your tax returns, analyze discrepancies, and generate professional audit responses with supporting documentation.',
    icon: '🏛️',
    keywords: ['CP2000', 'IRS notice', 'tax audit', 'correspondence exam', 'IRS response'],
    seoTitle: 'IRS CP2000 Notice Response | Tax Audit Help | MailMyPDF',
    seoDescription: 'Respond to IRS CP2000 notices. Professional audit response letters and documentation.',
    canonicalUrl: '/workflows/irs-cp2000',
    featured: true,
    searchVolume: 4500,
    difficulty: 'hard',
    timeToComplete: '90 minutes',
    vertical: 'notice-respond',
  },

  'eviction-response': {
    id: 'eviction-response',
    name: 'Eviction Response',
    category: 'tenant',
    description: 'Respond to eviction notices and protect your tenancy',
    longDescription: 'Build a comprehensive eviction response with affidavits, evidence of tenancy, and legal arguments. Includes responses to cure-or-quit notices and defenses against unlawful eviction.',
    icon: '🏠',
    keywords: ['eviction response', 'eviction defense', 'notice to quit', 'unlawful detainer'],
    seoTitle: 'Eviction Response & Defense Letters | MailMyPDF',
    seoDescription: 'Fight eviction. Generate professional eviction responses with legal defenses.',
    canonicalUrl: '/workflows/eviction-response',
    featured: true,
    searchVolume: 15000,
    difficulty: 'hard',
    timeToComplete: '60 minutes',
    vertical: 'tenant-reply',
  },

  'permit-denial-response': {
    id: 'permit-denial-response',
    name: 'Permit Denial Response',
    category: 'permits',
    description: 'Appeal building, development, or zoning permit denials',
    longDescription: 'Build a comprehensive permit denial response with engineering data, variance requests, and municipal code arguments. Address specific denial reasons and propose solutions.',
    icon: '🏗️',
    keywords: ['permit denial', 'building permit appeal', 'zoning variance', 'construction permit'],
    seoTitle: 'Permit Denial Appeal | Zoning Variance Requests | MailMyPDF',
    seoDescription: 'Appeal building and zoning permit denials. Generate variance requests and technical responses.',
    canonicalUrl: '/workflows/permit-appeal',
    featured: false,
    searchVolume: 2100,
    difficulty: 'hard',
    timeToComplete: '120 minutes',
    vertical: 'permit-reply',
  },

  'code-enforcement-response': {
    id: 'code-enforcement-response',
    name: 'Code Violation Response',
    category: 'permits',
    description: 'Respond to housing and municipal code violations',
    longDescription: 'Build remediation plans and responses to code enforcement violations. Document compliance efforts and generate formal responses to municipal citations.',
    icon: '⚠️',
    keywords: ['code violation', 'housing code', 'municipal citation', 'code compliance'],
    seoTitle: 'Code Violation Response | Housing Code Appeal | MailMyPDF',
    seoDescription: 'Respond to code enforcement violations with compliance plans and remediation documentation.',
    canonicalUrl: '/workflows/code-violation',
    featured: false,
    searchVolume: 1800,
    difficulty: 'medium',
    timeToComplete: '50 minutes',
    vertical: 'code-enforcement',
  },

  'credit-dispute': {
    id: 'credit-dispute',
    name: 'Credit & Debt Dispute',
    category: 'disputes',
    description: 'Dispute inaccurate credit reports and debt validation',
    longDescription: 'Generate FCRA dispute letters and debt validation requests. Challenge inaccurate information on credit reports and demand proof of debt from collectors.',
    icon: '💳',
    keywords: ['credit dispute', 'debt validation', 'FCRA', 'credit report error', 'debt challenge'],
    seoTitle: 'Credit Dispute Letter Generator | FCRA Disputes | MailMyPDF',
    seoDescription: 'Dispute credit report errors and request debt validation from creditors.',
    canonicalUrl: '/workflows/credit-dispute',
    featured: true,
    searchVolume: 18000,
    difficulty: 'easy',
    timeToComplete: '30 minutes',
    vertical: 'dispute-mail',
  },

  'public-records-request': {
    id: 'public-records-request',
    name: 'Public Records Request',
    category: 'requests',
    description: 'File formal public records and FOIA requests',
    longDescription: 'Generate official public records requests under FOIA/CCPA. Specify documents, timeframes, and delivery preferences. Track responses and follow-up requests.',
    icon: '📄',
    keywords: ['FOIA request', 'public records request', 'CCPA', 'information request', 'government records'],
    seoTitle: 'Public Records Request Form | FOIA/CCPA | MailMyPDF',
    seoDescription: 'File public records requests and FOIA/CCPA demands. Professional request letters and tracking.',
    canonicalUrl: '/workflows/public-records',
    featured: false,
    searchVolume: 5600,
    difficulty: 'easy',
    timeToComplete: '25 minutes',
    vertical: 'records-requests',
  },

  'insurance-claim': {
    id: 'insurance-claim',
    name: 'Insurance Claim Filing',
    category: 'claims',
    description: 'File and document insurance claims comprehensively',
    longDescription: 'Organize claim documentation, photos, estimates, and evidence. Generate professional claim letters with complete supporting documentation.',
    icon: '🔍',
    keywords: ['insurance claim', 'claim filing', 'loss documentation', 'insurance documentation'],
    seoTitle: 'Insurance Claim Filing Guide | Documentation Template | MailMyPDF',
    seoDescription: 'File insurance claims with proper documentation and evidence organization.',
    canonicalUrl: '/workflows/insurance-claim',
    featured: false,
    searchVolume: 7200,
    difficulty: 'medium',
    timeToComplete: '45 minutes',
    vertical: 'insurance-claims',
  },

  'case-evidence-organization': {
    id: 'case-evidence-organization',
    name: 'Case Evidence Organization',
    category: 'litigation',
    description: 'Organize and catalog evidence for legal cases',
    longDescription: 'Build comprehensive evidence packages for litigation. Organize documents, photos, communications, and create evidence indexes and summaries.',
    icon: '🔐',
    keywords: ['case evidence', 'litigation support', 'evidence management', 'case preparation'],
    seoTitle: 'Legal Case Evidence Organization | Litigation Support | MailMyPDF',
    seoDescription: 'Organize evidence for litigation. Create evidence packages and case summaries.',
    canonicalUrl: '/workflows/evidence-organization',
    featured: false,
    searchVolume: 3400,
    difficulty: 'medium',
    timeToComplete: '90 minutes',
    vertical: 'claim-proof',
  },

  'small-business-documents': {
    id: 'small-business-documents',
    name: 'Small Business Documents',
    category: 'business',
    description: 'Generate standard business documents and templates',
    longDescription: 'Create contracts, agreements, policies, and operational documents for small businesses.',
    icon: '📑',
    keywords: ['business documents', 'contract template', 'small business', 'business agreement'],
    seoTitle: 'Small Business Document Templates | MailMyPDF',
    seoDescription: 'Generate business contracts and templates for small businesses.',
    canonicalUrl: '/workflows/business-documents',
    featured: false,
    searchVolume: 2800,
    difficulty: 'easy',
    timeToComplete: '20 minutes',
    vertical: 'mailmypdf-smallbusiness',
  },

  'private-office-workflow': {
    id: 'private-office-workflow',
    name: 'Private Office Workflow',
    category: 'litigation',
    description: 'Advanced capability and workflow management',
    longDescription: 'Orchestrate complex workflows and capabilities for private legal offices.',
    icon: '🎯',
    keywords: ['workflow management', 'legal workflow', 'case management'],
    seoTitle: 'Legal Workflow Management | Private Office | MailMyPDF',
    seoDescription: 'Advanced workflow orchestration for legal practices.',
    canonicalUrl: '/workflows/private-office',
    featured: false,
    searchVolume: 1200,
    difficulty: 'hard',
    timeToComplete: '60 minutes',
    vertical: 'mailmypdf-private-office',
  },
};

export const WORKFLOW_CATEGORIES: Record<WorkflowCategory, { name: string; description: string; icon: string }> = {
  appeals: {
    name: 'Appeals & Denials',
    description: 'Challenge denied claims and benefits with professional appeals',
    icon: '📢',
  },
  requests: {
    name: 'Records & Requests',
    description: 'File public records and FOIA/CCPA requests',
    icon: '📋',
  },
  claims: {
    name: 'Insurance & Claims',
    description: 'File and document insurance claims',
    icon: '🔍',
  },
  disputes: {
    name: 'Disputes & Validation',
    description: 'Challenge credit and debt issues',
    icon: '⚡',
  },
  permits: {
    name: 'Permits & Code',
    description: 'Appeal permit denials and code violations',
    icon: '🏗️',
  },
  tenant: {
    name: 'Tenant Rights',
    description: 'Defend against eviction and housing issues',
    icon: '🏠',
  },
  litigation: {
    name: 'Litigation Support',
    description: 'Organize evidence and manage cases',
    icon: '⚖️',
  },
  immigration: {
    name: 'Immigration',
    description: 'Navigate USCIS processes and applications',
    icon: '🛂',
  },
  business: {
    name: 'Business Documents',
    description: 'Generate templates and business documents',
    icon: '📑',
  },
};

export function getWorkflowsByCategory(category: WorkflowCategory): WorkflowMetadata[] {
  return Object.values(WORKFLOWS).filter(w => w.category === category);
}

export function getWorkflowById(id: string): WorkflowMetadata | undefined {
  return WORKFLOWS[id];
}

export function getFeaturedWorkflows(): WorkflowMetadata[] {
  return Object.values(WORKFLOWS).filter(w => w.featured).sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0));
}

export function searchWorkflows(query: string): WorkflowMetadata[] {
  const q = query.toLowerCase();
  return Object.values(WORKFLOWS).filter(w =>
    w.name.toLowerCase().includes(q) ||
    w.description.toLowerCase().includes(q) ||
    w.keywords.some(k => k.toLowerCase().includes(q))
  );
}
