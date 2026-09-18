import type { UccPerfectionMethod } from "@mailmypdf/jurisdiction-rules";
import type { SecuredTransactionSourceRef } from "../types.js";

export interface PerfectionEventInput {
  eventId: string;
  method: UccPerfectionMethod;
  jurisdiction: string;
  status: "attempted" | "completed" | "failed";
  occurredAt: string;
  sourceRefs?: readonly SecuredTransactionSourceRef[];
  externalRecordId?: string;
  note?: string;
}

export interface PerfectionEventRecord {
  eventId: string;
  method: UccPerfectionMethod;
  jurisdiction: string;
  status: "attempted" | "completed" | "failed";
  occurredAt: string;
  sourceRefs: readonly SecuredTransactionSourceRef[];
  externalRecordId?: string;
  note?: string;
}

function validIsoDateTime(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

export function recordPerfectionEvent(
  input: PerfectionEventInput,
): PerfectionEventRecord {
  const eventId = input.eventId.trim();
  const jurisdiction = input.jurisdiction.trim();
  if (!eventId) throw new Error("Perfection event id is required.");
  if (!jurisdiction) throw new Error("Perfection event jurisdiction is required.");
  if (!validIsoDateTime(input.occurredAt)) {
    throw new Error("Perfection event occurredAt must be a valid date/time.");
  }

  const sourceRefs = [...new Map(
    (input.sourceRefs ?? []).map((source) => [source.id, source]),
  ).values()];

  if (input.status === "completed" && sourceRefs.length === 0) {
    throw new Error("A completed perfection event requires source evidence.");
  }

  return Object.freeze({
    eventId,
    method: input.method,
    jurisdiction,
    status: input.status,
    occurredAt: new Date(input.occurredAt).toISOString(),
    sourceRefs,
    externalRecordId: input.externalRecordId?.trim() || undefined,
    note: input.note?.trim() || undefined,
  });
}
