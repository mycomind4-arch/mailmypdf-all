/**
 * Blog/Guides Content Registry
 * Long-form SEO content targeting informational keywords
 */

export interface GuideMetadata {
  id: string;
  title: string;
  slug: string;
  description: string;
  keywords: string[];
  category: string;
  estimatedReadTime: number;
  publishedDate: string;
  author: string;
  relatedWorkflows: string[];
}

export const GUIDES: Record<string, GuideMetadata> = {
  'appeal-insurance-claim': {
    id: 'appeal-insurance-claim',
    title: 'How to Appeal an Insurance Claim Denial: Complete Guide',
    slug: 'appeal-insurance-claim-denial',
    description: 'Step-by-step guide to appealing denied insurance claims with templates and examples.',
    keywords: ['insurance appeal', 'claim denial', 'appeal letter'],
    category: 'appeals',
    estimatedReadTime: 12,
    publishedDate: '2026-09-03',
    author: 'MailMyPDF',
    relatedWorkflows: ['insurance-appeal'],
  },
  'eviction-response': {
    id: 'eviction-response',
    title: 'How to Respond to an Eviction Notice: Tenant Rights & Defense',
    slug: 'eviction-response-guide',
    description: 'Complete guide to responding to eviction notices and protecting your housing rights.',
    keywords: ['eviction defense', 'eviction response', 'tenant rights'],
    category: 'tenant',
    estimatedReadTime: 18,
    publishedDate: '2026-09-03',
    author: 'MailMyPDF',
    relatedWorkflows: ['eviction-response'],
  },
  'credit-dispute': {
    id: 'credit-dispute',
    title: 'How to Dispute Credit Report Errors: FCRA Rights & Process',
    slug: 'credit-report-dispute-guide',
    description: 'Learn your FCRA rights and how to dispute inaccurate credit reports.',
    keywords: ['credit dispute', 'credit repair', 'credit report error'],
    category: 'disputes',
    estimatedReadTime: 14,
    publishedDate: '2026-09-03',
    author: 'MailMyPDF',
    relatedWorkflows: ['credit-dispute'],
  },
  'irs-cp2000': {
    id: 'irs-cp2000',
    title: 'How to Respond to IRS CP2000 Notice: Audit Response Guide',
    slug: 'irs-cp2000-response-guide',
    description: 'Complete guide to responding to IRS CP2000 correspondence examination notices.',
    keywords: ['CP2000', 'IRS notice', 'tax audit', 'correspondence exam'],
    category: 'appeals',
    estimatedReadTime: 20,
    publishedDate: '2026-09-03',
    author: 'MailMyPDF',
    relatedWorkflows: ['tax-cp2000'],
  },
};

export function getGuideBySlug(slug: string): GuideMetadata | undefined {
  return Object.values(GUIDES).find(g => g.slug === slug);
}

export function getGuidesByCategory(category: string): GuideMetadata[] {
  return Object.values(GUIDES).filter(g => g.category === category);
}
