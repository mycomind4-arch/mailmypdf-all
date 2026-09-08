import type { Jurisdiction } from '../domain/jurisdiction';
import { resolveJurisdictionPack, registerJurisdictionPack } from './jurisdiction-registry';
import { HUMBOLDT_FAIRPROCESS_PACK } from './jurisdictions/humboldt';

export * from './types';
export * from './attorney-packet';
export * from './connector';
export * from './evidence-integrity';
export * from './investigation-adapter';
export * from './jurisdiction-registry';
export * from './store';
export * from './jurisdictions/humboldt';
export * from './jurisdictions/humboldt-connector';

export function ensureFairProcessJurisdictions(): void {
  registerJurisdictionPack(HUMBOLDT_FAIRPROCESS_PACK);
}

export function resolveFairProcessPackForJurisdiction(
  jurisdiction: Pick<Jurisdiction, 'state' | 'county' | 'municipality' | 'agency'>,
) {
  ensureFairProcessJurisdictions();
  return resolveJurisdictionPack({
    state: jurisdiction.state,
    county: jurisdiction.county,
    municipality: jurisdiction.municipality,
    agency: jurisdiction.agency,
  });
}
