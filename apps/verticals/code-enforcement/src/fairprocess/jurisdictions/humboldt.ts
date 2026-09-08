import { registerJurisdictionPack } from '../jurisdiction-registry';
import type { JurisdictionPack } from '../types';

/**
 * Humboldt is the FairProcess proof-of-concept jurisdiction.
 *
 * The data connectors may be used for sourced factual discovery. The local policy
 * pack remains legal-review-required, so its rules must not be presented as
 * authoritative legal conclusions until the pack is reviewed and activated.
 */
export const HUMBOLDT_FAIRPROCESS_PACK: JurisdictionPack = {
  id: 'us-ca-humboldt',
  version: '2026-09-07.1',
  name: 'Humboldt County, California',
  country: 'United States',
  state: 'California',
  county: 'Humboldt',
  aliases: [
    'Humboldt County',
    'Humboldt County Code Enforcement',
    'Humboldt County Planning and Building Department',
    'McKinleyville',
  ],
  supportedCaseTypes: ['code_enforcement', 'abatement', 'nuisance', 'inspection_request'],
  policy: {
    id: 'humboldt-code-enforcement',
    version: '2026-09-05-engineering-draft',
    status: 'legal_review_required',
    sourceRepository: 'mycomind4-arch/fairprocessmaps',
    sourcePath: 'frontend/web/src/lib/policy/packs/humboldt-code-enforcement.json',
    notes: 'Engineering policy pack imported by reference. Legal rules remain gated until reviewed.',
  },
  allowJurisdictionSpecificLegalConclusions: false,
  connectors: [
    {
      id: 'humboldt-building-permits',
      kind: 'permit',
      name: 'Humboldt County Building Permits ArcGIS',
      baseUrl: 'https://cty-gis-web.co.humboldt.ca.us/server/rest/services/Building/Building_Permits/MapServer/0',
      official: true,
      enabled: true,
      provenanceRequired: true,
    },
    {
      id: 'humboldt-code-enforcement-cases',
      kind: 'code_enforcement',
      name: 'Humboldt County Code Enforcement ArcGIS',
      baseUrl: 'https://cty-gis-web.co.humboldt.ca.us/server/rest/services/Code_Enforcement/Code_Enforcement/MapServer/0',
      official: true,
      enabled: true,
      provenanceRequired: true,
    },
    {
      id: 'humboldt-county-code',
      kind: 'county_code',
      name: 'Humboldt County Code',
      baseUrl: 'https://humboldt.county.codes/',
      official: false,
      enabled: true,
      provenanceRequired: true,
      notes: 'Convenience source. Controlling text should be verified against an official county source before a legal conclusion is activated.',
    },
    {
      id: 'humboldt-public-records',
      kind: 'public_records',
      name: 'Humboldt County Public Records',
      baseUrl: 'https://humboldtgov.org/',
      official: true,
      enabled: true,
      provenanceRequired: true,
      notes: 'Discovery entry point. Individual department request endpoints should be stored as sourced records when resolved.',
    },
  ],
};

export function registerHumboldtFairProcessPack(): JurisdictionPack {
  return registerJurisdictionPack(HUMBOLDT_FAIRPROCESS_PACK);
}
