import { describe, it, expect } from 'vitest';
import { calculatePricing, determineComplexity, estimateWeight, PRICING_TIERS, POSTAGE_RATES, AVAILABLE_ADDONS } from './rfe-pricing';
import { findGlossaryTerm, explainTerm, RFE_GLOSSARY } from './rfe-glossary';
import { ALL_RFE_PAGES, RFE_LANDING_PAGE, RFE_SUPPORTING_PAGES, KEYWORD_CLUSTERS, findRFEPage } from './rfe-content';

describe('RFE Pricing', () => {
  it('calculates basic pricing correctly', () => {
    const result = calculatePricing({
      complexity: 'basic',
      mailingMethod: 'certified',
      documentCount: 3,
      estimatedWeightOunces: 2,
      selectedAddOns: [],
    });
    expect(result.servicePrice).toBe(39);
    expect(result.postage).toBeCloseTo(5.41, 1); // 4.85 + 0.28*2
    expect(result.total).toBeCloseTo(44.41, 1);
    expect(result.addOnsTotal).toBe(0);
    expect(result.tax).toBe(0);
  });

  it('calculates complex pricing with add-ons', () => {
    const result = calculatePricing({
      complexity: 'complex',
      mailingMethod: 'certified',
      documentCount: 15,
      estimatedWeightOunces: 8,
      selectedAddOns: ['return_receipt', 'insurance'],
      taxRate: 0.08,
    });
    expect(result.servicePrice).toBe(99);
    expect(result.postage).toBeCloseTo(7.09, 1); // 4.85 + 0.28*8
    expect(result.addOnsTotal).toBe(6.35); // 2.85 + 3.50
    expect(result.tax).toBeCloseTo(8.43, 1); // (99 + 6.35) * 0.08
    expect(result.total).toBeGreaterThan(100);
  });

  it('separates service price from postage', () => {
    const result = calculatePricing({
      complexity: 'standard',
      mailingMethod: 'standard',
      documentCount: 5,
      estimatedWeightOunces: 3,
      selectedAddOns: [],
    });
    expect(result.servicePrice).toBe(59);
    expect(result.postage).toBeLessThan(result.servicePrice);
    expect(result.breakdown.some(b => b.isPostage)).toBe(true);
    expect(result.breakdown.some(b => !b.isPostage)).toBe(true);
  });

  it('never disguises postage as product revenue', () => {
    const result = calculatePricing({
      complexity: 'basic',
      mailingMethod: 'registered',
      documentCount: 2,
      estimatedWeightOunces: 1,
      selectedAddOns: [],
    });
    // Postage is tracked separately
    const postageItem = result.breakdown.find(b => b.isPostage);
    expect(postageItem).toBeDefined();
    expect(postageItem!.amount).toBe(result.postage);
  });

  it('determines complexity correctly', () => {
    expect(determineComplexity(2, false, 'I-485')).toBe('basic');
    expect(determineComplexity(5, false, 'I-130')).toBe('standard');
    expect(determineComplexity(15, false, 'I-140')).toBe('complex');
    expect(determineComplexity(3, true, 'I-751')).toBe('complex');
  });

  it('estimates weight from document count', () => {
    expect(estimateWeight(1)).toBe(3); // ceil(5*0.5) = 3
    expect(estimateWeight(0)).toBe(1); // minimum 1
    expect(estimateWeight(10)).toBe(25);
  });

  it('has three pricing tiers', () => {
    expect(Object.keys(PRICING_TIERS)).toHaveLength(3);
    expect(PRICING_TIERS.basic.servicePrice).toBeLessThan(PRICING_TIERS.standard.servicePrice);
    expect(PRICING_TIERS.standard.servicePrice).toBeLessThan(PRICING_TIERS.complex.servicePrice);
  });

  it('has three mailing methods with different rates', () => {
    expect(POSTAGE_RATES.standard.base).toBeLessThan(POSTAGE_RATES.certified.base);
    expect(POSTAGE_RATES.certified.base).toBeLessThan(POSTAGE_RATES.registered.base);
  });

  it('has optional add-ons', () => {
    expect(AVAILABLE_ADDONS.length).toBeGreaterThan(0);
    expect(AVAILABLE_ADDONS.find(a => a.id === 'return_receipt')).toBeDefined();
  });
});

