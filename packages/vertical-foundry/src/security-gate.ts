export interface SecurityResult { passed: boolean; blockers: string[]; warnings: string[] }
export interface SecurityProvider { scan(repository: string, branch: string): Promise<SecurityResult> }

export async function requireSecurityPass(provider: SecurityProvider, repository: string, branch: string): Promise<SecurityResult> {
  const result = await provider.scan(repository, branch)
  if (!result.passed || result.blockers.length) throw new Error('Security gate blocked vertical')
  return result
}
