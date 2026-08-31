export type JurisdictionPolicyVersion = {
  id: string
  jurisdiction: string
  version: string
  effectiveFrom: string
}

export type RecordsPolicy = JurisdictionPolicyVersion & {
  acknowledgementDays?: number
  productionDays?: number
  extensionDays?: number
  supportsClarification: boolean
  supportsFees: boolean
}

export interface JurisdictionPolicyProvider {
  getPolicy(jurisdiction: string, asOf?: string): Promise<RecordsPolicy | null>
}

export class NullJurisdictionPolicyProvider implements JurisdictionPolicyProvider {
  async getPolicy(): Promise<RecordsPolicy | null> {
    return null
  }
}
