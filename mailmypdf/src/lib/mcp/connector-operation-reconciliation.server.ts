import { timingSafeEqual } from "node:crypto";
import {
  reconcileStaleConnectorOperations,
  requireReviewForStaleConnectorOperation,
  type ConnectorOperationReconciliationRepository,
} from "@mailmypdf/workflows/connector-operation-reconciliation";
import {
  listStaleRunningConnectorOperations,
  saveConnectorOperationIfRevision,
} from "./connector-operations.server";
import { createStripeClient } from "@/lib/stripe.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ConnectorOperation } from "@mailmypdf/workflows/connector-operation";

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_STALE_MINUTES = 15;

type CheckoutReceiptCandidate = {
  id: string;
  workflow_case_id: string | null;
  case_approval_id: string | null;
  approved_packet_sha256: string | null;
  approved_price_cents: number | null;
  stripe_session_id: string | null;
};

type CheckoutSessionReceipt = {
  id: string;
  status: string | null;
  url: string | null;
  amount_total: number | null;
  metadata: Record<string, string> | null;
};

const CHECKOUT_REVIEW_ACTION =
  "MailMyPDF found an interrupted checkout whose receipt was missing or ambiguous. Check the matter and order status before preparing another checkout; do not repeat the action automatically.";

function configuredSecret(): string {
  const value = process.env.MAILMYPDF_CONNECTOR_JOB_SECRET;
  if (!value || value.length < 32) {
    throw new Error("MAILMYPDF_CONNECTOR_JOB_SECRET must contain at least 32 characters");
  }
  return value;
}

function equalSecret(candidate: string, expected: string): boolean {
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return candidateBytes.length === expectedBytes.length &&
    timingSafeEqual(candidateBytes, expectedBytes);
}

export function requireConnectorReconciliationAuthorization(request: Request): void {
  const authorization = request.headers.get("authorization");
  const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!supplied || !equalSecret(supplied, configuredSecret())) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

function batchSize(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error("Connector reconciliation batch size must be between 1 and 100");
  }
  return value;
}

function staleMinutes(value: number): number {
  if (!Number.isInteger(value) || value < 5 || value > 1_440) {
    throw new Error("Connector reconciliation stale window must be between 5 and 1440 minutes");
  }
  return value;
}

const repository: ConnectorOperationReconciliationRepository = {
  listStaleRunning: listStaleRunningConnectorOperations,
  saveIfRevision(operation, expectedRevision) {
    return saveConnectorOperationIfRevision(operation, expectedRevision, "running");
  },
};

export function createConnectorReceiptResolver(deps: {
  findCheckoutCandidates(operation: ConnectorOperation): Promise<readonly CheckoutReceiptCandidate[]>;
  retrieveCheckoutSession(sessionId: string): Promise<CheckoutSessionReceipt>;
}) {
  return async function resolveConnectorReceipt(operation: ConnectorOperation) {
    if (operation.kind !== "prepare_checkout") {
      return requireReviewForStaleConnectorOperation(operation);
    }

    const candidates = await deps.findCheckoutCandidates(operation);
    if (candidates.length !== 1) {
      return { outcome: "requires_review" as const, requiredAction: CHECKOUT_REVIEW_ACTION };
    }

    const order = candidates[0]!;
    if (
      order.workflow_case_id !== operation.matterId ||
      !order.case_approval_id ||
      !order.stripe_session_id ||
      !order.approved_packet_sha256 ||
      !Number.isSafeInteger(order.approved_price_cents) ||
      order.approved_price_cents! < 0
    ) {
      return { outcome: "requires_review" as const, requiredAction: CHECKOUT_REVIEW_ACTION };
    }

    const session = await deps.retrieveCheckoutSession(order.stripe_session_id);
    const receiptMatches =
      session.id === order.stripe_session_id &&
      session.metadata?.orderId === order.id &&
      session.metadata?.workflowCaseId === operation.matterId &&
      session.metadata?.caseApprovalId === order.case_approval_id &&
      session.metadata?.connectorOperationId === operation.id &&
      session.metadata?.connectorRequestSha256 === operation.requestSha256 &&
      session.amount_total === order.approved_price_cents;

    if (
      !receiptMatches ||
      (session.status !== "open" && session.status !== "complete") ||
      (session.status === "open" && !session.url)
    ) {
      return { outcome: "requires_review" as const, requiredAction: CHECKOUT_REVIEW_ACTION };
    }

    return {
      outcome: "confirmed_succeeded" as const,
      result: {
        checkoutUrl: session.status === "open" ? session.url : null,
        orderId: order.id,
        packetSha256: order.approved_packet_sha256,
        totalCents: order.approved_price_cents,
      },
    };
  };
}

const resolveConnectorReceipt = createConnectorReceiptResolver({
  async findCheckoutCandidates(operation) {
    const lowerBound = new Date(Date.parse(operation.createdAt) - 1_000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("id,workflow_case_id,case_approval_id,approved_packet_sha256,approved_price_cents,stripe_session_id")
      .eq("workflow_case_id", operation.matterId)
      .filter("vertical_metadata->>owner_user_id", "eq", operation.ownerId)
      // An order can predate a retried checkout operation. The checkout claim
      // updates the row, so use the receipt-bearing mutation time, not creation.
      .gte("updated_at", lowerBound)
      .order("updated_at", { ascending: false })
      .limit(2);
    if (error) throw new Error("Unable to read checkout receipt candidates.");
    return data ?? [];
  },
  async retrieveCheckoutSession(sessionId) {
    const session = await createStripeClient().checkout.sessions.retrieve(sessionId);
    return {
      id: session.id,
      status: session.status,
      url: session.url,
      amount_total: session.amount_total,
      metadata: session.metadata,
    };
  },
});

export async function reconcileInterruptedConnectorOperations(input: {
  limit?: number;
  staleAfterMinutes?: number;
  now?: Date;
} = {}) {
  const limit = batchSize(input.limit ?? DEFAULT_BATCH_SIZE);
  const staleAfterMinutes = staleMinutes(
    input.staleAfterMinutes ?? DEFAULT_STALE_MINUTES,
  );
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Connector reconciliation time is invalid");
  const updatedBefore = new Date(now.getTime() - staleAfterMinutes * 60_000);

  return reconcileStaleConnectorOperations({
    repository,
    resolve: resolveConnectorReceipt,
    updatedBefore: updatedBefore.toISOString(),
    limit,
    now: now.toISOString(),
  });
}
