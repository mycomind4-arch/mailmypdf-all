export interface RollbackProvider { rollback(repository: string, branch: string): Promise<{ rolledBack: boolean }> }

export async function rollbackOnFailure(provider: RollbackProvider, repository: string, branch: string): Promise<void> {
  const result = await provider.rollback(repository, branch)
  if (!result.rolledBack) throw new Error('Rollback failed; manual intervention required')
}
