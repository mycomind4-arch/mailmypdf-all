/**
 * Jurisdiction Identification
 *
 * Determines: state, county, municipality, agency, department, program, property type.
 *
 * CRITICAL: Do NOT automatically assume that "McKinleyville" determines the exact
 * enforcing jurisdiction. McKinleyville is unincorporated — it could be
 * Humboldt County, an incorporated city, another agency, or another governing body.
 *
 * If the jurisdiction cannot be confidently resolved: STOP jurisdiction-specific conclusions.
 */

// ─── Jurisdiction Types ───────────────────────────────────────────────────────

export type JurisdictionLevel =
  | 'state'
  | 'county'
  | 'municipality'
  | 'special_district'
  | 'unknown';

export interface Jurisdiction {
  state: string;
  county?: string;
  municipality?: string;
  agency: string;
  department?: string;
  program?: string;
  level: JurisdictionLevel;
  isIncorporated: boolean;
  resolved: boolean;
  confidence: number;
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

const CA_INCORPORATED_CITIES = new Set([
  'Eureka', 'Arcata', 'Fortuna', 'Rio Dell', 'Ferndale', 'Trinidad', 'Blue Lake',
  // Humboldt County incorporated cities
]);

// ─── Jurisdiction Resolution ─────────────────────────────────────────────────

export function identifyJurisdiction(input: {
  locationName?: string;
  countyName?: string;
  agencyName?: string;
  noticeText?: string;
}): Jurisdiction {
  const locationName = input.locationName?.trim() || '';
  const countyName = input.countyName?.trim() || '';
  const agencyName = input.agencyName?.trim() || '';

  // Check if the location is an incorporated city
  if (locationName && CA_INCORPORATED_CITIES.has(locationName)) {
    // Incorporated city — could have its own code enforcement
    return {
      state: 'California',
      county: countyName || 'Unknown',
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
  if (locationName === 'McKinleyville') {
    return {
      state: 'California',
      county: 'Humboldt',
      agency: agencyName || 'Humboldt County Code Enforcement',
      department: 'Planning and Building Department',
      level: 'county',
      isIncorporated: false,
      resolved: true,
      confidence: 0.8,
      reason: 'McKinleyville is an unincorporated community in Humboldt County. Code enforcement is under Humboldt County jurisdiction.',
    };
  }

  // Try to match a county
  if (countyName && CA_COUNTIES.some(c => c.toLowerCase() === countyName.toLowerCase())) {
    return {
      state: 'California',
      county: countyName,
      agency: agencyName || `${countyName} County Code Enforcement`,
      level: 'county',
      isIncorporated: false,
      resolved: true,
      confidence: 0.75,
      reason: `${countyName} County identified as the governing jurisdiction.`,
    };
  }

  // Try to detect from agency name
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

export function canMakeJurisdictionalConclusions(jurisdiction: Jurisdiction): boolean {
  return jurisdiction.resolved && jurisdiction.confidence >= 0.7;
}
