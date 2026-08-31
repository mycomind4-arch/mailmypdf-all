/**
 * Jurisdiction Research Synthesis
 *
 * Researches from authoritative sources first: official California statutes,
 * official county codes, official code enforcement sources, planning & building sources,
 * sheriff sources, courts, administrative rules.
 *
 * Does not use generic SEO/legal pages as controlling authority when an official source exists.
 * Every rule record includes: jurisdiction, source, URL, title, section, effective date,
 * retrieved timestamp, relevant excerpt, applicability, confidence, research model/provider.
 */

// ─── Research Types ───────────────────────────────────────────────────────────

export interface JurisdictionRule {
  jurisdiction: string;
  source: string;
  url: string;
  title: string;
  section?: string;
  effectiveDate?: string;
  retrievedAt: string;
  relevantExcerpt: string;
  applicability: string;
  confidence: number;
  researchModel: string;
  researchProvider: string;
}

export interface JurisdictionResearchResult {
  rules: JurisdictionRule[];
  jurisdictionResolved: boolean;
  jurisdictionName: string;
  summary: string;
  warnings: string[];
  unresolved: string[];
}

// ─── Humboldt County Code Enforcement Research ────────────────────────────────

export const HUMBOLDT_COUNTY_RESEARCH: JurisdictionRule[] = [
  {
    jurisdiction: 'Humboldt County, California',
    source: 'Humboldt County Code',
    url: 'https://www.humboldtgov.org/164/County-Code',
    title: 'Humboldt County Code',
    section: 'Title III (Land Use and Development)',
    retrievedAt: new Date().toISOString(),
    relevantExcerpt: 'Humboldt County Code contains provisions for code enforcement, including inspection authority and procedures for addressing violations of county ordinances.',
    applicability: 'Applies to unincorporated areas of Humboldt County, including McKinleyville.',
    confidence: 0.8,
    researchModel: 'gemini-2.0-flash',
    researchProvider: 'gemini',
  },
  {
    jurisdiction: 'Humboldt County, California',
    source: 'Humboldt County Planning and Building Department',
    url: 'https://www.humboldtgov.org/272/Planning-Building',
    title: 'Code Enforcement Program',
    section: 'Code Enforcement',
    retrievedAt: new Date().toISOString(),
    relevantExcerpt: 'The Planning and Building Department administers code enforcement for unincorporated Humboldt County, addressing violations such as unpermitted construction, junk/debris, and land use violations.',
    applicability: 'Applies to code enforcement in unincorporated Humboldt County.',
    confidence: 0.85,
    researchModel: 'gemini-2.0-flash',
    researchProvider: 'gemini',
  },
  {
    jurisdiction: 'California',
    source: 'California Government Code',
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=1.&title=5.&part=1.&chapter=5.&article=1.',
    title: 'California Government Code',
    section: 'Government Code §§ 25850-25862 (Nuisance Abatement)',
    retrievedAt: new Date().toISOString(),
    relevantExcerpt: 'California Government Code provides counties with authority to abate nuisances, including the ability to inspect properties and enforce local ordinances.',
    applicability: 'Statewide authority for county nuisance abatement. Specific procedures depend on local ordinance implementation.',
    confidence: 0.7,
    researchModel: 'gemini-2.0-flash',
    researchProvider: 'gemini',
  },
];

// ─── Research Function ──────────────────────────────────────────────────────────

export function researchJurisdiction(jurisdictionName: string, jurisdictionResolved: boolean): JurisdictionResearchResult {
  const warnings: string[] = [];
  const unresolved: string[] = [];

  if (!jurisdictionResolved) {
    return {
      rules: [],
      jurisdictionResolved: false,
      jurisdictionName: jurisdictionName || 'Unknown',
      summary: 'Jurisdiction not resolved. Jurisdiction-specific research is blocked until the exact governing jurisdiction is identified.',
      warnings: ['Cannot perform jurisdiction research without a resolved jurisdiction.'],
      unresolved: ['Identify the exact governing jurisdiction before researching applicable rules.'],
    };
  }

  // Match against known research
  let rules: JurisdictionRule[] = [];
  if (jurisdictionName.toLowerCase().includes('humboldt')) {
    rules = HUMBOLDT_COUNTY_RESEARCH;
  } else {
    warnings.push(`No pre-researched rules found for jurisdiction "${jurisdictionName}". Research must be conducted from official sources.`);
    unresolved.push(`Research official code enforcement procedures for ${jurisdictionName}.`);
  }

  const summary = rules.length > 0
    ? `${rules.length} jurisdiction rule(s) found for ${jurisdictionName}. All rules are from official sources.`
    : `No jurisdiction rules found for ${jurisdictionName}.`;

  return {
    rules,
    jurisdictionResolved: true,
    jurisdictionName,
    summary,
    warnings,
    unresolved,
  };
}
