import { z } from "zod";

/* ═══════════════════════════════════════════════════════════
   AUDIT LOG — durable trail of meaningful case activity.
   Never logs raw sensitive document contents.
   ═══════════════════════════════════════════════════════════ */

export const auditActionSchema = z.enum([
  "case_created",
  "case_deleted",
  "document_uploaded",
  "document_processed",
  "document_deleted",
  "fact_extracted",
  "fact_corrected",
  "fact_confirmed",
  "deadline_calculated",
  "deadline_confirmed",
  "evidence_added",
  "evidence_removed",
  "finding_raised",
  "finding_resolved",
  "finding_dismissed",
  "strategy_selected",
  "strategy_changed",
  "response_generated",
  "response_edited",
  "response_finalized",
  "response_version_created",
  "export_created",
  "contradiction_detected",
  "contradiction_resolved",
  "missing_info_identified",
  "missing_info_resolved",
  "settings_changed",
  "voice_narration_started",
  "voice_dictation_started",
  "mailing_initiated",
  "proof_packet_sealed",
  "security_event",
  "rate_limit_hit",
  "auth_failure",
  "authz_failure",
]);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  actor: z.string(),           // user ID or "system"
  action: auditActionSchema,
  objectType: z.string(),      // "case", "document", "fact", etc.
  objectId: z.string().optional(),
  caseId: z.string().optional(),
  result: z.enum(["success", "failure", "warning"]).default("success"),
  /** Brief description — NO raw document content, NO PII */
  description: z.string(),
  /** Redacted metadata — safe to log */
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  /** Security event flag */
  isSecurityEvent: z.boolean().default(false),
  /** Correlation ID for tracing */
  correlationId: z.string().optional(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export function createAuditEntry(params: {
  actor: string;
  action: AuditAction;
  objectType: string;
  description: string;
  objectId?: string;
  caseId?: string;
  result?: "success" | "failure" | "warning";
  metadata?: Record<string, string | number | boolean | null>;
  isSecurityEvent?: boolean;
  correlationId?: string;
}): AuditEntry {
  return auditEntrySchema.parse({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actor: params.actor,
    action: params.action,
    objectType: params.objectType,
    objectId: params.objectId,
    caseId: params.caseId,
    result: params.result || "success",
    description: params.description,
    metadata: params.metadata || {},
    isSecurityEvent: params.isSecurityEvent || false,
    correlationId: params.correlationId,
  });
}

/* ── Audit log (in-memory store, designed for persistence) ── */

export class AuditLog {
  private entries: AuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries: number = 10000) {
    this.maxEntries = maxEntries;
  }

  log(entry: AuditEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  record(params: Parameters<typeof createAuditEntry>[0]): AuditEntry {
    const entry = createAuditEntry(params);
    this.log(entry);
    return entry;
  }

  getByCase(caseId: string): AuditEntry[] {
    return this.entries.filter((e) => e.caseId === caseId);
  }

  getByAction(action: AuditAction): AuditEntry[] {
    return this.entries.filter((e) => e.action === action);
  }

  getSecurityEvents(): AuditEntry[] {
    return this.entries.filter((e) => e.isSecurityEvent);
  }

  getByActor(actor: string): AuditEntry[] {
    return this.entries.filter((e) => e.actor === actor);
  }

  getRecent(limit: number = 50): AuditEntry[] {
    return this.entries.slice(-limit).reverse();
  }

  getAll(): AuditEntry[] {
    return [...this.entries];
  }

  size(): number {
    return this.entries.length;
  }

  /* Redact sensitive data from an entry before serialization */
  redact(entry: AuditEntry): AuditEntry {
    const redacted = { ...entry };
    // Never include raw document content in descriptions
    if (redacted.description.length > 500) {
      redacted.description = redacted.description.substring(0, 500) + "... [redacted]";
    }
    return redacted;
  }
}

/* ── Redaction helpers ── */

export function redactForLog(text: string): string {
  if (!text) return "";
  return text
    // Email addresses
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[REDACTED_EMAIL]")
    // Phone numbers
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[REDACTED_PHONE]")
    // SSN
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_SSN]")
    // Credit card numbers
    .replace(/\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b/g, "[REDACTED_CC]")
    // API keys
    .replace(/\b(sk-[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16}|ghp_[a-zA-Z0-9]{36})\b/g, "[REDACTED_KEY]")
    // Street addresses (basic)
    .replace(/\b\d{1,6}\s+[A-Z][a-z]+\s+(?:St|Ave|Blvd|Rd|Dr|Ln|Way|Ct|Cir|Pl)\b\.?/g, "[REDACTED_ADDRESS]")
    // Truncate long content
    .substring(0, 1000);
}
