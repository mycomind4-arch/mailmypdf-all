/** Governed action/fulfillment boundary. */
export type FulfillmentStatus = 'planned' | 'awaiting_approval' | 'executing' | 'completed' | 'failed' | 'cancelled';
export interface ProofRecord { id: string; actionId: string; createdAt: string; evidenceRefs: string[]; outcome: 'success' | 'failure'; metadata?: Record<string, string>; }
export interface FulfillmentAction { id: string; caseId: string; type: string; status: FulfillmentStatus; requiresApproval: boolean; idempotencyKey: string; input: unknown; proof?: ProofRecord; }
export interface FulfillmentExecutor { execute(action: FulfillmentAction): Promise<FulfillmentAction>; }
export function canExecute(action: FulfillmentAction): boolean { return action.status === 'planned' && !action.requiresApproval; }
export function attachProof(action: FulfillmentAction, proof: ProofRecord): FulfillmentAction { return { ...action, proof, status: proof.outcome === 'success' ? 'completed' : 'failed' }; }
