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
  createDebtValidationPacketReviewHttpHandler,
} from "./debt-validation-approval-http.server";
import type { DebtValidationMatterRepository } from "../../../../dispute-mail/workflows/debt-validation/server-matter-approval";

type VerifiedUser = { user: { id: string } };
type VerifyUser = (request: Request) => Promise<VerifiedUser>;

export function createDebtValidationHostReviewAndApprovalHandlers(
  input: { repository: DebtValidationMatterRepository; allowedOrigin: string },
  // Injectable only by trusted server code, for deterministic offline tests.
  verifyUser: VerifyUser = requireAuthenticatedUser,
) {
  const authenticate = async (request: Request): Promise<{ id: string } | null> => {
    try {
      const verified = await verifyUser(request);
      // Owner identity must come from verified auth, never from request JSON,
      // query parameters, a user-supplied header, or a shared module variable.
      return verified?.user?.id?.trim() ? { id: verified.user.id } : null;
    } catch (error) {
      if (error instanceof AuthenticationError) return null;
      // The underlying HTTP boundary fails closed and does not leak errors.
      throw error;
    }
  };
  const deps = { authenticate, repository: input.repository, allowedOrigin: input.allowedOrigin };
  return {
    review: createDebtValidationPacketReviewHttpHandler(deps),
    approval: createDebtValidationApprovalHttpHandler(deps),
  };
}
