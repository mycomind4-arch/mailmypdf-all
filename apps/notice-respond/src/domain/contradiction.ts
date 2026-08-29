import { z } from "zod";
import type { NoticeFact } from "./fact";
import type { Evidence } from "./evidence";

/* ═══════════════════════════════════════════════════════════
   CONTRADICTION ENGINE
   Detects conflicts between extracted facts, evidence, and
   user-provided information. Never silently picks one —
   surfaces conflicts for resolution.
   ═══════════════════════════════════════════════════════════ */

export const contradictionTypeSchema = z.enum([
  "date_conflict",
  "amount_conflict",
  "name_conflict",
  "address_conflict",
  "fact_conflict",
  "deadline_conflict",
  "evidence_vs_fact",
  "user_vs_extracted",
  "document_vs_document",
]);
export type ContradictionType = z.infer<typeof contradictionTypeSchema>;

export const contradictionSchema = z.object({
  id: z.string(),
  type: contradictionTypeSchema,
  field: z.string(),           // e.g. "notice_date", "amount_owed"
  sources: z.array(z.object({
    sourceId: z.string(),
    sourceType: z.enum(["extracted", "user", "evidence", "document"]),
    value: z.string(),
    label: z.string().optional(),
  })),
  description: z.string(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  status: z.enum(["unresolved", "resolved", "dismissed"]).default("unresolved"),
  resolvedValue: z.string().optional(),
  resolvedBy: z.string().optional(),
  resolvedAt: z.string().optional(),
  createdAt: z.string(),
});
export type Contradiction = z.infer<typeof contradictionSchema>;

export function createContradiction(params: {
  type: ContradictionType;
  field: string;
  sources: Contradiction["sources"];
  description: string;
  severity?: Contradiction["severity"];
}): Contradiction {
  return contradictionSchema.parse({
    id: crypto.randomUUID(),
    type: params.type,
    field: params.field,
    sources: params.sources,
    description: params.description,
    severity: params.severity || "medium",
    status: "unresolved",
    createdAt: new Date().toISOString(),
  });
}

/* ── Detection ── */

export interface ContradictionInput {
  facts: NoticeFact[];
  userFacts?: string;
  evidence: Evidence[];
  deadlines: { date?: string; rawText?: string; certainty: string }[];
}

export function detectContradictions(input: ContradictionInput): Contradiction[] {
  const contradictions: Contradiction[] = [];

  /* ── Date conflicts ── */
  const dateFacts = input.facts.filter((f) =>
    /date/i.test(f.label) && f.value,
  );
  const uniqueDates = new Map<string, NoticeFact[]>();
  for (const fact of dateFacts) {
    const key = fact.label.toLowerCase();
    if (!uniqueDates.has(key)) uniqueDates.set(key, []);
    uniqueDates.get(key)!.push(fact);
  }
  for (const [label, facts] of uniqueDates) {
    const values = new Set(facts.map((f) => f.value));
    if (values.size > 1) {
      contradictions.push(createContradiction({
        type: "date_conflict",
        field: label,
        sources: facts.map((f) => ({
          sourceId: f.id,
          sourceType: "extracted",
          value: f.value,
          label: f.label,
        })),
        description: `Multiple different dates found for "${label}": ${[...values].join(", ")}`,
        severity: "high",
      }));
    }
  }

  /* ── Amount conflicts ── */
  const amountFacts = input.facts.filter((f) =>
    /amount|owed|due|balance|penalty/i.test(f.label) && f.value,
  );
  const amountGroups = new Map<string, NoticeFact[]>();
  for (const fact of amountFacts) {
    const key = fact.label.toLowerCase();
    if (!amountGroups.has(key)) amountGroups.set(key, []);
    amountGroups.get(key)!.push(fact);
  }
  for (const [label, facts] of amountGroups) {
    const values = new Set(facts.map((f) => f.value));
    if (values.size > 1) {
      contradictions.push(createContradiction({
        type: "amount_conflict",
        field: label,
        sources: facts.map((f) => ({
          sourceId: f.id,
          sourceType: "extracted",
          value: f.value,
          label: f.label,
        })),
        description: `Conflicting amounts for "${label}": ${[...values].join(" vs ")}`,
        severity: "high",
      }));
    }
  }

  /* ── Deadline conflicts ── */
  const deadlinesWithDates = input.deadlines.filter((d) => d.date);
  if (deadlinesWithDates.length > 1) {
    const dates = new Set(deadlinesWithDates.map((d) => d.date));
    if (dates.size > 1) {
      contradictions.push(createContradiction({
        type: "deadline_conflict",
        field: "response_deadline",
        sources: deadlinesWithDates.map((d, i) => ({
          sourceId: `deadline_${i}`,
          sourceType: "extracted",
          value: d.date!,
          label: d.rawText || "deadline",
        })),
        description: `Multiple response deadlines found: ${[...dates].join(", ")}`,
        severity: "critical",
      }));
    }
  }

  /* ── User facts vs extracted facts ── */
  if (input.userFacts) {
    for (const fact of input.facts) {
      if (input.userFacts.toLowerCase().includes(fact.value.toLowerCase())) continue;
      // Check if user contradicts a high-confidence fact
      if (fact.confidence === "high" && /never|not|incorrect|wrong|false|disagree/i.test(input.userFacts)) {
        if (fact.value.length > 3 && input.userFacts.toLowerCase().includes(fact.label.toLowerCase().split(" ")[0])) {
          contradictions.push(createContradiction({
            type: "user_vs_extracted",
            field: fact.label,
            sources: [
              { sourceId: fact.id, sourceType: "extracted", value: fact.value, label: fact.label },
              { sourceId: "user_input", sourceType: "user", value: input.userFacts.substring(0, 200), label: "User statement" },
            ],
            description: `User statement may contradict extracted fact "${fact.label}"`,
            severity: "medium",
          }));
        }
      }
    }
  }

  /* ── Evidence vs fact contradictions ── */
  for (const fact of input.facts) {
    for (const evidence of input.evidence) {
      if (evidence.relationships.some((r) => r.factId === fact.id && r.relationship === "contradicts")) {
        contradictions.push(createContradiction({
          type: "evidence_vs_fact",
          field: fact.label,
          sources: [
            { sourceId: fact.id, sourceType: "extracted", value: fact.value, label: fact.label },
            { sourceId: evidence.id, sourceType: "evidence", value: evidence.label, label: "Evidence" },
          ],
          description: `Evidence "${evidence.label}" contradicts fact "${fact.label}: ${fact.value}"`,
          severity: "high",
        }));
      }
    }
  }

  return contradictions;
}

/* ── Resolve ── */
export function resolveContradiction(c: Contradiction, resolvedValue: string, resolvedBy: string): Contradiction {
  return contradictionSchema.parse({
    ...c,
    status: "resolved",
    resolvedValue,
    resolvedBy,
    resolvedAt: new Date().toISOString(),
  });
}

export function dismissContradiction(c: Contradiction, dismissedBy: string): Contradiction {
  return contradictionSchema.parse({
    ...c,
    status: "dismissed",
    resolvedBy: dismissedBy,
    resolvedAt: new Date().toISOString(),
  });
}

/* ── Summary ── */
export function contradictionSummary(contradictions: Contradiction[]): {
  total: number;
  unresolved: number;
  critical: number;
  byType: Record<string, number>;
} {
  return {
    total: contradictions.length,
    unresolved: contradictions.filter((c) => c.status === "unresolved").length,
    critical: contradictions.filter((c) => c.severity === "critical" && c.status === "unresolved").length,
    byType: contradictions.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}
