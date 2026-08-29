import { z } from "zod";

/* ═══════════════════════════════════════════════════════════
   MISSING INFORMATION ENGINE
   Structured identification of what the case is missing and
   why it matters. Allows users to resolve items one by one.
   ═══════════════════════════════════════════════════════════ */

export const missingInfoCategorySchema = z.enum([
  "deadline",
  "identity",
  "amount",
  "date",
  "document",
  "address",
  "evidence",
  "procedural",
  "recipient",
  "other",
]);
export type MissingInfoCategory = z.infer<typeof missingInfoCategorySchema>;

export const missingInfoItemSchema = z.object({
  id: z.string(),
  category: missingInfoCategorySchema,
  field: z.string(),              // e.g. "mailing_date", "page_2"
  label: z.string(),             // human-readable: "Actual mailing date"
  whyItMatters: z.string(),      // e.g. "Determines deadline calculation"
  impact: z.enum(["blocking", "high", "medium", "low"]).default("medium"),
  status: z.enum(["missing", "provided", "not_applicable", "deferred"]).default("missing"),
  resolvedValue: z.string().optional(),
  resolvedAt: z.string().optional(),
  suggestedActions: z.array(z.string()).default([]),
  relatedFactId: z.string().optional(),
  relatedFindingId: z.string().optional(),
  createdAt: z.string(),
});
export type MissingInfoItem = z.infer<typeof missingInfoItemSchema>;

export function createMissingInfo(params: {
  category: MissingInfoCategory;
  field: string;
  label: string;
  whyItMatters: string;
  impact?: MissingInfoItem["impact"];
  suggestedActions?: string[];
  relatedFactId?: string;
}): MissingInfoItem {
  return missingInfoItemSchema.parse({
    id: crypto.randomUUID(),
    category: params.category,
    field: params.field,
    label: params.label,
    whyItMatters: params.whyItMatters,
    impact: params.impact || "medium",
    status: "missing",
    suggestedActions: params.suggestedActions || [],
    relatedFactId: params.relatedFactId,
    createdAt: new Date().toISOString(),
  });
}

/* ── Detection ── */

export interface MissingInfoInput {
  facts: { id: string; label: string; value: string; confidence: string; userConfirmed: boolean }[];
  deadlines: { date?: string; certainty: string }[];
  evidence: { id: string; label: string }[];
  agency?: string;
  referenceNumber?: string;
  noticeDate?: string;
  recipient?: { name: string; address1: string; city: string; state: string; zip: string };
  draftContent?: string;
}

export function detectMissingInfo(input: MissingInfoInput): MissingInfoItem[] {
  const items: MissingInfoItem[] = [];

  /* Deadline missing */
  const primaryDeadline = input.deadlines[0];
  if (!primaryDeadline?.date || primaryDeadline.certainty === "missing") {
    items.push(createMissingInfo({
      category: "deadline",
      field: "response_deadline",
      label: "Response deadline",
      whyItMatters: "Without a deadline, the system cannot assess urgency or ensure timely filing.",
      impact: "blocking",
      suggestedActions: ["Check the notice for any deadline language", "Contact the issuing agency to confirm"],
    }));
  } else if (primaryDeadline.certainty === "ambiguous") {
    items.push(createMissingInfo({
      category: "deadline",
      field: "response_deadline",
      label: "Confirm ambiguous deadline",
      whyItMatters: "The deadline language is unclear. An incorrect deadline could cause a missed filing.",
      impact: "high",
      suggestedActions: ["Review the exact deadline text", "Verify with the issuing agency"],
    }));
  }

  /* Agency missing */
  if (!input.agency) {
    items.push(createMissingInfo({
      category: "identity",
      field: "issuing_agency",
      label: "Issuing agency",
      whyItMatters: "The issuing agency determines where to send the response and what format is required.",
      impact: "blocking",
      suggestedActions: ["Check the letterhead or header of the notice", "Look for agency contact information"],
    }));
  }

  /* Reference number missing */
  if (!input.referenceNumber) {
    items.push(createMissingInfo({
      category: "identity",
      field: "reference_number",
      label: "Reference / case number",
      whyItMatters: "The reference number is typically required in the response to identify your case.",
      impact: "high",
      suggestedActions: ["Check the top of the notice for a case/notice number", "Look for a reference or control number"],
    }));
  }

  /* Notice date missing */
  if (!input.noticeDate) {
    items.push(createMissingInfo({
      category: "date",
      field: "notice_date",
      label: "Notice date",
      whyItMatters: "The notice date may be needed for deadline calculations and referencing in the response.",
      impact: "medium",
      suggestedActions: ["Look for a date at the top of the notice", "Check for 'dated' language"],
    }));
  }

  /* Recipient missing */
  if (input.recipient && (!input.recipient.name || !input.recipient.address1)) {
    items.push(createMissingInfo({
      category: "recipient",
      field: "recipient_address",
      label: "Mailing address for response",
      whyItMatters: "The response cannot be mailed without a complete recipient address.",
      impact: "blocking",
      suggestedActions: ["Check the notice for a response mailing address", "Look for 'send your response to'"],
    }));
  }

  /* Low-confidence facts needing verification */
  const uncertainFacts = input.facts.filter((f) => f.confidence !== "high" && !f.userConfirmed);
  for (const fact of uncertainFacts) {
    items.push(createMissingInfo({
      category: "evidence",
      field: `fact_${fact.id}`,
      label: `Verify: ${fact.label}`,
      whyItMatters: `This fact was extracted with ${fact.confidence} confidence. Verify it against the source document.`,
      impact: "medium",
      suggestedActions: ["Compare against the original document", "Confirm or correct the value"],
      relatedFactId: fact.id,
    }));
  }

  /* No evidence attached */
  if (input.evidence.length === 0) {
    items.push(createMissingInfo({
      category: "evidence",
      field: "supporting_evidence",
      label: "Supporting evidence",
      whyItMatters: "Evidence strengthens the response. Many disputes are won with documentation.",
      impact: "medium",
      suggestedActions: ["Gather receipts, forms, prior correspondence", "Upload documents that support your position"],
    }));
  }

  return items;
}

/* ── Resolve ── */
export function resolveMissingInfo(item: MissingInfoItem, value: string): MissingInfoItem {
  return missingInfoItemSchema.parse({
    ...item,
    status: "provided",
    resolvedValue: value,
    resolvedAt: new Date().toISOString(),
  });
}

export function deferMissingInfo(item: MissingInfoItem): MissingInfoItem {
  return missingInfoItemSchema.parse({ ...item, status: "deferred" });
}

export function dismissMissingInfo(item: MissingInfoItem): MissingInfoItem {
  return missingInfoItemSchema.parse({ ...item, status: "not_applicable" });
}

/* ── Summary ── */
export function missingInfoSummary(items: MissingInfoItem[]): {
  total: number;
  missing: number;
  blocking: number;
  provided: number;
  byCategory: Record<string, number>;
} {
  return {
    total: items.length,
    missing: items.filter((i) => i.status === "missing").length,
    blocking: items.filter((i) => i.status === "missing" && i.impact === "blocking").length,
    provided: items.filter((i) => i.status === "provided").length,
    byCategory: items.reduce((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}
