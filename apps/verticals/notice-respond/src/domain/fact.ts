import { z } from "zod";

/* ═══════════════════════════════════════════════════════════
   FACT MODEL — extracted and user-provided facts about a notice.
   
   Facts are the atomic units of information extracted from or
   provided about a notice. They carry their source and confidence
   so downstream intelligence can reason about reliability.
   ═══════════════════════════════════════════════════════════ */

export const factSourceSchema = z.enum(["extracted", "user", "inferred"]);
export type FactSource = z.infer<typeof factSourceSchema>;

export const factConfidenceSchema = z.enum(["high", "medium", "low"]);
export type FactConfidence = z.infer<typeof factConfidenceSchema>;

export const noticeFactSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  source: factSourceSchema.default("extracted"),
  confidence: factConfidenceSchema.default("medium"),
  userConfirmed: z.boolean().default(false),
  sourceExcerpt: z.string().optional(),
  extractionMethod: z.string().optional(),
  createdAt: z.string().default(() => new Date().toISOString()),
});
export type NoticeFact = z.infer<typeof noticeFactSchema>;

export function createFact(
  label: string,
  value: string,
  source: FactSource = "extracted",
  confidence: FactConfidence = "medium",
  options?: {
    id?: string;
    userConfirmed?: boolean;
    sourceExcerpt?: string;
    extractionMethod?: string;
  },
): NoticeFact {
  return noticeFactSchema.parse({
    id: options?.id ?? crypto.randomUUID(),
    label,
    value,
    source,
    confidence,
    userConfirmed: options?.userConfirmed ?? false,
    sourceExcerpt: options?.sourceExcerpt,
    extractionMethod: options?.extractionMethod,
  });
}

export function confirmFact(fact: NoticeFact): NoticeFact {
  return { ...fact, userConfirmed: true };
}

export function correctFact(fact: NoticeFact, newValue: string): NoticeFact {
  return { ...fact, value: newValue, userConfirmed: true };
}
