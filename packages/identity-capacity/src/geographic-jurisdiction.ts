/**
 * Geographic Jurisdiction Identification
 *
 * Determines: state, county, municipality, agency, department, program, property type
 * with confidence scoring and jurisdictional validation.
 *
 * CRITICAL: Do NOT automatically assume that "McKinleyville" determines the exact
 * enforcing jurisdiction. McKinleyville is unincorporated — it could be
 * Humboldt County, an incorporated city, another agency, or another governing body.
 *
 * If the jurisdiction cannot be confidently resolved: STOP jurisdiction-specific conclusions.
 */

// ─── Geographic Jurisdiction Types ────────────────────────────────────────────

export type JurisdictionLevel =
  | 'state'
  | 'county'
  | 'municipality'
  | 'special_district'
  | 'unknown';

export interface GeographicJurisdiction {
  state: string;
  county?: string;
  municipality?: string;
  agency: string;
  department?: string;
  program?: string;
  level: JurisdictionLevel;
  isIncorporated: boolean;
  resolved: boolean;
  confidence: number; // 0.0–1.0
  reason?: string;
}

// ─── California County Detection ──────────────────────────────────────────────

const CA_COUNTIES = [
  'Humboldt', 'Mendocino', 'Sonoma', 'Marin', 'Del Norte', 'Siskiyou',
  'Trinity', 'Shasta', 'Tehama', 'Glenn', 'Lake', 'Napa', 'Solano',
  'Contra Costa', 'Alameda', 'San Francisco', 'San Mateo', 'Santa Cruz',
  'Santa Clara', 'San Benito', 'Monterey', 'Fresno', 'Kings', 'Tulare',
  'Kern', 'San Luis Obispo', 'Santa Barbara', 'Ventura', 'Los Angeles',
  'San Bernardino', 'Riverside', 'Orange', 'San Diego', 'Imperial',
  'Inyo', 'Mono', 'Mariposa', 'Tuolumne', 'Calaveras', 'Amador',
  'El Dorado', 'Placer', 'Nevada', 'Sierra', 'Yuba', 'Sutter',
  'Butte', 'Plumas', 'Lassen', 'Modoc', 'Colusa', 'Yolo',
  'Sacramento', 'San Joaquin', 'Stanislaus', 'Merced', 'Madera',
];

const CA_INCORPORATED_CITIES = new Map([
  ['Eureka', 'Humboldt'],
  ['Arcata', 'Humboldt'],
  ['Fortuna', 'Humboldt'],
  ['Rio Dell', 'Humboldt'],
  ['Ferndale', 'Humboldt'],
  ['Trinidad', 'Humboldt'],
  ['Blue Lake', 'Humboldt'],
]);

const CA_UNINCORPORATED_COMMUNITIES = new Map([
  ['McKinleyville', { county: 'Humboldt', note: 'Unincorporated community' }],
]);

// ─── Jurisdiction Resolution ─────────────────────────────────────────────────

export function identifyGeographicJurisdiction(input: {
  locationName?: string;
  countyName?: string;
  agencyName?: string;
  noticeText?: string;
}): GeographicJurisdiction {
  const locationName = input.locationName?.trim() || '';
  const countyName = input.countyName?.trim() || '';
  const agencyName = input.agencyName?.trim() || '';

  // Check if the location is a known incorporated city
  if (locationName && CA_INCORPORATED_CITIES.has(locationName)) {
    const county = CA_INCORPORATED_CITIES.get(locationName)!;
    return {
      state: 'California',
      county,
      municipality: locationName,
      agency: agencyName || `${locationName} Code Enforcement`,
      level: 'municipality',
      isIncorporated: true,
      resolved: true,
      confidence: 0.85,
      reason: `${locationName} is an incorporated city with its own municipal code enforcement authority.`,
    };
  }

  // Check if the location is a known unincorporated community
  if (locationName && CA_UNINCORPORATED_COMMUNITIES.has(locationName)) {
    const communityInfo = CA_UNINCORPORATED_COMMUNITIES.get(locationName)!;
    return {
      state: 'California',
      county: communityInfo.county,
      agency: agencyName || `${communityInfo.county} County Code Enforcement`,
      department: 'Planning and Building Department',
      level: 'county',
      isIncorporated: false,
      resolved: true,
      confidence: 0.8,
      reason: `${locationName} is an unincorporated community in ${communityInfo.county} County. Code enforcement is under county jurisdiction.`,
    };
  }

  // Try to match a county by name
  if (countyName) {
    const matchedCounty = CA_COUNTIES.find(c => c.toLowerCase() === countyName.toLowerCase());
    if (matchedCounty) {
      return {
        state: 'California',
        county: matchedCounty,
        agency: agencyName || `${matchedCounty} County Code Enforcement`,
        level: 'county',
        isIncorporated: false,
        resolved: true,
        confidence: 0.75,
        reason: `${matchedCounty} County identified as the governing jurisdiction.`,
      };
    }
  }

  // Try to detect county from agency name
  if (agencyName) {
    const countyMatch = CA_COUNTIES.find(c =>
      agencyName.toLowerCase().includes(c.toLowerCase())
    );
    if (countyMatch) {
      return {
        state: 'California',
        county: countyMatch,
        agency: agencyName,
        level: 'county',
        isIncorporated: false,
        resolved: true,
        confidence: 0.7,
        reason: `Agency name indicates ${countyMatch} County jurisdiction.`,
      };
    }
  }

  // Unknown jurisdiction — STOP
  return {
    state: 'California',
    county: undefined,
    municipality: undefined,
    agency: agencyName || 'Unknown',
    level: 'unknown',
    isIncorporated: false,
    resolved: false,
    confidence: 0.2,
    reason: 'Jurisdiction could not be confidently resolved. Jurisdiction-specific conclusions are blocked until the exact governing jurisdiction is identified.',
  };
}

// ─── Jurisdiction Validation ──────────────────────────────────────────────────

export function canMakeJurisdictionalConclusions(jurisdiction: GeographicJurisdiction): boolean {
  return jurisdiction.resolved && jurisdiction.confidence >= 0.7;
}

export function validateJurisdictionForCodeEnforcement(jurisdiction: GeographicJurisdiction): {
  valid: boolean;
  blockers: string[];
  warnings: string[];
} {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!jurisdiction.resolved) {
    blockers.push('Jurisdiction is not resolved. Cannot proceed with code enforcement response.');
  }

  if (jurisdiction.confidence < 0.7) {
    blockers.push(`Jurisdiction confidence is ${jurisdiction.confidence} (need ≥0.7). Requires human review.`);
  }

  if (!jurisdiction.agency) {
    blockers.push('No enforcing agency identified. Cannot address response to unknown recipient.');
  }

  if (!jurisdiction.state) {
    warnings.push('State is not identified. Response may be incomplete.');
  }

  if (jurisdiction.level === 'unknown') {
    blockers.push('Jurisdiction level is unknown. Cannot determine which authority to address.');
  }

  return {
    valid: blockers.length === 0,
    blockers,
    warnings,
  };
}
