export type ApprovalAction = 'BUILD' | 'PREVIEW_DEPLOY' | 'REGISTER'
export interface ApprovalRequest { action: ApprovalAction; verticalId: string; reason: string }
export interface ApprovalProvider { approve(request: ApprovalRequest): Promise<boolean> }

export async function requireApproval(provider: ApprovalProvider, request: ApprovalRequest): Promise<void> {
  if (!(await provider.approve(request))) throw new Error(`Approval denied for ${request.action}`)
}
