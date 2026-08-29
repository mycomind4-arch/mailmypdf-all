import { PublicRecordsSource } from './source-adapter'

/**
 * Conservative source map. Concrete jurisdiction adapters are added only after
 * the official source, access method, robots posture, and terms have been verified.
 */
export function buildCodeEnforcementSourceDiscovery(input: {
  jurisdiction: string
  agency?: string
  caseNumber?: string
  parcel?: string
  address?: string
  violationNumber?: string
}): {
  sourceTypes: PublicRecordsSource['type'][]
  identifiers: Record<string, string>
  researchRequired: string[]
} {
  const identifiers = Object.fromEntries(
    Object.entries({
      caseNumber: input.caseNumber,
      parcel: input.parcel,
      address: input.address,
      violationNumber: input.violationNumber,
    }).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0),
  )

  return {
    sourceTypes: ['official-api', 'open-data', 'agency-search', 'gis', 'document-archive', 'public-index'],
    identifiers,
    researchRequired: [
      `Identify official public-records sources for ${input.jurisdiction}${input.agency ? ` / ${input.agency}` : ''}.`,
      'Verify automated access, robots posture, terms, rate limits, and whether an official API or open-data feed exists before acquisition.',
      'Prefer official structured sources over HTML scraping when both are available.',
    ],
  }
}
