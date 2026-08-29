export type CapabilityStatus = 'green' | 'yellow' | 'red';
export interface CapabilityCheck { name: string; status: CapabilityStatus; evidence: string[]; notes?: string; }
export function auditCapabilities(checks: CapabilityCheck[]): { green: number; yellow: number; red: number; allGreen: boolean } {
  const counts = { green: 0, yellow: 0, red: 0 };
  for (const check of checks) counts[check.status]++;
  return { ...counts, allGreen: counts.yellow === 0 && counts.red === 0 };
}
