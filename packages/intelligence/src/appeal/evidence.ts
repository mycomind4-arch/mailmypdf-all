/* Appeal-specific evidence model promoted from the legacy Appeal Mail domain. */

export const APPEAL_EVIDENCE_TYPES = [
  "document",
  "excerpt",
  "testimonial",
  "photographic",
  "record",
  "correspondence",
] as const;

export type AppealEvidenceType = (typeof APPEAL_EVIDENCE_TYPES)[number];

export const EVIDENCE_TYPE_LABELS: Record<AppealEvidenceType, string> = {
  document: "Document",
  excerpt: "Excerpt / Quote",
  testimonial: "Testimonial / Statement",
  photographic: "Photograph / Image",
  record: "Official Record",
  correspondence: "Correspondence / Communication",
};

export interface AppealEvidence {
  id: string;
  type: AppealEvidenceType;
  label: string;
  documentId?: string;
  documentFilename?: string;
  excerpt?: string;
  pageRef?: string;
  groundIds: string[];
  exhibitNumber?: string;
  uploadedAt?: string;
  hash?: string;
  notes?: string;
}

export type Evidence = AppealEvidence;

export interface EvidenceLink {
  evidenceId: string;
  groundId: string;
  relationship: "supports" | "contradicts" | "contextual";
  excerpt?: string;
  pageRef?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEvidenceType(value: unknown): value is AppealEvidenceType {
  return typeof value === "string" && (APPEAL_EVIDENCE_TYPES as readonly string[]).includes(value);
}

export const evidenceSchema = {
  parse(input: unknown): AppealEvidence {
    if (!isRecord(input) || typeof input.id !== "string" || !isEvidenceType(input.type) || typeof input.label !== "string") {
      throw new Error("Invalid appeal evidence");
    }
    const groundIds = input.groundIds === undefined
      ? []
      : Array.isArray(input.groundIds) && input.groundIds.every((value) => typeof value === "string")
        ? input.groundIds as string[]
        : (() => { throw new Error("Invalid appeal evidence ground ids"); })();
    return {
      id: input.id,
      type: input.type,
      label: input.label,
      groundIds,
      ...(typeof input.documentId === "string" ? { documentId: input.documentId } : {}),
      ...(typeof input.documentFilename === "string" ? { documentFilename: input.documentFilename } : {}),
      ...(typeof input.excerpt === "string" ? { excerpt: input.excerpt } : {}),
      ...(typeof input.pageRef === "string" ? { pageRef: input.pageRef } : {}),
      ...(typeof input.exhibitNumber === "string" ? { exhibitNumber: input.exhibitNumber } : {}),
      ...(typeof input.uploadedAt === "string" ? { uploadedAt: input.uploadedAt } : {}),
      ...(typeof input.hash === "string" ? { hash: input.hash } : {}),
      ...(typeof input.notes === "string" ? { notes: input.notes } : {}),
    };
  },
};

export const evidenceLinkSchema = {
  parse(input: unknown): EvidenceLink {
    if (!isRecord(input) || typeof input.evidenceId !== "string" || typeof input.groundId !== "string") {
      throw new Error("Invalid appeal evidence link");
    }
    if (input.relationship !== "supports" && input.relationship !== "contradicts" && input.relationship !== "contextual") {
      throw new Error("Invalid appeal evidence relationship");
    }
    return {
      evidenceId: input.evidenceId,
      groundId: input.groundId,
      relationship: input.relationship,
      ...(typeof input.excerpt === "string" ? { excerpt: input.excerpt } : {}),
      ...(typeof input.pageRef === "string" ? { pageRef: input.pageRef } : {}),
    };
  },
};

export function createEvidence(type: AppealEvidenceType, label: string, partial: Partial<AppealEvidence> = {}): AppealEvidence {
  return evidenceSchema.parse({ id: crypto.randomUUID(), type, label, groundIds: [], ...partial });
}

export function evidenceForGround(evidence: AppealEvidence[], groundId: string): AppealEvidence[] {
  return evidence.filter((item) => item.groundIds.includes(groundId));
}

export function unsupportedGrounds(evidence: AppealEvidence[], groundIds: string[]): string[] {
  // The legacy implementation compared Evidence.type to "contextual", although
  // "contextual" is a link relationship rather than an evidence type. During
  // migration that impossible comparison is removed; any linked evidence item
  // counts as evidence for the ground. Relationship-sensitive checks should use
  // EvidenceLink instead.
  return groundIds.filter((groundId) => !evidence.some((item) => item.groundIds.includes(groundId)));
}

export function generateExhibitIndex(evidence: AppealEvidence[]): Array<{ number: string; evidenceId: string; label: string; pageRef?: string }> {
  return evidence
    .filter((item) => item.type !== "excerpt")
    .map((item, index) => ({
      number: `Exhibit ${String.fromCharCode(65 + index)}`,
      evidenceId: item.id,
      label: item.label,
      ...(item.pageRef ? { pageRef: item.pageRef } : {}),
    }));
}
