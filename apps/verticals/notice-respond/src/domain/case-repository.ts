/* ═══════════════════════════════════════════════════════════
   CASE REPOSITORY — persistence abstraction layer.
   
   Separates analysis computation from persistence.
   The domain layer defines the interface; concrete implementations
   (in-memory, Supabase, etc.) live in the platform layer.
   
   The repository owns:
   - Save / load / delete cases (ownership-scoped)
   - List case summaries (ownership-scoped)
   - Audit log persistence (ownership-scoped)
   
   It does NOT own:
   - Analysis computation (domain services do that)
   - UI state (the component layer manages that)
   - Business rules (the domain model enforces those)
   
   OWNERSHIP CONTRACT:
   Every method that reads or mutates case data requires an ownerId.
   The repository enforces that the caller owns the resource —
   a mismatch returns null/false (not an error) to avoid leaking
   the existence of another user's cases.
   
   save() requires caseObj.ownerId to be non-empty.
   ═══════════════════════════════════════════════════════════ */

import type { NoticeCase, CaseSummary } from "./notice";
import type { AuditEntry } from "./audit";

export interface CaseRepository {
  /* ── Single-case operations (ownership-scoped) ── */
  
  /**
   * Persist a case. The case must have a non-empty ownerId.
   * Throws RepositoryError if ownerId is empty or save fails.
   */
  save(caseObj: NoticeCase): Promise<NoticeCase>;
  
  /**
   * Load a case by ID. Returns null if not found OR if the
   * caller (ownerId) does not own the case. This prevents
   * leaking the existence of other users' cases.
   */
  load(id: string, ownerId: string): Promise<NoticeCase | null>;
  
  /**
   * Delete a case. Returns false if not found OR if the
   * caller does not own the case.
   */
  delete(id: string, ownerId: string): Promise<boolean>;
  
  /**
   * Check if a case exists and is owned by the caller.
   */
  exists(id: string, ownerId: string): Promise<boolean>;

  /* ── List / query (ownership-scoped) ── */
  
  /**
   * List case summaries for a specific owner.
   * ownerId is required — no unscoped listing.
   */
  listSummaries(ownerId: string): Promise<CaseSummary[]>;
  
  /**
   * List case summaries filtered by status for a specific owner.
   * ownerId is required.
   */
  listByStatus(status: string, ownerId: string): Promise<CaseSummary[]>;

  /* ── Audit log (ownership-scoped) ── */
  
  /**
   * Persist an audit entry. The caller must own the case
   * referenced by entry.caseId (if set).
   */
  saveAudit(entry: AuditEntry, ownerId: string): Promise<void>;
  
  /**
   * Load audit entries for a case. Returns empty if the
   * caller does not own the case.
   */
  loadAudit(caseId: string, ownerId: string): Promise<AuditEntry[]>;
}

/* ── Error types ── */

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

export const RepositoryErrorCode = {
  NOT_FOUND: "NOT_FOUND",
  SAVE_FAILED: "SAVE_FAILED",
  LOAD_FAILED: "LOAD_FAILED",
  DELETE_FAILED: "DELETE_FAILED",
  NETWORK_ERROR: "NETWORK_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_CONFIGURED: "NOT_CONFIGURED",
} as const;
