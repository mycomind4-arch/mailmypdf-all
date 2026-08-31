/**
 * Correction SEO — Canonical Route and Metadata for Workflow 2
 *
 * Canonical route: /workflows/request-correction-property-inspection-request
 * Primary intent: correct code enforcement inspection request
 *
 * One canonical page. No duplicate URLs. No doorway pages.
 */

export interface CorrectionSEOConfig {
  canonicalRoute: string;
  title: string;
  description: string;
  primaryIntent: string;
  relatedIntents: string[];
  ogType: string;
  structuredData: object;
}

export const CORRECTION_SEO_CONFIG: CorrectionSEOConfig = {
  canonicalRoute: '/workflows/request-correction-property-inspection-request',
  title: 'Request to Correct a Code Enforcement Property Inspection Request',
  description:
    'Identify and request correction of errors in a code enforcement inspection notice — wrong recipient, deceased recipient, wrong property, missing authority, ambiguous scope, or incorrect deadlines. Evidence-backed, multi-LLM verified correction requests.',
  primaryIntent: 'correct code enforcement inspection request',
  relatedIntents: [
    'amend code enforcement inspection notice',
    'correct code enforcement notice',
    'incorrect property inspection notice',
    'wrong recipient code enforcement notice',
    'request clarification code enforcement inspection',
    'request amended inspection notice',
    'code enforcement notice correction',
  ],
  ogType: 'website',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Code Enforcement Inspection Correction Request',
    description:
      'Evidence-first correction and amendment system for code enforcement property inspection requests.',
    applicationCategory: 'LegalApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  },
};

export function getCorrectionCanonicalURL(baseUrl: string): string {
  return `${baseUrl}${CORRECTION_SEO_CONFIG.canonicalRoute}`;
}

export function getCorrectionMetaTags(baseUrl: string) {
  const canonical = getCorrectionCanonicalURL(baseUrl);
  return {
    title: CORRECTION_SEO_CONFIG.title,
    description: CORRECTION_SEO_CONFIG.description,
    canonical,
    keywords: CORRECTION_SEO_CONFIG.relatedIntents.join(', '),
    ogTitle: CORRECTION_SEO_CONFIG.title,
    ogDescription: CORRECTION_SEO_CONFIG.description,
    ogUrl: canonical,
    ogType: CORRECTION_SEO_CONFIG.ogType,
    structuredData: CORRECTION_SEO_CONFIG.structuredData,
  };
}
