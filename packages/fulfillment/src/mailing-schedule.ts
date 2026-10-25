export type ScheduledMailingStatus = "scheduled" | "processing" | "cancelled" | "released" | "blocked";

export interface ScheduledMailingApprovalBinding {
  orderId: string;
  approvalId?: string | null;
  packetSha256: string;
  approvedMaxTotalCents: number;
}

export interface ScheduledMailing {
  id: string;
  ownerId: string;
  sendAt: string;
  timezone: string | null;
  status: ScheduledMailingStatus;
  approval: ScheduledMailingApprovalBinding;
  createdAt: string;
  updatedAt: string;
}

export type ScheduledMailingReleaseCode =
  | "READY"
  | "SCHEDULE_NOT_ACTIVE"
  | "NOT_DUE"
  | "APPROVAL_STALE"
  | "PACKET_CHANGED"
  | "PRICE_INCREASE_REAPPROVAL"
  | "PAYMENT_NOT_READY"
  | "ADDRESS_REVIEW_REQUIRED";

export type ScheduledMailingReleaseAssessment =
  | { ready: true; code: "READY"; amountCents: number }
  | { ready: false; code: Exclude<ScheduledMailingReleaseCode, "READY">; message: string };

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function requireIsoInstant(value: string, field: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`${field} must be an ISO date-time`);
  return new Date(timestamp).toISOString();
}

function requireSha256(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) throw new Error("packetSha256 must be a SHA-256 hex digest");
  return normalized;
}

function requireCents(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${field} must be a non-negative integer`);
  return value;
}

function requireTimezone(value: string | null | undefined): string | null {
  if (value == null || !value.trim()) return null;
  const timezone = value.trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0));
  } catch {
    throw new Error("timezone must be a valid IANA time zone");
  }
  return timezone;
}

export function createScheduledMailing(input: {
  id: string;
  ownerId: string;
  sendAt: string;
  timezone?: string | null;
  approval: ScheduledMailingApprovalBinding;
  now?: string;
}): ScheduledMailing {
  const now = requireIsoInstant(input.now ?? new Date().toISOString(), "now");
  const sendAt = requireIsoInstant(input.sendAt, "sendAt");
  if (Date.parse(sendAt) <= Date.parse(now)) throw new Error("sendAt must be in the future");

  const createdAt = now;
  return {
    id: requireNonEmpty(input.id, "id"),
    ownerId: requireNonEmpty(input.ownerId, "ownerId"),
    sendAt,
    timezone: requireTimezone(input.timezone),
    status: "scheduled",
    approval: {
      orderId: requireNonEmpty(input.approval.orderId, "approval.orderId"),
      approvalId: input.approval.approvalId?.trim() || null,
      packetSha256: requireSha256(input.approval.packetSha256),
      approvedMaxTotalCents: requireCents(
        input.approval.approvedMaxTotalCents,
        "approval.approvedMaxTotalCents",
      ),
    },
    createdAt,
    updatedAt: createdAt,
  };
}

export function cancelScheduledMailing(
  schedule: ScheduledMailing,
  cancelledAt: string,
): ScheduledMailing {
  if (schedule.status !== "scheduled") throw new Error("Only an active scheduled mailing can be cancelled");
  return {
    ...schedule,
    status: "cancelled",
    updatedAt: requireIsoInstant(cancelledAt, "cancelledAt"),
  };
}

export function assessScheduledMailingRelease(input: {
  schedule: ScheduledMailing;
  now: string;
  currentPacketSha256: string;
  currentTotalCents: number;
  approvalCurrent: boolean;
  paymentReady: boolean;
  addressesVerified: boolean;
}): ScheduledMailingReleaseAssessment {
  const now = requireIsoInstant(input.now, "now");
  const currentPacketSha256 = requireSha256(input.currentPacketSha256);
  const currentTotalCents = requireCents(input.currentTotalCents, "currentTotalCents");

  if (input.schedule.status !== "scheduled" && input.schedule.status !== "processing") {
    return { ready: false, code: "SCHEDULE_NOT_ACTIVE", message: "The scheduled mailing is no longer active." };
  }
  if (Date.parse(now) < Date.parse(input.schedule.sendAt)) {
    return { ready: false, code: "NOT_DUE", message: "The scheduled send time has not arrived." };
  }
  if (!input.approvalCurrent) {
    return { ready: false, code: "APPROVAL_STALE", message: "The mailing approval is no longer current." };
  }
  if (currentPacketSha256 !== input.schedule.approval.packetSha256) {
    return { ready: false, code: "PACKET_CHANGED", message: "The exact approved packet changed after scheduling." };
  }
  if (currentTotalCents > input.schedule.approval.approvedMaxTotalCents) {
    return {
      ready: false,
      code: "PRICE_INCREASE_REAPPROVAL",
      message: "The current price is higher than the amount the user approved.",
    };
  }
  if (!input.addressesVerified) {
    return {
      ready: false,
      code: "ADDRESS_REVIEW_REQUIRED",
      message: "Postal address review must be current before scheduled release.",
    };
  }
  if (!input.paymentReady) {
    return {
      ready: false,
      code: "PAYMENT_NOT_READY",
      message: "No approved payment method is ready for this scheduled mailing.",
    };
  }
  return { ready: true, code: "READY", amountCents: currentTotalCents };
}
