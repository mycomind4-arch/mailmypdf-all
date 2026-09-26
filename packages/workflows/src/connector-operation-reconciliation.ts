import {
  transitionConnectorOperation,
  type ConnectorOperation,
  type ConnectorOperationError,
} from "./connector-operation.js";

export type ConnectorOperationReconciliationDecision<TResult = unknown> =
  | { outcome: "confirmed_succeeded"; result: TResult }
  | { outcome: "confirmed_failed"; error: ConnectorOperationError }
  | { outcome: "requires_review"; requiredAction: string };

export type ConnectorOperationReconciliationResolver = (
  operation: ConnectorOperation,
) => Promise<ConnectorOperationReconciliationDecision>;

export interface ConnectorOperationReconciliationRepository {
  listStaleRunning(input: {
    updatedBefore: string;
    limit: number;
  }): Promise<readonly ConnectorOperation[]>;
  /** Returns null when another process changed the optimistic revision first. */
  saveIfRevision(
    operation: ConnectorOperation,
    expectedRevision: number,
  ): Promise<ConnectorOperation | null>;
}

export type ConnectorOperationReconciliationSummary = {
  scanned: number;
  succeeded: number;
  failed: number;
  waitingForReview: number;
  conflicts: number;
  errors: number;
};

export const STALE_CONNECTOR_OPERATION_ACTION =
  "MailMyPDF could not confirm whether this action completed after an interrupted request. Check the matter's current state before starting a new attempt; do not automatically repeat the action.";

function boundedLimit(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error("Connector reconciliation limit must be between 1 and 100.");
  }
  return value;
}

function isoTimestamp(value: string, label: string): string {
  if (Number.isNaN(Date.parse(value))) throw new Error(`${label} must be an ISO date-time.`);
  return value;
}

function transitionFromDecision(
  operation: ConnectorOperation,
  decision: ConnectorOperationReconciliationDecision,
  now: string,
): ConnectorOperation {
  if (decision.outcome === "confirmed_succeeded") {
    return transitionConnectorOperation(operation, "succeeded", {
      now,
      result: decision.result,
    });
  }
  if (decision.outcome === "confirmed_failed") {
    return transitionConnectorOperation(operation, "failed", {
      now,
      error: decision.error,
    });
  }
  return transitionConnectorOperation(operation, "waiting_for_user", {
    now,
    requiredAction: decision.requiredAction,
  });
}

/**
 * Reconciles stale operations from observable evidence only. The resolver has
 * no execution callback, so this service cannot repeat the original effect.
 */
export async function reconcileStaleConnectorOperations(input: {
  repository: ConnectorOperationReconciliationRepository;
  resolve: ConnectorOperationReconciliationResolver;
  updatedBefore: string;
  limit: number;
  now: string;
}): Promise<ConnectorOperationReconciliationSummary> {
  const updatedBefore = isoTimestamp(input.updatedBefore, "Reconciliation cutoff");
  const now = isoTimestamp(input.now, "Reconciliation time");
  if (Date.parse(now) < Date.parse(updatedBefore)) {
    throw new Error("Reconciliation time cannot precede its stale cutoff.");
  }

  const candidates = (await input.repository.listStaleRunning({
    updatedBefore,
    limit: boundedLimit(input.limit),
  })).slice(0, input.limit);
  const summary: ConnectorOperationReconciliationSummary = {
    scanned: candidates.length,
    succeeded: 0,
    failed: 0,
    waitingForReview: 0,
    conflicts: 0,
    errors: 0,
  };

  for (const operation of candidates) {
    if (
      operation.state !== "running" ||
      Date.parse(operation.updatedAt) > Date.parse(updatedBefore)
    ) {
      summary.errors += 1;
      continue;
    }

    try {
      const decision = await input.resolve(operation);
      const next = transitionFromDecision(operation, decision, now);
      const saved = await input.repository.saveIfRevision(next, operation.revision);
      if (!saved) {
        summary.conflicts += 1;
        continue;
      }
      if (
        saved.id !== next.id ||
        saved.ownerId !== next.ownerId ||
        saved.matterId !== next.matterId ||
        saved.kind !== next.kind ||
        saved.idempotencyKey !== next.idempotencyKey ||
        saved.requestSha256 !== next.requestSha256 ||
        saved.revision !== next.revision ||
        saved.state !== next.state
      ) {
        summary.errors += 1;
        continue;
      }
      if (saved.state === "succeeded") summary.succeeded += 1;
      else if (saved.state === "failed") summary.failed += 1;
      else if (saved.state === "waiting_for_user") summary.waitingForReview += 1;
      else summary.errors += 1;
    } catch {
      summary.errors += 1;
    }
  }

  return summary;
}

/** Safe fallback until an operation kind has a receipt-backed resolver. */
export async function requireReviewForStaleConnectorOperation(): Promise<
  ConnectorOperationReconciliationDecision
> {
  return {
    outcome: "requires_review",
    requiredAction: STALE_CONNECTOR_OPERATION_ACTION,
  };
}
