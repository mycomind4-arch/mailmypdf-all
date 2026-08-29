export type ApprovalPrincipal = {
  subject: string
  roles: readonly string[]
  authenticated: boolean
}

type AuthorizationResolver = () => Promise<ApprovalPrincipal | null>

const runtimeKey = '__MAILMYPDF_RECORDS_APPROVAL_AUTH__'

type RuntimeGlobal = typeof globalThis & {
  [runtimeKey]?: AuthorizationResolver
}

export function installApprovalAuthorizationResolver(resolver: AuthorizationResolver): void {
  ;(globalThis as RuntimeGlobal)[runtimeKey] = resolver
}

export async function getApprovalPrincipal(): Promise<ApprovalPrincipal | null> {
  const resolver = (globalThis as RuntimeGlobal)[runtimeKey]
  if (!resolver) return null
  try {
    const principal = await resolver()
    if (!principal?.authenticated || !principal.subject.trim()) return null
    return principal
  } catch {
    return null
  }
}

export function canApproveWithRole(principal: ApprovalPrincipal): boolean {
  return principal.authenticated && principal.subject.trim().length > 0 && principal.roles.some((role) => role === 'case_approver' || role === 'admin' || role === 'owner')
}
