import { z } from "zod";

/* ═══════════════════════════════════════════════════════════
   VERSIONED RESPONSE GENERATION
   Responses are versioned artifacts — never silently
   overwrite a meaningful prior response.
   ═══════════════════════════════════════════════════════════ */

export const responseVersionSchema = z.object({
  id: z.string(),
  versionNumber: z.number().default(1),
  content: z.string(),
  strategyType: z.string().optional(),
  wordCount: z.number().default(0),
  unresolvedPlaceholders: z.number().default(0),
  createdBy: z.string().default("system"),
  createdAt: z.string(),
  /** What changed from the previous version */
  changeDescription: z.string().optional(),
  /** Source facts used in this version */
  sourceFactIds: z.array(z.string()).default([]),
  /** Strategy used */
  strategyId: z.string().optional(),
  /** Is this the final version? */
  isFinal: z.boolean().default(false),
  /** Hash for integrity */
  contentHash: z.string().optional(),
});
export type ResponseVersion = z.infer<typeof responseVersionSchema>;

export const versionedResponseSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  versions: z.array(responseVersionSchema).default([]),
  currentVersionId: z.string().optional(),
  currentVersionNumber: z.number().default(0),
  finalVersionId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type VersionedResponse = z.infer<typeof versionedResponseSchema>;

export function createVersionedResponse(caseId: string): VersionedResponse {
  const now = new Date().toISOString();
  return versionedResponseSchema.parse({
    id: crypto.randomUUID(),
    caseId,
    versions: [],
    currentVersionNumber: 0,
    createdAt: now,
    updatedAt: now,
  });
}

export function addVersion(
  vr: VersionedResponse,
  params: {
    content: string;
    strategyType?: string;
    strategyId?: string;
    sourceFactIds?: string[];
    changeDescription?: string;
    createdBy?: string;
    unresolvedPlaceholders?: number;
  },
): VersionedResponse {
  const versionNumber = vr.versions.length + 1;
  const wordCount = params.content.split(/\s+/).filter(Boolean).length;

  // Simple hash for integrity (non-cryptographic, just for change detection)
  let hash = 0;
  for (let i = 0; i < params.content.length; i++) {
    hash = ((hash << 5) - hash) + params.content.charCodeAt(i);
    hash |= 0;
  }

  const version: ResponseVersion = responseVersionSchema.parse({
    id: crypto.randomUUID(),
    versionNumber,
    content: params.content,
    strategyType: params.strategyType,
    strategyId: params.strategyId,
    sourceFactIds: params.sourceFactIds || [],
    wordCount,
    unresolvedPlaceholders: params.unresolvedPlaceholders || 0,
    createdBy: params.createdBy || "system",
    createdAt: new Date().toISOString(),
    changeDescription: params.changeDescription || `Version ${versionNumber}`,
    isFinal: false,
    contentHash: `v${versionNumber}_${Math.abs(hash).toString(16)}`,
  });

  return versionedResponseSchema.parse({
    ...vr,
    versions: [...vr.versions, version],
    currentVersionId: version.id,
    currentVersionNumber: versionNumber,
    updatedAt: new Date().toISOString(),
  });
}

export function finalizeVersion(vr: VersionedResponse, versionId: string): VersionedResponse {
  const versions = vr.versions.map((v) => ({
    ...v,
    isFinal: v.id === versionId,
  }));
  return versionedResponseSchema.parse({
    ...vr,
    versions,
    finalVersionId: versionId,
    updatedAt: new Date().toISOString(),
  });
}

export function getVersion(vr: VersionedResponse, versionId: string): ResponseVersion | undefined {
  return vr.versions.find((v) => v.id === versionId);
}

export function getCurrentVersion(vr: VersionedResponse): ResponseVersion | undefined {
  if (!vr.currentVersionId) return undefined;
  return getVersion(vr, vr.currentVersionId);
}

export function getFinalVersion(vr: VersionedResponse): ResponseVersion | undefined {
  if (!vr.finalVersionId) return undefined;
  return getVersion(vr, vr.finalVersionId);
}

export function getVersionHistory(vr: VersionedResponse): { version: number; createdAt: string; createdBy: string; changeDescription?: string; wordCount: number; isFinal: boolean }[] {
  return vr.versions.map((v) => ({
    version: v.versionNumber,
    createdAt: v.createdAt,
    createdBy: v.createdBy,
    changeDescription: v.changeDescription,
    wordCount: v.wordCount,
    isFinal: v.isFinal,
  }));
}

/* ── Self-improvement records ── */

export const correctionTypeSchema = z.enum([
  "user_correction",
  "model_error",
  "extraction_error",
  "deadline_error",
  "response_quality_issue",
  "ux_friction",
  "system_failure",
]);
export type CorrectionType = z.infer<typeof correctionTypeSchema>;

export const correctionRecordSchema = z.object({
  id: z.string(),
  type: correctionTypeSchema,
  field: z.string(),
  original: z.string(),
  corrected: z.string(),
  reason: z.string().optional(),
  createdAt: z.string(),
});
export type CorrectionRecord = z.infer<typeof correctionRecordSchema>;

export function recordCorrection(params: {
  type: CorrectionType;
  field: string;
  original: string;
  corrected: string;
  reason?: string;
}): CorrectionRecord {
  return correctionRecordSchema.parse({
    id: crypto.randomUUID(),
    type: params.type,
    field: params.field,
    original: params.original,
    corrected: params.corrected,
    reason: params.reason,
    createdAt: new Date().toISOString(),
  });
}
