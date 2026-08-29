/* ═══════════════════════════════════════════════════════════
   EVIDENCE MODEL — user-provided supporting materials.

   Evidence lifecycle:
   MISSING → PROVIDED → UNDER_REVIEW → VERIFIED | REJECTED
                                    ↗
   NOT_APPLICABLE (terminal)

   "Verified" means a human or system confirmed the evidence
   is relevant, legible, and supports the claimed position.
   "Provided" means the user uploaded it — NOT verified.

   Source types are explicitly distinguished:
   - SOURCE DOCUMENT: the notice itself
   - USER-PROVIDED FACT: information the user entered
   - EXTRACTED FACT: information the system pulled from a document
   - INFERRED INFORMATION: derived by the system
   - SYSTEM FINDING: a conclusion reached by the intelligence layer

   Evidence is always USER-PROVIDED or SOURCE DOCUMENT.
   ═══════════════════════════════════════════════════════════ */

import { z } from "zod";

// ── Evidence Types ────────────────────────────────────────────

export const evidenceTypeSchema = z.enum([
  "document",
  "receipt",
  "form",
  "correspondence",
  "photo",
  "screenshot",
  "contract",
  "bank_statement",
  "tax_form",
  "other",
]);
export type EvidenceType = z.infer<typeof evidenceTypeSchema>;

// ── Evidence Lifecycle ────────────────────────────────────────

export const evidenceStatusSchema = z.enum([
  "missing",        // Not yet provided
  "provided",       // User uploaded but not reviewed
  "under_review",   // Being reviewed by system or user
  "verified",       // Confirmed relevant, legible, supports position
  "rejected",       // Reviewed and found insufficient
  "not_applicable", // Not needed for this case
]);
export type EvidenceStatus = z.infer<typeof evidenceStatusSchema>;

export const evidenceRequirementSchema = z.enum([
  "required",
  "recommended",
  "optional",
  "not_applicable",
]);
export type EvidenceRequirement = z.infer<typeof evidenceRequirementSchema>;

// ── Evidence Relationships ────────────────────────────────────

export const evidenceRelationshipSchema = z.object({
  factId: z.string(),
  relationship: z.enum(["supports", "contradicts", "contextualizes"]),
});
export type EvidenceRelationship = z.infer<typeof evidenceRelationshipSchema>;

// ── Evidence Item ────────────────────────────────────────────

export const evidenceSchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  type: evidenceTypeSchema,
  label: z.string(),
  description: z.string().optional(),
  source: z.string().optional(),
  documentRef: z.string().optional(),
  hash: z.string().optional(),
  relationships: z.array(evidenceRelationshipSchema).default([]),
  status: evidenceStatusSchema.default("missing"),
  requirement: evidenceRequirementSchema.default("optional"),
  verificationNotes: z.string().optional(),
  confidence: z.enum(["high", "medium", "low", "unverified"]).default("unverified"),
  provenance: z.string().optional(),
  createdAt: z.string().default(() => new Date().toISOString()),
});
export type Evidence = z.infer<typeof evidenceSchema>;

// ── Lifecycle Transitions ────────────────────────────────────

const VALID_TRANSITIONS: Record<EvidenceStatus, EvidenceStatus[]> = {
  missing: ["provided", "not_applicable"],
  provided: ["under_review", "verified", "rejected", "missing"],
  under_review: ["verified", "rejected"],
  verified: [], // terminal — verified stays verified
  rejected: ["provided"], // can re-upload
  not_applicable: [], // terminal
};

export function canTransitionEvidence(from: EvidenceStatus, to: EvidenceStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionEvidence(evidence: Evidence, to: EvidenceStatus, notes?: string): Evidence {
  if (!canTransitionEvidence(evidence.status, to)) {
    throw new Error(`Invalid evidence transition: ${evidence.status} → ${to}`);
  }
  return {
    ...evidence,
    status: to,
    verificationNotes: notes ?? evidence.verificationNotes,
    confidence: to === "verified" ? "high" : to === "rejected" ? "low" : evidence.confidence,
  };
}

// ── Factory ──────────────────────────────────────────────────

export function createEvidence(
  type: EvidenceType,
  label: string,
  options?: {
    id?: string;
    caseId?: string;
    description?: string;
    source?: string;
    documentRef?: string;
    hash?: string;
    relatedFactIds?: string[];
    relationships?: EvidenceRelationship[];
    status?: EvidenceStatus;
    requirement?: EvidenceRequirement;
    verificationNotes?: string;
    confidence?: "high" | "medium" | "low" | "unverified";
    provenance?: string;
  },
): Evidence {
  const relationships = options?.relationships ??
    (options?.relatedFactIds
      ? options.relatedFactIds.map((factId) => ({
          factId,
          relationship: "supports" as const,
        }))
      : []);

  return evidenceSchema.parse({
    id: options?.id ?? crypto.randomUUID(),
    caseId: options?.caseId,
    type,
    label,
    description: options?.description,
    source: options?.source,
    documentRef: options?.documentRef,
    hash: options?.hash,
    relationships,
    status: options?.status ?? "missing",
    requirement: options?.requirement ?? "optional",
    verificationNotes: options?.verificationNotes,
    confidence: options?.confidence ?? "unverified",
    provenance: options?.provenance,
  });
}

export function addEvidenceRelationship(
  evidence: Evidence,
  factId: string,
  relationship: "supports" | "contradicts" | "contextualizes",
): Evidence {
  return {
    ...evidence,
    relationships: [
      ...evidence.relationships.filter((r) => r.factId !== factId),
      { factId, relationship },
    ],
  };
}

// ── Evidence Summary ────────────────────────────────────────

export function evidenceSummary(items: Evidence[]): {
  total: number;
  required: number;
  provided: number;
  verified: number;
  rejected: number;
  missing: number;
  notApplicable: number;
  ready: boolean;
} {
  const required = items.filter((i) => i.requirement === "required");
  const requiredMissing = required.filter((i) => i.status === "missing");
  const requiredRejected = required.filter((i) => i.status === "rejected");

  return {
    total: items.length,
    required: required.length,
    provided: items.filter((i) => i.status === "provided").length,
    verified: items.filter((i) => i.status === "verified").length,
    rejected: items.filter((i) => i.status === "rejected").length,
    missing: items.filter((i) => i.status === "missing").length,
    notApplicable: items.filter((i) => i.status === "not_applicable").length,
    ready: requiredMissing.length === 0 && requiredRejected.length === 0,
  };
}
