import { z } from "zod";

/* ─────────────────────────────────────────────
   Evidence — documents, excerpts, and records
   that support appeal grounds.
   ───────────────────────────────────────────── */

export const evidenceTypeSchema = z.enum([
  "document",
  "excerpt",
  "testimonial",
  "photographic",
  "record",
  "correspondence",
]);
export type EvidenceType = z.infer<typeof evidenceTypeSchema>;

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  document: "Document",
  excerpt: "Excerpt / Quote",
  testimonial: "Testimonial / Statement",
  photographic: "Photograph / Image",
  record: "Official Record",
  correspondence: "Correspondence / Communication",
};

export const evidenceSchema = z.object({
  id: z.string(),
  type: evidenceTypeSchema,
  label: z.string(),
  documentId: z.string().optional(),
  documentFilename: z.string().optional(),
  excerpt: z.string().optional(),
  pageRef: z.string().optional(),
  groundIds: z.array(z.string()).default([]),
  exhibitNumber: z.string().optional(),
  uploadedAt: z.string().optional(),
  hash: z.string().optional(),
  notes: z.string().optional(),
});
export type Evidence = z.infer<typeof evidenceSchema>;

/* Links evidence to grounds with a typed relationship */
export const evidenceLinkSchema = z.object({
  evidenceId: z.string(),
  groundId: z.string(),
  relationship: z.enum(["supports", "contradicts", "contextual"]),
  excerpt: z.string().optional(),
  pageRef: z.string().optional(),
});
export type EvidenceLink = z.infer<typeof evidenceLinkSchema>;

export function createEvidence(type: EvidenceType, label: string, partial?: Partial<Evidence>): Evidence {
  return evidenceSchema.parse({
    id: crypto.randomUUID(),
    type,
    label,
    groundIds: [],
    ...partial,
  });
}

/* Get evidence linked to a specific ground */
export function evidenceForGround(evidence: Evidence[], groundId: string): Evidence[] {
  return evidence.filter((e) => e.groundIds.includes(groundId));
}

/* Check which grounds have no supporting evidence */
export function unsupportedGrounds(evidence: Evidence[], groundIds: string[]): string[] {
  return groundIds.filter(
    (gid) => !evidence.some((e) => e.groundIds.includes(gid) && e.type !== "contextual")
  );
}

/* Generate exhibit index from evidence list */
export function generateExhibitIndex(evidence: Evidence[]): { number: string; evidenceId: string; label: string; pageRef?: string }[] {
  const sorted = [...evidence].filter((e) => e.type !== "excerpt");
  return sorted.map((e, i) => ({
    number: `Exhibit ${String.fromCharCode(65 + i)}`,
    evidenceId: e.id,
    label: e.label,
    pageRef: e.pageRef,
  }));
}
