export type CodeEnforcementAuthorityInput = {
  jurisdiction?: string
  agency?: string
  purpose?: string
  identifiers?: {
    caseNumbers?: string[]
    parcelNumbers?: string[]
    addresses?: string[]
  }
}

export type AuthoritySupport = {
  kind: 'workflow_fact' | 'inference' | 'requires_research'
  statement: string
  confidence: 'high' | 'medium' | 'low'
  provenance: string
}

export type CodeEnforcementAuthorityProfile = {
  likelyCustodianRoles: string[]
  likelySystems: string[]
  searchDimensions: string[]
  supports: AuthoritySupport[]
  humanReviewRequired: boolean
  researchQueries: string[]
}

function clean(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))]
}

/**
 * Conservative authority profile. This deliberately does not claim that a
 * jurisdiction legally requires a particular custodian/system. Those claims
 * require jurisdiction-specific primary authority or agency documentation.
 */
export function buildCodeEnforcementAuthorityProfile(input: CodeEnforcementAuthorityInput): CodeEnforcementAuthorityProfile {
  const likelyCustodianRoles = clean([
    'Code enforcement / building enforcement office',
    'Planning or community development department',
    'Records custodian / public records officer',
    'Inspection or field-services unit',
  ])
  const likelySystems = clean([
    'Code-enforcement case management system',
    'Inspection and field-services system',
    'Document / records repository',
    'Parcel or property index',
    'Public-records request tracking system',
    'Email / correspondence archive',
  ])
  const searchDimensions = clean([
    'case / complaint / violation number',
    'parcel or APN number',
    'property address',
    'inspection date and date range',
    'complainant / respondent / owner name',
    'citation or notice number',
  ])
  const jurisdiction = input.jurisdiction?.trim()
  const agency = input.agency?.trim()
  const identifiers = [
    ...(input.identifiers?.caseNumbers ?? []),
    ...(input.identifiers?.parcelNumbers ?? []),
    ...(input.identifiers?.addresses ?? []),
  ]

  const researchQueries = clean([
    jurisdiction ? `${jurisdiction} code enforcement public records custodian records request` : undefined,
    jurisdiction ? `${jurisdiction} code enforcement records retention inspection complaint case records` : undefined,
    agency ? `${agency} code enforcement records custodian records system` : undefined,
    identifiers.length ? `code enforcement records search identifiers ${identifiers.slice(0, 5).join(' ')}` : undefined,
  ])

  return {
    likelyCustodianRoles,
    likelySystems,
    searchDimensions,
    supports: [
      {
        kind: 'workflow_fact',
        statement: jurisdiction ? `The request identifies jurisdiction: ${jurisdiction}.` : 'No jurisdiction was supplied.',
        confidence: jurisdiction ? 'high' : 'low',
        provenance: 'request-input',
      },
      {
        kind: 'inference',
        statement: 'The listed custodian roles and systems are plausible search targets for code-enforcement records, not legal conclusions about where records must be maintained.',
        confidence: 'medium',
        provenance: 'code-enforcement-domain-profile:v1',
      },
      {
        kind: 'requires_research',
        statement: 'Jurisdiction-specific custodian, retention, exemption, and records-system claims require primary authority or official agency documentation before being presented as authoritative.',
        confidence: 'high',
        provenance: 'authority-safety-policy:v1',
      },
    ],
    humanReviewRequired: true,
    researchQueries,
  }
}
