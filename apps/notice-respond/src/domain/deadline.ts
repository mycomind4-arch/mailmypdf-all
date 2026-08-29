import { z } from "zod";

/* ═══════════════════════════════════════════════════════════
   DEADLINE MODEL — extraction, calculation, and urgency assessment
   for response deadlines.
   
   Deadlines are the most safety-critical piece of intelligence.
   They carry certainty levels and validation warnings so the
   user always knows how much trust to place in them.
   ═══════════════════════════════════════════════════════════ */

export const deadlineTypeSchema = z.enum([
  "response",
  "filing",
  "hearing",
  "payment",
  "appeal",
  "other",
]);
export type DeadlineType = z.infer<typeof deadlineTypeSchema>;

export const deadlineCertaintySchema = z.enum([
  "explicit",
  "calculated",
  "inferred",
  "ambiguous",
  "missing",
]);
export type DeadlineCertainty = z.infer<typeof deadlineCertaintySchema>;

export const deadlineSchema = z.object({
  id: z.string(),
  type: deadlineTypeSchema.default("response"),
  date: z.string().optional(),
  rawText: z.string().optional(),
  certainty: deadlineCertaintySchema.default("missing"),
  calculationMethod: z.string().optional(),
  startDate: z.string().optional(),
  daysWindow: z.number().optional(),
  businessDays: z.boolean().default(false),
  sourceExcerpt: z.string().optional(),
  notes: z.string().optional(),
});
export type Deadline = z.infer<typeof deadlineSchema>;

export function createDeadline(params: {
  type?: DeadlineType;
  date?: string;
  rawText?: string;
  certainty?: DeadlineCertainty;
  calculationMethod?: string;
  startDate?: string;
  daysWindow?: number;
  businessDays?: boolean;
  sourceExcerpt?: string;
}): Deadline {
  return deadlineSchema.parse({
    id: crypto.randomUUID(),
    type: params.type ?? "response",
    date: params.date,
    rawText: params.rawText,
    certainty: params.certainty ?? "missing",
    calculationMethod: params.calculationMethod,
    startDate: params.startDate,
    daysWindow: params.daysWindow,
    businessDays: params.businessDays ?? false,
    sourceExcerpt: params.sourceExcerpt,
  });
}

/* ── Date parsing ── */

const MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export function parseDate(text: string): string | undefined {
  if (!text) return undefined;

  // YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // Month DD, YYYY
  const longMatch = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})\b/i);
  if (longMatch) {
    const month = MONTH_MAP[longMatch[1].toLowerCase()];
    const day = parseInt(longMatch[2]);
    const year = parseInt(longMatch[3]);
    if (month && day && year) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // MM/DD/YYYY
  const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1]);
    const day = parseInt(slashMatch[2]);
    const year = parseInt(slashMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return undefined;
}

/* ── Deadline calculation ── */

export function computeDeadlineDate(
  startDate: string,
  daysWindow: number,
  businessDays: boolean = false,
): string {
  const start = new Date(startDate + "T00:00:00");
  if (businessDays) {
    let remaining = daysWindow;
    const current = new Date(start);
    while (remaining > 0) {
      current.setDate(current.getDate() + 1);
      const day = current.getDay();
      if (day !== 0 && day !== 6) remaining--;
    }
    return current.toISOString().split("T")[0];
  }
  const result = new Date(start);
  result.setDate(result.getDate() + daysWindow);
  return result.toISOString().split("T")[0];
}

/* ── Days until deadline ── */

export function daysUntil(dateString: string): number | null {
  if (!dateString) return null;
  const target = new Date(dateString + "T00:00:00");
  if (isNaN(target.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/* ── Deadline urgency ── */

export type DeadlineUrgency = "expired" | "critical" | "urgent" | "normal" | "unknown";

export function deadlineUrgency(dateString: string): DeadlineUrgency {
  const days = daysUntil(dateString);
  if (days === null) return "unknown";
  if (days < 0) return "expired";
  if (days <= 3) return "critical";
  if (days <= 14) return "urgent";
  return "normal";
}

export const URGENCY_META: Record<DeadlineUrgency, { label: string; color: string }> = {
  expired: { label: "Expired", color: "red" },
  critical: { label: "Critical — Act Now", color: "red" },
  urgent: { label: "Urgent", color: "amber" },
  normal: { label: "On Track", color: "green" },
  unknown: { label: "Unknown", color: "gray" },
};

/* ── Validation ── */

export function validateDeadline(deadline: Deadline): {
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!deadline.date) {
    warnings.push("No deadline date identified. Check the notice carefully.");
  }

  if (deadline.certainty === "ambiguous") {
    warnings.push("Deadline language is ambiguous. Verify the exact date with the issuing agency.");
  }

  if (deadline.certainty === "missing") {
    warnings.push("No deadline was found in the notice. Contact the agency to confirm any response deadlines.");
  }

  if (deadline.date) {
    const days = daysUntil(deadline.date);
    if (days !== null && days < 0) {
      warnings.push("The deadline has already passed. Contact the agency immediately.");
    }
    if (days !== null && days <= 3 && days >= 0) {
      warnings.push("The deadline is within 3 days. Act immediately.");
    }
  }

  if (deadline.businessDays && !deadline.startDate) {
    errors.push("Business-day calculation requires a start date.");
  }

  return { warnings, errors };
}

/* ── Derived Deadline with Provenance ── */

export function createDerivedDeadline(params: {
  type?: DeadlineType;
  startDate: string;
  daysWindow: number;
  businessDays?: boolean;
  calculationMethod: string;
  sourceExcerpt: string;
  notes?: string;
}): Deadline {
  const date = computeDeadlineDate(params.startDate, params.daysWindow, params.businessDays);
  return createDeadline({
    type: params.type ?? "response",
    date,
    rawText: params.sourceExcerpt,
    certainty: "calculated",
    calculationMethod: params.calculationMethod,
    startDate: params.startDate,
    daysWindow: params.daysWindow,
    businessDays: params.businessDays ?? false,
    sourceExcerpt: params.sourceExcerpt,
    notes: params.notes,
  });
}

/* ── Deadline Certainty Labels ── */

export const CERTAINTY_LABELS: Record<DeadlineCertainty, string> = {
  explicit: "Confirmed — stated in the notice",
  calculated: "Derived — computed from notice date + documented rule",
  inferred: "Inferred — based on incomplete information, verify manually",
  ambiguous: "Ambiguous — unclear deadline language, verify with agency",
  missing: "Missing — no deadline found in the notice",
};
