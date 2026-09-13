import { z } from "zod";
import type { MailingEvidenceItem } from "@mailmypdf/payment-fulfillment";

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
  // Retained bytes for this evidence item in Supabase Storage (bucket
  // "appeal-evidence"), so it can be re-attached to the mail-ready packet
  // at fulfillment time -- see mailmypdf-client.ts's uploadPacket() and
  // mailing-intent-store.ts's evidence_snapshot mapping. Mirrors Notice
  // Respond's MailingEvidenceItem shape from @mailmypdf/payment-fulfillment.
  storagePath: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().optional(),
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

/**
 * Converts evidence with retained storage bytes into the manifest shape
 * @mailmypdf/payment-fulfillment expects on a MailingIntent
 * (`evidence_snapshot`). Only evidence with a `storagePath` and `hash` is
 * independently attachable -- entries without both are conceptual labels
 * for things referenced within another evidence item's document (see
 * analyze.ts), not separately retrievable files, and must be excluded here
 * or the same file would be enclosed more than once.
 *
 * Used both when computing `approvedEvidenceHash` at approval time
 * (packet.ts) and when building the intent's `evidence_snapshot` at
 * fulfillment time (mailing-intent-store.ts) -- both call sites MUST derive
 * the same list from the same evidence array, or fulfillment's integrity
 * check will reject a packet that was never actually altered.
 */
export function toMailingEvidenceItems(evidence: Evidence[]): MailingEvidenceItem[] {
  return evidence
    .filter((e): e is Evidence & { storagePath: string; hash: string } => Boolean(e.storagePath && e.hash))
    .map((e) => ({
      id: e.id,
      fileName: e.documentFilename || e.label,
      fileType: e.mimeType || "application/octet-stream",
      fileSize: e.fileSize ?? 0,
      fileHash: e.hash,
      storagePath: e.storagePath,
      status: "approved",
    }));
}
