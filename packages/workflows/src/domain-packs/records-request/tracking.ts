import type {
  RecordsRequestDeliveryMethod,
  RecordsRequestTrackingResult,
} from "./types.js";

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export interface RecordRecordsRequestSentInput {
  sentDate: string;
  method: RecordsRequestDeliveryMethod;
  providerId?: string;
  trackingNumber?: string;
  receiptArtifactId?: string;
}

/**
 * Creates the domain event that starts request-response tracking. The date must
 * be the actual confirmed send date; draft, approval, checkout, and print dates
 * must never be substituted for it.
 */
export function recordRecordsRequestSent(
  input: RecordRecordsRequestSentInput,
): RecordsRequestTrackingResult {
  if (!isCalendarDate(input.sentDate)) {
    return {
      ok: false,
      error: "A valid actual send date in YYYY-MM-DD format is required.",
    };
  }

  return {
    ok: true,
    event: {
      type: "records_request_sent",
      occurredOn: input.sentDate,
      data: {
        method: input.method,
        providerId: input.providerId,
        trackingNumber: input.trackingNumber,
        receiptArtifactId: input.receiptArtifactId,
      },
    },
  };
}

export interface RecordRecordsResponseInput {
  responded: boolean;
  responseDate?: string;
  responseArtifactIds?: readonly string[];
  note?: string;
  /** Required when recording non-response so silence is never inferred by software. */
  observationDate?: string;
}

export function recordRecordsResponse(
  input: RecordRecordsResponseInput,
): RecordsRequestTrackingResult {
  if (input.responded) {
    if (!isCalendarDate(input.responseDate)) {
      return {
        ok: false,
        error: "A valid response date is required when a response was received.",
      };
    }

    return {
      ok: true,
      event: {
        type: "records_response_received",
        occurredOn: input.responseDate,
        data: {
          responseArtifactIds: input.responseArtifactIds ?? [],
          note: input.note,
        },
      },
    };
  }

  if (!isCalendarDate(input.observationDate)) {
    return {
      ok: false,
      error: "A valid observation date is required to record a confirmed non-response.",
    };
  }

  return {
    ok: true,
    event: {
      type: "records_response_not_received",
      occurredOn: input.observationDate,
      data: {
        responseArtifactIds: input.responseArtifactIds ?? [],
        note: input.note,
      },
    },
  };
}
