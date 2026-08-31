export type ProductionRecord = {
  id: string
  requestId: string
  provider?: string
  receivedAt?: string
  documentHash?: string
}

export type EvidenceRecord = {
  id: string
  productionId: string
  type: string
  sourceRef: string
  description?: string
}

export type FindingRecord = {
  id: string
  requestId: string
  type: string
  severity: 'info' | 'warning' | 'critical'
  evidenceIds: string[]
  description: string
}

export type ActionRecord = {
  id: string
  requestId: string
  type: string
  status: 'open' | 'completed' | 'dismissed'
  findingId?: string
}

export interface ProductionIntelligenceProvider {
  ingestProduction(input: ProductionRecord): Promise<ProductionRecord>
  attachEvidence(input: EvidenceRecord): Promise<EvidenceRecord>
  createFinding(input: FindingRecord): Promise<FindingRecord>
  createAction(input: ActionRecord): Promise<ActionRecord>
}
