import { expect, it } from "vitest";
import {
  canGenerateFinalDraft,
  canRevealFinalDocument,
  canSubmitForMailing,
  nextPaymentGateStatus,
} from "../../src/domain/payment-gate";

it("never reveals a final document before payment unlocks drafting", () => {
  expect(canGenerateFinalDraft("checkout_open")).toBe(false);
  expect(canRevealFinalDocument("checkout_open")).toBe(false);
  expect(canRevealFinalDocument("paid")).toBe(false);
  expect(canRevealFinalDocument("draft_ready")).toBe(true);
});

it("requires a separate explicit approval before mailing", () => {
  expect(canSubmitForMailing("paid")).toBe(false);
  expect(canSubmitForMailing("draft_ready")).toBe(false);
  expect(canSubmitForMailing("approved")).toBe(true);
  expect(nextPaymentGateStatus("paid", "mail_submitted")).toBeNull();
  expect(nextPaymentGateStatus("draft_ready", "customer_approved")).toBe("approved");
});

it("does not revive expired or refunded purchases", () => {
  expect(nextPaymentGateStatus("expired", "payment_confirmed")).toBeNull();
  expect(nextPaymentGateStatus("refunded", "draft_generated")).toBeNull();
});
