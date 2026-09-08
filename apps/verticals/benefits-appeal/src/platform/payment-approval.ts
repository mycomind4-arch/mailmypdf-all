import { z } from 'zod';
import { hashDraft, hashRecipient } from '@mailmypdf/payment-fulfillment';
import { runReadinessReview } from '../domain/review';
import { workflows } from '../domain/workflows';

export class PaymentError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
export const recipientSchema = z.object({
  name: z.string().trim().min(1).max(200), address1: z.string().trim().min(1).max(200),
  address2: z.string().trim().max(200).optional(), city: z.string().trim().min(1).max(100),
  state: z.string().trim().regex(/^[A-Za-z]{2}$/), zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/),
});
const approvalSchema = z.object({ recipient: recipientSchema, mailingMethod: z.enum(['standard', 'certified', 'registered']), draft: z.string().min(50).max(500_000).optional() });

export function prepareApproval(appeal: Record<string, any>, ownerId: string, workflowId: string, input: unknown) {
  if (appeal.user_id !== ownerId) throw new PaymentError('You do not own this appeal.', 403);
  if (!Object.hasOwn(workflows, workflowId) || appeal.workflow_id !== workflowId) throw new PaymentError('Appeal workflow mismatch.');
  const { recipient, mailingMethod, draft: reviewedDraft } = approvalSchema.parse(input);
  const draft = z.string().min(50).max(500_000).parse(reviewedDraft ?? appeal.draft);
  const evidence = Array.isArray(appeal.evidence) ? appeal.evidence : [];
  const review = runReadinessReview({ decision: appeal.decision, grounds: appeal.grounds || [], evidence, draft, recipient, exhibitCount: evidence.length, hasSignature: /sincerely|signature|\[your name\]/i.test(draft) });
  if (review.score < 80 || review.issuesRequiringAttention > 2 || review.checks.some(c => c.status === 'fail')) throw new PaymentError('Appeal is not ready for approval.');
  // This fulfillment path sends the letter only. Do not silently omit attachments.
  if (evidence.some(item => item.documentId || item.type !== 'excerpt')) throw new PaymentError('Document attachments require packet assembly before this appeal can be mailed.');
  return { owner_id: ownerId, case_id: appeal.id, workflow_id: workflowId, draft_content: draft, recipient,
    mailing_method: mailingMethod === 'standard' ? 'first_class' : mailingMethod,
    approved_draft_hash: hashDraft(draft), approved_recipient_hash: hashRecipient(recipient),
    status: 'approved', review, matter_reference: appeal.decision?.referenceNumber || appeal.id, matter_type: workflowId };
}
