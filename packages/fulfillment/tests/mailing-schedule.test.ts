import assert from "node:assert/strict";
import test from "node:test";
import {
  assessScheduledMailingRelease,
  cancelScheduledMailing,
  createScheduledMailing,
} from "../src/mailing-schedule.js";

const hash = "a".repeat(64);
const base = () => createScheduledMailing({
  id: "schedule-1",
  ownerId: "user-1",
  sendAt: "2026-10-15T16:00:00.000Z",
  timezone: "America/Los_Angeles",
  now: "2026-09-28T02:00:00.000Z",
  approval: {
    orderId: "order-1",
    approvalId: "approval-1",
    packetSha256: hash,
    approvedMaxTotalCents: 1200,
  },
});

test("scheduled mailing binds future time and immutable approved ceiling", () => {
  const schedule = base();
  assert.equal(schedule.status, "scheduled");
  assert.equal(schedule.approval.packetSha256, hash);
  assert.equal(schedule.approval.approvedMaxTotalCents, 1200);
  assert.equal(schedule.timezone, "America/Los_Angeles");
});

test("release permits an equal or lower current price after all gates remain current", () => {
  const common = {
    schedule: base(),
    now: "2026-10-15T16:00:01.000Z",
    currentPacketSha256: hash,
    approvalCurrent: true,
    paymentReady: true,
    addressesVerified: true,
  };
  assert.deepEqual(
    assessScheduledMailingRelease({ ...common, currentTotalCents: 1200 }),
    { ready: true, code: "READY", amountCents: 1200 },
  );
  assert.deepEqual(
    assessScheduledMailingRelease({ ...common, currentTotalCents: 999 }),
    { ready: true, code: "READY", amountCents: 999 },
  );
});

test("release fails closed for price increase or changed packet", () => {
  const schedule = base();
  const common = {
    schedule,
    now: "2026-10-15T16:00:01.000Z",
    approvalCurrent: true,
    paymentReady: true,
    addressesVerified: true,
  };
  assert.equal(
    assessScheduledMailingRelease({
      ...common,
      currentPacketSha256: hash,
      currentTotalCents: 1201,
    }).code,
    "PRICE_INCREASE_REAPPROVAL",
  );
  assert.equal(
    assessScheduledMailingRelease({
      ...common,
      currentPacketSha256: "b".repeat(64),
      currentTotalCents: 1200,
    }).code,
    "PACKET_CHANGED",
  );
});

test("release blocks before due time and when payment/address/approval gates are stale", () => {
  const schedule = base();
  const common = {
    schedule,
    currentPacketSha256: hash,
    currentTotalCents: 1200,
    approvalCurrent: true,
    paymentReady: true,
    addressesVerified: true,
  };
  assert.equal(assessScheduledMailingRelease({
    ...common,
    now: "2026-10-15T15:59:59.000Z",
  }).code, "NOT_DUE");
  assert.equal(assessScheduledMailingRelease({
    ...common,
    now: "2026-10-15T16:00:01.000Z",
    paymentReady: false,
  }).code, "PAYMENT_NOT_READY");
  assert.equal(assessScheduledMailingRelease({
    ...common,
    now: "2026-10-15T16:00:01.000Z",
    addressesVerified: false,
  }).code, "ADDRESS_REVIEW_REQUIRED");
  assert.equal(assessScheduledMailingRelease({
    ...common,
    now: "2026-10-15T16:00:01.000Z",
    approvalCurrent: false,
  }).code, "APPROVAL_STALE");
});

test("cancel is explicit and prevents later release", () => {
  const cancelled = cancelScheduledMailing(base(), "2026-10-01T00:00:00.000Z");
  assert.equal(cancelled.status, "cancelled");
  assert.equal(assessScheduledMailingRelease({
    schedule: cancelled,
    now: "2026-10-15T16:00:01.000Z",
    currentPacketSha256: hash,
    currentTotalCents: 1200,
    approvalCurrent: true,
    paymentReady: true,
    addressesVerified: true,
  }).code, "SCHEDULE_NOT_ACTIVE");
});
