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

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_STALE_MINUTES = 15;

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
    resolve: requireReviewForStaleConnectorOperation,
    updatedBefore: updatedBefore.toISOString(),
    limit,
    now: now.toISOString(),
  });
}
