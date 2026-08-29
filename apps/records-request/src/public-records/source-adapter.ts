export type PublicRecordsSourceType =
  | 'official-api'
  | 'open-data'
  | 'agency-search'
  | 'gis'
  | 'document-archive'
  | 'public-index'

export type PublicRecordsAccessMethod = 'api' | 'html' | 'pdf' | 'csv' | 'json'

export type PublicRecordsSource = {
  id: string
  jurisdiction: string
  agency?: string
  name: string
  type: PublicRecordsSourceType
  officialUrl: string
  accessMethod: PublicRecordsAccessMethod
  enabled: boolean
  robotsChecked?: boolean
  termsReviewed?: boolean
  rateLimitPerMinute?: number
  lastVerifiedAt?: string
}

export type PublicRecordsSearch = {
  sourceId: string
  query: Record<string, string>
  identifiers?: {
    caseNumber?: string
    parcel?: string
    address?: string
    violationNumber?: string
  }
}

export type PublicRecordsArtifact = {
  sourceId: string
  sourceUrl: string
  retrievedAt: string
  contentType: string
  title?: string
  sourceRecordId?: string
  documentHash?: string
  content?: string
  metadata?: Record<string, string>
}

export interface PublicRecordsSourceAdapter {
  readonly source: PublicRecordsSource
  search(request: PublicRecordsSearch): Promise<PublicRecordsArtifact[]>
}

export function assertCompliantSource(source: PublicRecordsSource): void {
  if (!source.officialUrl.startsWith('https://')) throw new Error('PUBLIC_RECORDS_SOURCE_MUST_USE_HTTPS')
  if (!source.enabled) throw new Error('PUBLIC_RECORDS_SOURCE_DISABLED')
  if (source.robotsChecked === false || source.termsReviewed === false) {
    throw new Error('PUBLIC_RECORDS_SOURCE_COMPLIANCE_REVIEW_REQUIRED')
  }
}

export function normalizePublicRecordsArtifact(input: PublicRecordsArtifact): PublicRecordsArtifact {
  return {
    ...input,
    retrievedAt: new Date(input.retrievedAt).toISOString(),
    content: input.content?.replace(/\r\n/g, '\n'),
    metadata: input.metadata ? Object.fromEntries(Object.entries(input.metadata).sort()) : undefined,
  }
}
