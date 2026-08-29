export interface ArtifactDigest { path: string; sha256: string }
export interface ArtifactIntegrityProvider { verify(artifacts: readonly ArtifactDigest[]): Promise<boolean> }

export async function requireIntegrity(provider: ArtifactIntegrityProvider, artifacts: readonly ArtifactDigest[]): Promise<void> {
  if (!(await provider.verify(artifacts))) throw new Error('Artifact integrity verification failed')
}
