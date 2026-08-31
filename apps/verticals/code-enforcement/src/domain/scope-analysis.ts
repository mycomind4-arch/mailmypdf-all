/**
 * Inspection Scope Analysis
 *
 * Identifies exactly what the agency wants access to.
 * Possible scope: exterior, interior, garage, outbuilding, vehicle areas,
 * mechanical systems, records, measurements, photographs, video, testing, sampling, other.
 *
 * Classifies scope as: EXPLICIT, PARTIAL, AMBIGUOUS, UNKNOWN.
 * If scope is ambiguous: generate a clarification option.
 * Do NOT characterize ambiguity as illegality.
 */

import type { ExtractedField } from './notice-extraction';

// ─── Scope Types ──────────────────────────────────────────────────────────────

export type ScopeCategory =
  | 'exterior'
  | 'interior'
  | 'garage'
  | 'outbuilding'
  | 'vehicle_areas'
  | 'mechanical_systems'
  | 'records'
  | 'measurements'
  | 'photographs'
  | 'video'
  | 'testing'
  | 'sampling'
  | 'other';

export type ScopeClarity = 'EXPLICIT' | 'PARTIAL' | 'AMBIGUOUS' | 'UNKNOWN';

export interface ScopeItem {
  category: ScopeCategory;
  description: string;
  explicit: boolean;
}

export interface ScopeAnalysis {
  items: ScopeItem[];
  clarity: ScopeClarity;
  includesInterior: boolean;
  includesExterior: boolean;
  includesRecords: boolean;
  includesTesting: boolean;
  summary: string;
  clarificationOption?: string;
  warnings: string[];
}

// ─── Scope Analysis Function ──────────────────────────────────────────────────

export function analyzeScope(extraction: {
  requestedScope: ExtractedField<string[]>;
  searchInspectionWording: ExtractedField;
  consentWording: ExtractedField;
}): ScopeAnalysis {
  const items: ScopeItem[] = [];
  const warnings: string[] = [];

  const scopeValues = extraction.requestedScope.value || [];
  const searchText = extraction.searchInspectionWording.value || '';
  const consentText = extraction.consentWording.value || '';
  const combinedText = `${scopeValues.join(' ')} ${searchText} ${consentText}`;

  // Detect scope items from extracted values and text
  const scopeDetectionMap: Array<[ScopeCategory, RegExp, string]> = [
    ['exterior', /exterior|outside|grounds|yard|property\s+(?:line|boundary)|perimeter/i, 'Exterior inspection'],
    ['interior', /interior|inside|within\s+(?:the\s+)?(?:home|house|dwelling|building|residence|structure)/i, 'Interior inspection'],
    ['garage', /garage|carport/i, 'Garage inspection'],
    ['outbuilding', /outbuilding|shed|barn|structure/i, 'Outbuilding inspection'],
    ['vehicle_areas', /vehicle|car|truck|RV|trailer|parked/i, 'Vehicle area inspection'],
    ['mechanical_systems', /mechanical|electrical|plumbing|HVAC|system/i, 'Mechanical systems inspection'],
    ['records', /records?|documents?|files?|permits?|plans?/i, 'Records inspection'],
    ['measurements', /measur(?:e|ing|ement)/i, 'Measurements'],
    ['photographs', /photograph|photo|picture/i, 'Photographs'],
    ['video', /video|record(?:ing)?|film/i, 'Video recording'],
    ['testing', /test(?:ing)?/i, 'Testing'],
    ['sampling', /sample|sampling/i, 'Sampling'],
  ];

  for (const [category, pattern, description] of scopeDetectionMap) {
    if (pattern.test(combinedText)) {
      const explicit = scopeValues.some(v => pattern.test(v));
      items.push({ category, description, explicit });
    }
  }

  // Determine clarity
  let clarity: ScopeClarity;
  if (items.length === 0) {
    clarity = 'UNKNOWN';
    warnings.push('No inspection scope could be identified from the document.');
  } else if (items.every(i => i.explicit)) {
    clarity = 'EXPLICIT';
  } else if (items.length >= 2 && items.some(i => i.explicit)) {
    clarity = 'PARTIAL';
  } else {
    clarity = 'AMBIGUOUS';
    warnings.push('The inspection scope is ambiguous. Clarification should be requested.');
  }

  // Check for interior scope (high-stakes)
  const includesInterior = items.some(i => i.category === 'interior');
  const includesExterior = items.some(i => i.category === 'exterior');
  const includesRecords = items.some(i => i.category === 'records');
  const includesTesting = items.some(i => i.category === 'testing' || i.category === 'sampling');

  if (includesInterior) {
    warnings.push('The notice may request interior inspection. This is a higher-sensitivity scope.');
  }

  // Generate clarification option if ambiguous
  let clarificationOption: string | undefined;
  if (clarity === 'AMBIGUOUS' || clarity === 'UNKNOWN' || clarity === 'PARTIAL') {
    clarificationOption = 'Request clarification of the exact inspection scope — specifically whether the agency seeks to inspect the interior of the residence, outbuildings, vehicle areas, or only the exterior grounds.';
  }

  // Build summary
  const scopeDescriptions = items.map(i => i.description).join(', ');
  const summary = clarity === 'UNKNOWN'
    ? 'The inspection scope could not be determined from the notice.'
    : `Identified scope: ${scopeDescriptions}. Clarity: ${clarity}.`;

  return {
    items,
    clarity,
    includesInterior,
    includesExterior,
    includesRecords,
    includesTesting,
    summary,
    clarificationOption,
    warnings,
  };
}
