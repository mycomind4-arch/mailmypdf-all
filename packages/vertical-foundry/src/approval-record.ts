export interface ApprovalRecord { runId: string; action: string; approvedBy: string; approvedAt: string; expiresAt?: string; }
export function approvalActive(record: ApprovalRecord): boolean {
  return !record.expiresAt || Date.parse(record.expiresAt) > Date.now()
}
