/**
 * SEO — Canonical Route and Metadata
 *
 * Canonical route: /workflows/respond-to-property-inspection-request
 * Primary intent: respond to code enforcement property inspection request
 * One canonical public page. No duplicate URLs.
 */

export interface SEOConfig {
  canonicalRoute: string;
  title: string;
  description: string;
  primaryIntent: string;
  relatedIntents: string[];
  ogType: string;
  structuredData: object;
}

export const SEO_CONFIG: SEOConfig = {
  canonicalRoute: '/workflows/respond-to-property-inspection-request',
  title: 'Respond to a Code Enforcement Property Inspection Request',
  description:
    'Upload a code enforcement inspection request notice. Get evidence-first, property-aware, jurisdiction-aware analysis with multi-LLM verification, discrepancy detection, response strategy, and professional draft generation.',
  primaryIntent: 'respond to code enforcement property inspection request',
  relatedIntents: [
    'property inspection request',
    'code enforcement inspection',
    'code enforcement inspection notice',
    'inspection request after complaint',
    'respond to property inspection notice',
    'code enforcement search request',
    'code enforcement inspection consent',
  ],
  ogType: 'website',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Code Enforcement Inspection Response',
    description:
      'Evidence-first analysis and response system for code enforcement property inspection requests.',
    applicationCategory: 'LegalApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  },
};

export function getCanonicalURL(baseUrl: string): string {
  return `${baseUrl}${SEO_CONFIG.canonicalRoute}`;
}

export function getMetaTags(baseUrl: string) {
  const canonical = getCanonicalURL(baseUrl);
  return {
    title: SEO_CONFIG.title,
    description: SEO_CONFIG.description,
    canonical,
    keywords: SEO_CONFIG.relatedIntents.join(', '),
    ogTitle: SEO_CONFIG.title,
    ogDescription: SEO_CONFIG.description,
    ogUrl: canonical,
    ogType: SEO_CONFIG.ogType,
    structuredData: SEO_CONFIG.structuredData,
  };
}
