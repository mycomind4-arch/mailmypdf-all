import { test } from "node:test";
import assert from "node:assert/strict";
import { mailingStatus } from "../../packages/workflow-ui/src/mailing-status";
import {
  createLatestRequest,
  reviewForBasis,
  validMailAddress,
  validMailEmail,
} from "../src/lib/mail-review";
import { approvedMailPriceMatches } from "../src/lib/approved-mail-price";
import { literalEmailPattern } from "../src/lib/email-pattern";

test("account email matching cannot treat underscores or percent signs as wildcards", () => {
  assert.equal(literalEmailPattern("test_user%tag@example.com"), "test\\_user\\%tag@example.com");
  assert.equal(literalEmailPattern("person@example.com"), "person@example.com");
});

test("the approved amount must match checkout, including discounts and zero totals", () => {
  assert.equal(approvedMailPriceMatches(499, 499), true);
  assert.equal(approvedMailPriceMatches(0, 0), true);
  assert.equal(approvedMailPriceMatches(499, 699), false);
  assert.equal(approvedMailPriceMatches(499, 0), false);
  assert.equal(approvedMailPriceMatches(499, null), false);
});

test("unpaid, failed, cancelled and unknown orders never imply mailing success", () => {
  for (const status of [
    "draft",
    "checkout_created",
    "failed_payment",
    "failed",
    "failed_fulfillment",
    "failed_provider_submission",
    "cancelled",
    "refunded",
    "returned",
    "future_status",
    "constructor",
  ]) {
    const view = mailingStatus(status);
    assert.equal(view.inTransit, false, status);
    assert.ok(view.message.length > 10, status);
  }
});

test("only authoritative paid/fulfillment states confirm payment", () => {
  for (const status of [
    "draft",
    "checkout_created",
    "failed_payment",
    "failed",
    "cancelled",
    "unknown",
  ]) {
    assert.equal(mailingStatus(status).paymentConfirmed, false, status);
  }
  for (const status of [
    "paid",
    "paid_pending_manual_fulfillment",
    "manual_fulfillment_in_progress",
    "submitted_to_provider",
    "provider_processing",
    "mailed",
    "in_transit",
    "delivered",
    "returned",
    "refunded",
  ]) {
    assert.equal(mailingStatus(status).paymentConfirmed, true, status);
  }
  assert.match(mailingStatus("delivered").message, /read/i);
});

test("only unpaid checkout states poll while awaiting payment confirmation", () => {
  assert.equal(mailingStatus("checkout_created").awaitingPayment, true);
  assert.equal(mailingStatus("draft").awaitingPayment, true);
  assert.equal(mailingStatus("failed_payment").awaitingPayment, false);
  assert.equal(mailingStatus("cancelled").awaitingPayment, false);
});

test("replacement or cancelled validation cannot restore stale upload results", () => {
  const requests = createLatestRequest();
  const first = requests.begin();
  const second = requests.begin();
  assert.equal(requests.isCurrent(first), false);
  assert.equal(requests.isCurrent(second), true);
  requests.cancel();
  assert.equal(requests.isCurrent(second), false);
});

test("changing review inputs clears both approvals, including changing back", () => {
  const approved = { basis: "document A", reviewed: true, content: true };
  assert.equal(reviewForBasis(approved, "document A"), approved);
  const changed = reviewForBasis(approved, "document B");
  assert.deepEqual(changed, { basis: "document B", reviewed: false, content: false });
  assert.deepEqual(reviewForBasis(changed, "document A"), {
    basis: "document A",
    reviewed: false,
    content: false,
  });
});

test("address checks reject blanks and bad formats without claiming postal verification", () => {
  const address = {
    name: "Example",
    line1: "123 Example St",
    city: "Example",
    state: "CA",
    postalCode: "94105",
  };
  assert.equal(validMailAddress(address), true);
  assert.equal(validMailAddress({ ...address, name: "   " }), false);
  assert.equal(validMailAddress({ ...address, state: "1" }), false);
  assert.equal(validMailAddress({ ...address, postalCode: "abc" }), false);
  assert.equal(validMailEmail("not-an-email"), false);
  assert.equal(validMailEmail("preview@example.com"), true);
});
