export interface CheckoutMailingAddress {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal: string;
}

export interface ApprovedPacketForCheckout {
  approvalId: string;
  matterId: string;
  workflowId: string;
  verticalId: string;
  packetSha256: string;
  bytes: Uint8Array;
  responsePages: number;
  supportingPages: number;
  totalCents: number;
  mailClass: "standard" | "certified" | "registered";
  recipient: CheckoutMailingAddress;
}

export interface ApprovalBoundOrder {
  id: string;
  approvalId: string;
  matterId: string;
  lookupToken: string;
  stripeSessionId: string | null;
  status: string;
  priceCents: number;
  approvedPacketSha256: string;
  approvedPriceCents: number;
}

export interface ApprovalOrderStore {
  loadByApproval(approvalId: string): Promise<ApprovalBoundOrder | null>;
  loadById(orderId: string): Promise<ApprovalBoundOrder | null>;
  create(input: {
    orderId: string;
    lookupToken: string;
    ownerId: string;
    email: string;
    sender: CheckoutMailingAddress;
    packet: ApprovedPacketForCheckout;
    filename: string;
    pageCount: number;
    storagePath: string;
  }): Promise<{ order: ApprovalBoundOrder } | { conflict: true }>;
  claimStripeSession(input: {
    orderId: string;
    expectedStatus: "draft";
    expectedSessionId: null;
    sessionId: string;
  }): Promise<boolean>;
  releaseStripeSession(input: {
    orderId: string;
    expectedStatus: "draft";
    expectedSessionId: string;
  }): Promise<boolean>;
  recordEvents?(events: readonly {
    orderId: string;
    type: string;
    label: string;
    metadata: Record<string, unknown>;
  }[]): Promise<void>;
}

export interface ApprovalPacketVault {
  validatePdf(bytes: Uint8Array): Promise<{ pageCount: number }>;
  upload(input: { orderId: string; filename: string; bytes: Uint8Array }): Promise<{ storagePath: string }>;
  remove(storagePath: string): Promise<void>;
}

export interface CheckoutSession {
  id: string;
  status: "open" | "complete" | "expired" | string;
  url: string | null;
}

export interface StripeCheckoutGateway {
  retrieve(sessionId: string): Promise<CheckoutSession>;
  create(input: {
    email: string;
    successUrl: string;
    cancelUrl: string;
    totalCents: number;
    productName: string;
    description: string;
    metadata: Record<string, string>;
    idempotencyKey: string;
  }): Promise<CheckoutSession>;
  expire(sessionId: string): Promise<void>;
}

export class ApprovalCheckoutError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "ApprovalCheckoutError";
  }
}

function assertPacketIdentity(order: ApprovalBoundOrder, packet: ApprovedPacketForCheckout): void {
  if (
    order.approvalId !== packet.approvalId ||
    order.matterId !== packet.matterId ||
    order.approvedPacketSha256 !== packet.packetSha256 ||
    order.approvedPriceCents !== packet.totalCents ||
    order.priceCents !== packet.totalCents
  ) {
    throw new ApprovalCheckoutError(
      "Existing order does not match the immutable approved packet.",
      "ORDER_APPROVAL_MISMATCH",
    );
  }
}

function assertPacketMetadata(packet: ApprovedPacketForCheckout): void {
  if (!/^[0-9a-f]{64}$/i.test(packet.packetSha256)) {
    throw new ApprovalCheckoutError("Approved packet hash is invalid.", "APPROVED_PACKET_HASH_INVALID");
  }
  if (!Number.isSafeInteger(packet.responsePages) || packet.responsePages < 1 ||
      !Number.isSafeInteger(packet.supportingPages) || packet.supportingPages < 0) {
    throw new ApprovalCheckoutError("Approved packet page counts are invalid.", "APPROVED_PAGE_COUNT_INVALID");
  }
  if (!Number.isSafeInteger(packet.totalCents) || packet.totalCents < 0) {
    throw new ApprovalCheckoutError("Approved packet price is invalid.", "APPROVED_PRICE_INVALID");
  }
}

