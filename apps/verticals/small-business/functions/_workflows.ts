import { getPricingProfilesByVertical } from "@mailmypdf/pricing";

/**
 * The canonical vertical ID for MailMyPDF Small Business in the shared
 * pricing catalog (`packages/pricing`). Every workflow this product can
 * ever charge for or trigger fulfillment on must be registered there.
 */
export const SMALL_BUSINESS_VERTICAL_ID = "mailmypdf-smallbusiness";

const ALLOWED_WORKFLOW_IDS = new Set(
  getPricingProfilesByVertical(SMALL_BUSINESS_VERTICAL_ID).map((profile) => profile.workflowId),
);

/**
 * Whether `workflowId` is a known, catalog-registered workflow for this
 * vertical.
 *
 * SECURITY: `workflow_id` is client-supplied at checkout time and is later
 * used server-side (with the Trigger.dev secret key) to select which
 * Trigger.dev task to invoke — `/api/v1/tasks/${workflowId}/trigger`. It
 * must be validated against this allowlist before it is persisted and
 * again before it is used to build that URL, or an authenticated attacker
 * could point the trigger at an arbitrary task in the same Trigger.dev
 * project. Never remove this check to "unblock" a new workflow — add the
 * workflow to the pricing catalog instead.
 */
export function isAllowedWorkflowId(workflowId: string | null | undefined): boolean {
  return typeof workflowId === "string" && workflowId.trim().length > 0 && ALLOWED_WORKFLOW_IDS.has(workflowId);
}
