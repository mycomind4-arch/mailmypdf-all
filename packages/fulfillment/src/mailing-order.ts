import type { CanonicalMailingStatus, MailingClass, PostalAddress } from "./index.js";

export interface MailingOrderDraft {
  workflowId: string;
  matterId: string;
  documentId: string;
  recipient: PostalAddress;
  mailingClass: MailingClass;
  paymentId?: string;
  providerOrderId?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface MailingOrderState {
  draft: MailingOrderDraft;
  status: CanonicalMailingStatus;
  trackingNumber?: string;
  providerOrderId?: string;
  updatedAt: string;
}

export function validateMailingOrderDraft(draft: MailingOrderDraft): void {
  for (const [name, value] of [
    ["workflowId", draft.workflowId],
    ["matterId", draft.matterId],
    ["documentId", draft.documentId],
    ["idempotencyKey", draft.idempotencyKey],
  ] as const) {
    if (!value.trim()) throw new Error(`Mailing order requires ${name}`);
  }
  for (const field of ["name", "line1", "city", "state", "postal"] as const) {
    if (!String(draft.recipient[field] ?? "").trim()) throw new Error(`Mailing recipient is missing ${field}`);
  }
  const country = (draft.recipient.country ?? "US").toUpperCase();
  if (country === "US") {
    if (!/^\d{5}(?:-\d{4})?$/.test(draft.recipient.postal.trim())) {
      throw new Error("US mailing recipient requires a valid ZIP or ZIP+4");
    }
    if (!/^[A-Za-z]{2}$/.test(draft.recipient.state.trim())) {
      throw new Error("US mailing recipient requires a 2-letter state abbreviation");
    }
  }
}

export function createMailingOrderDraft(input: MailingOrderDraft): MailingOrderDraft {
  validateMailingOrderDraft(input);
  return {
    ...input,
    recipient: { ...input.recipient },
    metadata: input.metadata ? { ...input.metadata } : undefined,
  };
}

const TRANSITIONS: Readonly<Record<CanonicalMailingStatus, readonly CanonicalMailingStatus[]>> = {
  draft: ["paid", "submitted", "cancelled"],
  paid: ["submitted", "cancelled", "refunded"],
  submitted: ["provider_processing", "mailed", "failed", "cancelled", "refunded"],
  provider_processing: ["mailed", "failed", "cancelled"],
  mailed: ["in_transit", "delivered", "returned", "undeliverable", "refused", "failed"],
  in_transit: ["delivered", "returned", "undeliverable", "refused", "failed"],
  delivered: [],
  returned: [],
  undeliverable: [],
  refused: [],
  failed: [],
  cancelled: ["refunded"],
  refunded: [],
};

export function createMailingOrderState(draft: MailingOrderDraft, now = new Date().toISOString()): MailingOrderState {
  return { draft: createMailingOrderDraft(draft), status: "draft", updatedAt: now };
}

export function advanceMailingOrder(
  state: MailingOrderState,
  update: {
    status: CanonicalMailingStatus;
    providerOrderId?: string;
    trackingNumber?: string;
    updatedAt?: string;
  },
): MailingOrderState {
  if (state.status !== update.status && !TRANSITIONS[state.status].includes(update.status)) {
    throw new Error(`Invalid mailing order transition: ${state.status} -> ${update.status}`);
  }
  const providerOrderId = update.providerOrderId ?? state.providerOrderId ?? state.draft.providerOrderId;
  if (["submitted", "provider_processing", "mailed", "in_transit", "delivered"].includes(update.status) && !providerOrderId) {
    throw new Error(`${update.status} mailing order requires providerOrderId`);
  }
  return {
    ...state,
    status: update.status,
    ...(providerOrderId ? { providerOrderId } : {}),
    ...(update.trackingNumber ? { trackingNumber: update.trackingNumber } : {}),
    updatedAt: update.updatedAt ?? new Date().toISOString(),
  };
}
