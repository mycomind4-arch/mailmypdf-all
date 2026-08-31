import { z } from "zod";

/* ─────────────────────────────────────────────
   Argument — constructed argument tying grounds
   to evidence with citations.
   ───────────────────────────────────────────── */

export const contradictionSchema = z.object({
  id: z.string(),
  description: z.string(),
  sources: z.array(z.string()).default([]),
  severity: z.enum(["high", "medium", "low"]),
  resolved: z.boolean().default(false),
  resolution: z.string().optional(),
});
export type Contradiction = z.infer<typeof contradictionSchema>;

export const argumentStrengthSchema = z.enum(["strong", "moderate", "weak"]);
export type ArgumentStrength = z.infer<typeof argumentStrengthSchema>;

export const argumentSchema = z.object({
  id: z.string(),
  groundId: z.string(),
  heading: z.string(),
  body: z.string(),
  evidenceIds: z.array(z.string()).default([]),
  citations: z.array(z.string()).default([]),
  strength: argumentStrengthSchema.default("moderate"),
  contradictions: z.array(contradictionSchema).default([]),
});
export type Argument = z.infer<typeof argumentSchema>;

export function createArgument(groundId: string, heading: string, body: string, partial?: Partial<Argument>): Argument {
  return argumentSchema.parse({
    id: crypto.randomUUID(),
    groundId,
    heading,
    body,
    evidenceIds: [],
    citations: [],
    strength: "moderate",
    contradictions: [],
    ...partial,
  });
}

/* Detect potential contradictions between sources */
export function detectContradictions(
  decisionReasons: string[],
  userFacts: string[],
  draftText: string
): Contradiction[] {
  const contradictions: Contradiction[] = [];

  // Check for dates mentioned in multiple places that might conflict
  const datePattern = /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;
  const draftDates = draftText.match(datePattern) || [];
  const reasonDates = decisionReasons.join(" ").match(datePattern) || [];

  for (const date of draftDates) {
    if (reasonDates.length && !reasonDates.includes(date)) {
      contradictions.push({
        id: crypto.randomUUID(),
        description: `Date "${date}" in the draft does not appear in the decision reasons. Verify this date is correct.`,
        sources: ["draft", "decision"],
        severity: "medium",
        resolved: false,
      });
    }
  }

  return contradictions;
}
