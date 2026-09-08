import { registerJurisdictionPack } from '../jurisdiction-registry';
import type { JurisdictionPack } from '../types';

/**
 * Humboldt is the FairProcess proof-of-concept jurisdiction.
 *
 * The data connectors may be used for sourced factual discovery. The local policy
 * pack remains legal-review-required, so its rules must not be presented as
 * authoritative legal conclusions until the pack is reviewed and activated.
 *
 * Source URLs in this pack were re-verified against the county's public systems
 * on 2026-09-07. Stale FairProcessMaps ArcGIS endpoints are intentionally not
 * treated as current sources here.
 */
export const HUMBOLDT_FAIRPROCESS_PACK: JurisdictionPack = {
  id: 'us-ca-humboldt',
  version: '2026-09-07.2',
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
      id: 'humboldt-parcels',
      kind: 'parcel',
      name: 'Humboldt County Parcels GIS',
      baseUrl: 'https://cty-gis-web.co.humboldt.ca.us/server/rest/services/Parcels/Parcels/MapServer/0',
      official: true,
      enabled: true,
      provenanceRequired: true,
      notes: 'Current county GIS parcel layer. County cautions that GIS data should be independently verified before material reliance.',
    },
    {
      id: 'humboldt-code-enforcement-cases',
      kind: 'code_enforcement',
      name: 'Humboldt County Code Enforcement GIS historical snapshot',
      baseUrl: 'https://cty-gis-web.co.humboldt.ca.us/server/rest/services/Web/Housing_Public/MapServer/7',
      official: true,
      enabled: true,
      provenanceRequired: true,
      notes: 'The exposed county GIS layer is titled "Code Enforcement Cases 1/15/2025". Treat it only as historical/context evidence, never as proof of current case status.',
    },
    {
      id: 'humboldt-building-permits',
      kind: 'permit',
      name: 'Humboldt County Accela permit search',
      baseUrl: 'https://aca-prod.accela.com/humboldt/Default.aspx',
      official: true,
      enabled: false,
      provenanceRequired: true,
      notes: 'County says permit records can be searched in Accela without logging in. Automated machine access has not been validated, so FairProcess must not invent or scrape an undocumented API.',
    },
    {
      id: 'humboldt-county-code',
      kind: 'county_code',
      name: 'Humboldt County Code',
      baseUrl: 'https://humboldt.county.codes/',
      official: false,
      enabled: true,
      provenanceRequired: true,
      notes: 'Convenience source linked by the county. Controlling text should be verified before a legal conclusion is activated.',
    },
    {
      id: 'humboldt-public-records',
      kind: 'public_records',
      name: 'Humboldt County Public Records',
      baseUrl: 'https://humboldtgov.org/153/Building-Inspection',
      official: true,
      enabled: true,
      provenanceRequired: true,
      notes: 'Official Planning & Building entry point links public-records request resources. Exact request endpoints should be captured when resolved.',
    },
  ],
};

export function registerHumboldtFairProcessPack(): JurisdictionPack {
  return registerJurisdictionPack(HUMBOLDT_FAIRPROCESS_PACK);
}
