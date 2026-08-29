export type FoundryEnvironment = 'REHEARSAL' | 'PREVIEW' | 'PRODUCTION'
export interface EnvironmentPolicy { allowProduction: boolean; allowRegistration: boolean }
export function assertEnvironment(policy: EnvironmentPolicy, environment: FoundryEnvironment): void {
  if (environment === 'PRODUCTION' && !policy.allowProduction) throw new Error('Production execution is not authorized')
  if (environment !== 'PRODUCTION' && policy.allowRegistration === false) return
}
