export interface SecurityContext { actorId: string; caseId?: string; roles: string[]; scopes: string[]; }
export interface SecurityPolicy { requiredScope?: string; allowedRoles?: string[]; maxInputBytes?: number; }
export function authorize(context: SecurityContext, policy: SecurityPolicy): void {
  if (policy.requiredScope && !context.scopes.includes(policy.requiredScope)) throw new Error('SECURITY_SCOPE_DENIED');
  if (policy.allowedRoles?.length && !policy.allowedRoles.some((role) => context.roles.includes(role))) throw new Error('SECURITY_ROLE_DENIED');
}
export function enforceInputSize(input: unknown, maxBytes: number): void {
  const bytes = new TextEncoder().encode(JSON.stringify(input)).byteLength;
  if (bytes > maxBytes) throw new Error('SECURITY_INPUT_TOO_LARGE');
}
export function redactSecrets(value: string): string { return value.replace(/(authorization|api[-_]?key|token|secret)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]'); }
