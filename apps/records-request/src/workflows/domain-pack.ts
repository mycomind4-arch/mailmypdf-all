export type RecordsDomainCapability =
  | 'classification'
  | 'extraction'
  | 'deadline'
  | 'contradiction'
  | 'findings'
  | 'evidence'
  | 'research'
  | 'risk'
  | 'strategy'
  | 'draft'
  | 'draftProvenance'
  | 'validation'
  | 'review'
  | 'approval'
  | 'mailing'
  | 'tracking'
  | 'proofAudit'

export interface RecordsDomainPackManifest {
  id: string
  name: string
  version: string
  capabilities: readonly RecordsDomainCapability[]
}

export function missingDomainCapabilities(
  manifest: RecordsDomainPackManifest,
  required: readonly RecordsDomainCapability[],
): RecordsDomainCapability[] {
  const available = new Set(manifest.capabilities)
  return required.filter((capability) => !available.has(capability))
}

export function isExecutableDomainPack(
  manifest: RecordsDomainPackManifest,
  required: readonly RecordsDomainCapability[],
): boolean {
  return missingDomainCapabilities(manifest, required).length === 0
}