describe('RFE Glossary', () => {
  it('finds RFE term', () => {
    const term = findGlossaryTerm('RFE');
    expect(term).toBeDefined();
    expect(term!.shortDefinition).toContain('letter from USCIS');
  });

  it('finds by alias', () => {
    const term = findGlossaryTerm('Request for Evidence');
    expect(term).toBeDefined();
    expect(term!.term).toBe('RFE');
  });

  it('explains term in English', () => {
    const result = explainTerm('deadline', 'en');
    expect(result.found).toBe(true);
    expect(result.explanation).toContain('date');
  });

  it('explains term in Spanish', () => {
    const result = explainTerm('deadline', 'es');
    expect(result.found).toBe(true);
    expect(result.explanation).toContain('fecha');
  });

  it('handles unknown terms gracefully', () => {
    const result = explainTerm('nonexistent term', 'en');
    expect(result.found).toBe(false);
    expect(result.explanation).toContain("don't have");
  });

  it('has all key terms', () => {
    expect(RFE_GLOSSARY.length).toBeGreaterThanOrEqual(10);
    const terms = RFE_GLOSSARY.map(t => t.term);
    expect(terms).toContain('RFE');
    expect(terms).toContain('deadline');
    expect(terms).toContain('beneficiary');
    expect(terms).toContain('petitioner');
    expect(terms).toContain('evidence');
    expect(terms).toContain('USCIS');
    expect(terms).toContain('receipt number');
    expect(terms).toContain('certified translation');
  });

  it('every term has Spanish translations', () => {
    for (const term of RFE_GLOSSARY) {
      expect(term.shortDefinitionEs, `Missing ES for ${term.term}`).toBeDefined();
    }
  });
});

describe('RFE Content & SEO', () => {
  it('has landing page with all required fields', () => {
    expect(RFE_LANDING_PAGE.slug).toBe('rfe');
    expect(RFE_LANDING_PAGE.h1).toContain('Request for Evidence');
    expect(RFE_LANDING_PAGE.faqSchema!.length).toBeGreaterThan(5);
    expect(RFE_LANDING_PAGE.keywords.length).toBeGreaterThan(3);
    expect(RFE_LANDING_PAGE.canonical).toBe('/rfe');
    expect(RFE_LANDING_PAGE.breadcrumbs.length).toBeGreaterThan(0);
  });

  it('has 18+ supporting pages', () => {
    expect(RFE_SUPPORTING_PAGES.length).toBeGreaterThanOrEqual(18);
  });

  it('every page has unique content', () => {
    const contents = ALL_RFE_PAGES.map(p => p.content);
    const uniqueContents = new Set(contents);
    expect(uniqueContents.size).toBe(ALL_RFE_PAGES.length);
  });

  it('every page has canonical URL', () => {
    for (const page of ALL_RFE_PAGES) {
      expect(page.canonical).toBeDefined();
      expect(page.canonical.startsWith('/rfe')).toBe(true);
    }
  });

  it('every page has breadcrumbs', () => {
    for (const page of ALL_RFE_PAGES) {
      expect(page.breadcrumbs.length).toBeGreaterThan(0);
    }
  });

  it('every page has keywords', () => {
    for (const page of ALL_RFE_PAGES) {
      expect(page.keywords.length).toBeGreaterThan(0);
    }
  });

  it('every page has related pages', () => {
    for (const page of ALL_RFE_PAGES) {
      expect(page.relatedPages.length).toBeGreaterThan(0);
    }
  });

  it('landing page has FAQ schema', () => {
    expect(RFE_LANDING_PAGE.faqSchema).toBeDefined();
    expect(RFE_LANDING_PAGE.faqSchema!.length).toBeGreaterThanOrEqual(5);
    for (const faq of RFE_LANDING_PAGE.faqSchema!) {
      expect(faq.question).toBeDefined();
      expect(faq.answer).toBeDefined();
      expect(faq.answer.length).toBeGreaterThan(20);
    }
  });

  it('finds page by path', () => {
    const page = findRFEPage('/rfe/what-is-an-rfe');
    expect(page).toBeDefined();
    expect(page!.h1).toContain('What is a Request for Evidence');
  });

  it('has form-specific pages', () => {
    const forms = ['i-485', 'i-130', 'i-140', 'i-751', 'h-1b'];
    for (const form of forms) {
      const page = findRFEPage(`/rfe/${form}`);
      expect(page, `Missing page for ${form}`).toBeDefined();
    }
  });

  it('has medical page', () => {
    const page = findRFEPage('/rfe/medical');
    expect(page).toBeDefined();
    expect(page!.content).toContain('I-693');
  });

  it('has keyword cluster mappings', () => {
    expect(KEYWORD_CLUSTERS.length).toBeGreaterThanOrEqual(15);
    for (const cluster of KEYWORD_CLUSTERS) {
      expect(cluster.keywords.length).toBeGreaterThan(0);
      expect(cluster.canonicalPage.startsWith('/rfe')).toBe(true);
    }
  });

  it('landing page has Spanish content', () => {
    expect(RFE_LANDING_PAGE.contentEs).toBeDefined();
    expect(RFE_LANDING_PAGE.contentEs!.length).toBeGreaterThan(50);
  });

  it('no duplicate canonical URLs', () => {
    const canonicals = ALL_RFE_PAGES.map(p => p.canonical);
    const unique = new Set(canonicals);
    expect(unique.size).toBe(canonicals.length);
  });

  it('all internal links point to valid pages', () => {
    const allPaths = new Set(ALL_RFE_PAGES.map(p => p.path));
    for (const page of ALL_RFE_PAGES) {
      for (const related of page.relatedPages) {
        expect(allPaths.has(related), `Broken link: ${page.path} -> ${related}`).toBe(true);
      }
    }
  });
});
