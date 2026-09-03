/**
 * SEO Utilities
 * Centralized metadata generation for Google search optimization
 */

export interface SEOMeta {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  twitterSite?: string;
  robots?: string;
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  schema?: Record<string, any>;
}

const SITE_NAME = 'MailMyPDF';
const SITE_URL = 'https://mailmypdf.com';
const SITE_DESCRIPTION = 'Professional legal document automation and workflow assistance for appeals, disputes, immigration, and more.';

export function generateSEOMeta(config: Partial<SEOMeta>): SEOMeta {
  const defaults: SEOMeta = {
    title: `${config.title} | ${SITE_NAME}`,
    description: config.description || SITE_DESCRIPTION,
    canonical: config.canonical || SITE_URL,
    ogType: 'website',
    robots: 'index, follow',
    twitterCard: 'summary_large_image',
    twitterSite: '@mailmypdf',
  };

  return {
    ...defaults,
    ...config,
    title: config.title ? `${config.title} | ${SITE_NAME}` : defaults.title,
  };
}

export function generateWorkflowSchema(workflow: {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  timeToComplete: string;
  searchVolume?: number;
  canonicalUrl: string;
}): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: workflow.name,
    description: workflow.description,
    url: `${SITE_URL}${workflow.canonicalUrl}`,
    estimatedCost: {
      '@type': 'PriceSpecification',
      priceCurrency: 'USD',
      price: '0', // freemium model
    },
    totalTime: workflow.timeToComplete,
    step: [
      {
        '@type': 'HowToStep',
        name: 'Start Workflow',
        text: `Begin the ${workflow.name} workflow on MailMyPDF`,
      },
      {
        '@type': 'HowToStep',
        name: 'Complete Form',
        text: 'Answer guided questions about your situation',
      },
      {
        '@type': 'HowToStep',
        name: 'Generate Documents',
        text: 'Receive professional documents and guidance',
      },
    ],
  };
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateOrganizationSchema(): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: SITE_DESCRIPTION,
    sameAs: [
      'https://twitter.com/mailmypdf',
      'https://facebook.com/mailmypdf',
      'https://linkedin.com/company/mailmypdf',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@mailmypdf.com',
    },
  };
}

/**
 * Generate dynamic sitemap entries for all workflows
 */
export function generateSitemapEntry(path: string, priority: number = 0.8, changefreq: string = 'weekly'): {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: number;
} {
  return {
    loc: `${SITE_URL}${path}`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq,
    priority,
  };
}

/**
 * Keywords for long-tail SEO targeting
 */
export const KEYWORD_CLUSTERS = {
  appeals: [
    'how to appeal insurance claim denial',
    'appeal unemployment benefits',
    'insurance appeal letter template',
    'unemployment appeal letter',
    'denied claim appeal process',
  ],
  immigration: [
    'USCIS biometric appointment',
    'how to prepare for biometric appointment',
    'I-485 green card application',
    'USCIS RFE response',
    'immigration interview preparation',
  ],
  tax: [
    'IRS CP2000 notice response',
    'how to respond to CP2000 letter',
    'correspondence exam IRS',
    'tax audit response letter',
    'IRS audit defense',
  ],
  tenant: [
    'eviction response letter',
    'how to respond to eviction notice',
    'eviction defense strategies',
    'unlawful detainer response',
    'notice to quit response',
  ],
  disputes: [
    'dispute credit report error',
    'credit dispute letter template',
    'FCRA dispute process',
    'debt validation letter',
    'credit report inaccuracy',
  ],
  permits: [
    'appeal permit denial',
    'zoning variance request',
    'building permit appeal',
    'code enforcement response',
    'housing code violation appeal',
  ],
  records: [
    'FOIA request template',
    'public records request letter',
    'how to request public records',
    'CCPA data request',
    'government records request',
  ],
};

/**
 * Generate page title with optimal length and keywords
 * Google displays 50-60 characters on desktop, 35-40 on mobile
 */
export function generateTitle(primary: string, secondary?: string, maxLength: number = 60): string {
  let title = primary;
  if (secondary) {
    title += ` | ${secondary}`;
  }
  if (title.length > maxLength) {
    title = title.substring(0, maxLength - 1);
  }
  return title;
}

/**
 * Generate meta description with optimal length
 * Google displays 120-160 characters on desktop, 80-100 on mobile
 */
export function generateDescription(text: string, maxLength: number = 160): string {
  if (text.length > maxLength) {
    text = text.substring(0, maxLength - 1) + '…';
  }
  return text;
}

/**
 * Slugify text for URLs (important for SEO)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate canonical URL to prevent duplicate content issues
 */
export function generateCanonical(path: string): string {
  return `${SITE_URL}${path}`;
}

/**
 * Check if URL is canonical (no parameters, clean)
 */
export function isCanonicalUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.search === '' && url === url.toLowerCase();
  } catch {
    return false;
  }
}
