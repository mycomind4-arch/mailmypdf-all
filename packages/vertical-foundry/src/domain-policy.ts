export interface DomainPolicy { allowedSuffixes: string[]; blockedDomains: string[] }
export function domainAllowed(domain: string, policy: DomainPolicy): boolean {
  if (policy.blockedDomains.includes(domain.toLowerCase())) return false
  return policy.allowedSuffixes.some((suffix) => domain.toLowerCase().endsWith(suffix.toLowerCase()))
}