async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const copy = Uint8Array.from(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", copy);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

function randomToken(bytes = 24): string {
  const data = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(data);
  return Array.from(data, (value) => value.toString(16).padStart(2, "0")).join("");
}

/**
 * Creates exactly one order for one immutable approval. The exact PDF is
 * re-hashed, parsed and recounted before storage. A concurrent unique-conflict
 * winner is reloaded and revalidated instead of creating a second order.
 */
export async function createOrLoadApprovalOrder(input: {
  packet: ApprovedPacketForCheckout;
  ownerId: string;
  email: string;
  sender: CheckoutMailingAddress;
  store: ApprovalOrderStore;
  vault: ApprovalPacketVault;
  id?: () => string;
  token?: () => string;
  hashBytes?: (bytes: Uint8Array) => Promise<string>;
}): Promise<ApprovalBoundOrder> {
  assertPacketMetadata(input.packet);

  const existing = await input.store.loadByApproval(input.packet.approvalId);
  if (existing) {
    assertPacketIdentity(existing, input.packet);
    return existing;
  }

  const actualHash = await (input.hashBytes ?? sha256Bytes)(input.packet.bytes);
  if (actualHash.toLowerCase() !== input.packet.packetSha256.toLowerCase()) {
    throw new ApprovalCheckoutError(
      "Approved packet bytes changed before order creation.",
      "APPROVED_PACKET_CHANGED",
    );
  }

  const validated = await input.vault.validatePdf(input.packet.bytes);
  const expectedPages = input.packet.responsePages + input.packet.supportingPages;
  if (!Number.isSafeInteger(validated.pageCount) || validated.pageCount !== expectedPages) {
    throw new ApprovalCheckoutError(
      "Approved packet page count changed before order creation.",
      "APPROVED_PAGE_COUNT_CHANGED",
    );
  }

  const orderId = (input.id ?? (() => globalThis.crypto.randomUUID()))();
  const lookupToken = (input.token ?? randomToken)();
  const filename = `${input.packet.workflowId}-${input.packet.matterId.slice(0, 8)}.pdf`;
  const uploaded = await input.vault.upload({ orderId, filename, bytes: input.packet.bytes });

  let created: { order: ApprovalBoundOrder } | { conflict: true };
  try {
    created = await input.store.create({
      orderId,
      lookupToken,
      ownerId: input.ownerId,
      email: input.email,
      sender: input.sender,
      packet: input.packet,
      filename,
      pageCount: validated.pageCount,
      storagePath: uploaded.storagePath,
    });
  } catch (error) {
    await input.vault.remove(uploaded.storagePath).catch(() => undefined);
    throw error;
  }

  if ("conflict" in created) {
    await input.vault.remove(uploaded.storagePath).catch(() => undefined);
    const raced = await input.store.loadByApproval(input.packet.approvalId);
    if (!raced) {
      throw new ApprovalCheckoutError(
        "Concurrent order creation could not be reconciled.",
        "ORDER_RACE_UNRESOLVED",
      );
    }
    assertPacketIdentity(raced, input.packet);
    return raced;
  }

  // From this point onward the order owns the uploaded packet. A secondary
  // event/audit failure must not orphan the persisted order by deleting bytes.
  assertPacketIdentity(created.order, input.packet);
  await input.store.recordEvents?.([
    {
      orderId: created.order.id,
      type: "order.created",
      label: "Approved workflow packet prepared for checkout",
      metadata: {
        workflowMatterId: input.packet.matterId,
        approvalId: input.packet.approvalId,
        packetSha256: input.packet.packetSha256,
      },
    },
    {
      orderId: created.order.id,
      type: "workflow.packet_bound",
      label: "Order bound to immutable approved packet",
      metadata: {
        packetSha256: input.packet.packetSha256,
        totalCents: input.packet.totalCents,
      },
    },
  ]);
  return created.order;
}

/**
 * Reuses an open Stripe session, releases expired sessions with compare-and-set,
 * and binds a newly-created idempotent session to the order with a second CAS.
 * A losing concurrent session is expired immediately.
 */
export async function ensureApprovalCheckoutSession(input: {
  order: ApprovalBoundOrder;
  approvalId: string;
  matterId: string;
  workflowId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
  store: ApprovalOrderStore;
  stripe: StripeCheckoutGateway;
  productName?: string;
}): Promise<{ checkoutUrl: string | null; sessionId: string | null }> {
  let order = input.order;

  if (order.approvalId !== input.approvalId || order.matterId !== input.matterId) {
    throw new ApprovalCheckoutError("Checkout identity does not match the order approval.", "CHECKOUT_APPROVAL_MISMATCH");
  }

  if (order.stripeSessionId) {
    const priorSessionId = order.stripeSessionId;
    const existing = await input.stripe.retrieve(priorSessionId);
    if (existing.status === "open" && existing.url) {
      return { checkoutUrl: existing.url, sessionId: existing.id };
    }
    if (existing.status === "complete") {
      return { checkoutUrl: null, sessionId: existing.id };
    }

    const released = await input.store.releaseStripeSession({
      orderId: order.id,
      expectedStatus: "draft",
      expectedSessionId: priorSessionId,
    });
    if (!released) {
      const current = await input.store.loadById(order.id);
      if (!current || current.status !== "draft") {
        return { checkoutUrl: null, sessionId: current?.stripeSessionId ?? priorSessionId };
      }
      if (current.stripeSessionId) {
        const winner = await input.stripe.retrieve(current.stripeSessionId);
        if (winner.status === "open" && winner.url) {
          return { checkoutUrl: winner.url, sessionId: winner.id };
        }
      }
      throw new ApprovalCheckoutError(
        "Unable to release the expired checkout session.",
        "CHECKOUT_SESSION_RELEASE_FAILED",
      );
    }
    order = { ...order, stripeSessionId: null };
  }

  if (order.status !== "draft") {
    return { checkoutUrl: null, sessionId: order.stripeSessionId };
  }

  const session = await input.stripe.create({
    email: input.email,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    totalCents: order.priceCents,
    productName: input.productName ?? "MailMyPDF approved response packet",
    description: `${input.workflowId} · approved packet`,
    metadata: {
      orderId: order.id,
      workflowMatterId: input.matterId,
      approvalId: input.approvalId,
    },
    idempotencyKey: `workflow_checkout_${input.approvalId}`,
  });

  const claimed = await input.store.claimStripeSession({
    orderId: order.id,
    expectedStatus: "draft",
    expectedSessionId: null,
    sessionId: session.id,
  });
  if (claimed) return { checkoutUrl: session.url, sessionId: session.id };

  const winner = await input.store.loadById(order.id);
  if (winner?.stripeSessionId === session.id && winner.status === "draft") {
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  await input.stripe.expire(session.id).catch(() => undefined);
  if (winner?.stripeSessionId) {
    const existing = await input.stripe.retrieve(winner.stripeSessionId);
    return {
      checkoutUrl: existing.status === "open" ? existing.url : null,
      sessionId: existing.id,
    };
  }

  throw new ApprovalCheckoutError(
    "Checkout session could not be bound to the approved order.",
    "CHECKOUT_SESSION_BIND_FAILED",
  );
}
