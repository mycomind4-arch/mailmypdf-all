/**
 * Request-scoped bridge from the existing host's verified Supabase bearer
 * identity to the debt-validation review and approval HTTP boundaries.
 *
 * Deliberately NOT mounted on any route. A release owner must first review
 * hosted owner-scoped persistence/RLS, source-byte storage, and route policy.
 * No checkout, Stripe, Lob, or mailing handler is exposed by this bridge.
 */
import { AuthenticationError, requireAuthenticatedUser } from "./auth.server";
import {
  createDebtValidationApprovalHttpHandler,
  createDebtValidationCheckoutHttpHandler,
  createDebtValidationPacketReviewHttpHandler,
  type DebtValidationCheckoutHttpDependencies,
} from "./debt-validation-approval-http.server";
import type { DebtValidationMatterRepository } from "../../../../dispute-mail/workflows/debt-validation/server-matter-approval";

type VerifiedUser = { user: { id: string } };
type VerifyUser = (request: Request) => Promise<VerifiedUser>;

export function createDebtValidationHostReviewAndApprovalHandlers(
  input: { repository: DebtValidationMatterRepository; allowedOrigin: string },
  // Injectable only by trusted server code, for deterministic offline tests.
  verifyUser: VerifyUser = requireAuthenticatedUser,
) {
  const authenticate = verifiedActor(verifyUser);
  const deps = { authenticate, repository: input.repository, allowedOrigin: input.allowedOrigin };
  return {
    review: createDebtValidationPacketReviewHttpHandler(deps),
    approval: createDebtValidationApprovalHttpHandler(deps),
  };
}

/**
 * Unmounted host checkout bridge for sandbox-only acceptance. The host must
 * inject both the new-claim callback and read-only receipt reconciliation;
 * this module supplies no Stripe, Lob, or mailing adapter. Production routing
 * remains blocked pending schema/RLS, security and release review.
 */
export function createDebtValidationHostCheckoutHandler(
  input: Omit<DebtValidationCheckoutHttpDependencies, "authenticate">,
  verifyUser: VerifyUser = requireAuthenticatedUser,
) {
  return createDebtValidationCheckoutHttpHandler({
    ...input,
    authenticate: verifiedActor(verifyUser),
  });
}

function verifiedActor(verifyUser: VerifyUser) {
  return async (request: Request): Promise<{ id: string } | null> => {
    try {
      const verified = await verifyUser(request);
      // Never trust a browser-selected owner; only a verified identity may
      // access a matter or claim a payment/mailing operation.
      return verified?.user?.id?.trim() ? { id: verified.user.id } : null;
    } catch (error) {
      if (error instanceof AuthenticationError) return null;
      throw error;
    }
  };
}
