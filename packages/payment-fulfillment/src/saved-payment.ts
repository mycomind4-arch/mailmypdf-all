export interface SavedPaymentMethod {
  provider: "stripe";
  customerRef: string;
  paymentMethodRef: string;
  brand: string;
  last4: string;
  ready: boolean;
  updatedAt: string;
}

export interface PublicSavedPaymentSummary {
  ready: boolean;
  display: string | null;
  brand: string | null;
  last4: string | null;
}

export type SavedPaymentChargeCode =
  | "READY"
  | "USER_AUTHORIZATION_REQUIRED"
  | "PAYMENT_NOT_READY"
  | "APPROVAL_STALE"
  | "PACKET_CHANGED"
  | "PRICE_INCREASE_REAPPROVAL";

export type SavedPaymentChargeAssessment =
  | { ready: true; code: "READY"; amountCents: number }
  | { ready: false; code: Exclude<SavedPaymentChargeCode, "READY">; message: string };

export interface SavedPaymentGateway {
  charge(input: {
    customerRef: string;
    paymentMethodRef: string;
    amountCents: number;
    currency: "usd";
    idempotencyKey: string;
    metadata: Readonly<Record<string, string>>;
  }): Promise<{ paymentIntentId: string; status: string }>;
}

function cents(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${field} must be a non-negative integer`);
  return value;
}

function hash(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) throw new Error("packet SHA-256 is invalid");
  return normalized;
}

function nonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

export function toPublicSavedPaymentSummary(
  method: SavedPaymentMethod | null,
): PublicSavedPaymentSummary {
  if (!method || !method.ready) {
    return { ready: false, display: null, brand: null, last4: null };
  }
  const brand = method.brand.trim() || "Card";
  const last4 = /^\d{4}$/.test(method.last4) ? method.last4 : null;
  return {
    ready: Boolean(last4),
    display: last4 ? `${brand} •••• ${last4}` : null,
    brand: last4 ? brand : null,
    last4,
  };
}

export function assessSavedPaymentCharge(input: {
  method: SavedPaymentMethod | null;
  userAuthorizedCharge: boolean;
  approvalCurrent: boolean;
  approvedPacketSha256: string;
  currentPacketSha256: string;
  approvedMaxTotalCents: number;
  currentTotalCents: number;
}): SavedPaymentChargeAssessment {
  const approvedHash = hash(input.approvedPacketSha256);
  const currentHash = hash(input.currentPacketSha256);
  const approvedMaxTotalCents = cents(input.approvedMaxTotalCents, "approvedMaxTotalCents");
  const currentTotalCents = cents(input.currentTotalCents, "currentTotalCents");

  if (!input.userAuthorizedCharge) {
    return {
      ready: false,
      code: "USER_AUTHORIZATION_REQUIRED",
      message: "An explicit user authorization is required before charging the saved payment method.",
    };
  }
  if (!input.method?.ready || !toPublicSavedPaymentSummary(input.method).ready) {
    return { ready: false, code: "PAYMENT_NOT_READY", message: "No usable saved payment method is available." };
  }
  if (!input.approvalCurrent) {
    return { ready: false, code: "APPROVAL_STALE", message: "The mailing approval is no longer current." };
  }
  if (approvedHash !== currentHash) {
    return { ready: false, code: "PACKET_CHANGED", message: "The exact approved packet changed before payment." };
  }
  if (currentTotalCents > approvedMaxTotalCents) {
    return {
      ready: false,
      code: "PRICE_INCREASE_REAPPROVAL",
      message: "The current total exceeds the amount the user approved.",
    };
  }
  return { ready: true, code: "READY", amountCents: currentTotalCents };
}

export async function chargeApprovedSavedPayment(input: {
  method: SavedPaymentMethod;
  userAuthorizedCharge: boolean;
  approvalCurrent: boolean;
  approvedPacketSha256: string;
  currentPacketSha256: string;
  approvedMaxTotalCents: number;
  currentTotalCents: number;
  orderId: string;
  approvalId: string;
  idempotencyKey: string;
  gateway: SavedPaymentGateway;
}) {
  const assessment = assessSavedPaymentCharge(input);
  if (!assessment.ready) {
    const error = new Error(assessment.message);
    error.name = assessment.code;
    throw error;
  }

  return input.gateway.charge({
    customerRef: nonEmpty(input.method.customerRef, "customerRef"),
    paymentMethodRef: nonEmpty(input.method.paymentMethodRef, "paymentMethodRef"),
    amountCents: assessment.amountCents,
    currency: "usd",
    idempotencyKey: nonEmpty(input.idempotencyKey, "idempotencyKey"),
    metadata: {
      orderId: nonEmpty(input.orderId, "orderId"),
      approvalId: nonEmpty(input.approvalId, "approvalId"),
      packetSha256: hash(input.currentPacketSha256),
    },
  });
}
