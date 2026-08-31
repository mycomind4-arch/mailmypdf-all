/* ═══════════════════════════════════════════════════════════
   IN-MEMORY CASE REPOSITORY
   
   Implementation for development, testing, and SSR.
   Cases are stored in a Map; audit entries in an array.
   No persistence across server restarts.
   
   OWNERSHIP ENFORCEMENT:
   All access methods verify ownership. A caller requesting
   another user's case gets null/false — same as "not found".
   This prevents leaking the existence of other users' data.
   
   For production, use SupabaseCaseRepository instead.
   ═══════════════════════════════════════════════════════════ */

import type { NoticeCase, CaseSummary } from "../domain/notice";
import { deserializeCase, serializeCase, toCaseSummary } from "../domain/notice";
import type { AuditEntry } from "../domain/audit";
import type { CaseRepository } from "../domain/case-repository";
import { RepositoryError, RepositoryErrorCode } from "../domain/case-repository";

export class InMemoryCaseRepository implements CaseRepository {
  private store = new Map<string, Record<string, unknown>>();
  private auditStore: AuditEntry[] = [];

  /** Composite key: ownerId + ":" + caseId — prevents cross-owner overwrites */
  private key(ownerId: string, id: string): string {
    return `${ownerId}:${id}`;
  }

  /* ── Sync methods (for tests and SSR) ── */

  saveSync(caseObj: NoticeCase): NoticeCase {
    if (!caseObj.ownerId) {
      throw new RepositoryError(
        "Cannot save a case without an owner",
        RepositoryErrorCode.VALIDATION_ERROR,
      );
    }
    const serialized = serializeCase(caseObj);
    this.store.set(this.key(caseObj.ownerId, caseObj.id), serialized);
    return caseObj;
  }

  loadSync(id: string, ownerId: string): NoticeCase | null {
    const data = this.store.get(this.key(ownerId, id));
    if (!data) return null;
    return deserializeCase(data);
  }

  deleteSync(id: string, ownerId: string): boolean {
    const k = this.key(ownerId, id);
    if (!this.store.has(k)) return false;
    return this.store.delete(k);
  }

  existsSync(id: string, ownerId: string): boolean {
    return this.store.has(this.key(ownerId, id));
  }

  listSummariesSync(ownerId: string): CaseSummary[] {
    const summaries: CaseSummary[] = [];
    for (const data of this.store.values()) {
      if (data.ownerId !== ownerId) continue;
      try {
        const caseObj = deserializeCase(data);
        summaries.push(toCaseSummary(caseObj));
      } catch {
        // Skip corrupted entries
      }
    }
    summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return summaries;
  }

  listByStatusSync(status: string, ownerId: string): CaseSummary[] {
    return this.listSummariesSync(ownerId).filter((s) => s.status === status);
  }

  saveAuditSync(entry: AuditEntry, ownerId: string): void {
    // If the entry references a case, verify ownership
    if (entry.caseId) {
      const caseData = this.store.get(this.key(ownerId, entry.caseId));
      if (!caseData) {
        // Case not owned by this user — check if it exists at all
        // If it exists under another owner, this is unauthorized
        for (const data of this.store.values()) {
          if (data.id === entry.caseId) {
            throw new RepositoryError(
              "Cannot save audit entry for a case owned by another user",
              RepositoryErrorCode.UNAUTHORIZED,
            );
          }
        }
        // Case doesn't exist at all — allow (might be created later)
      }
    }
    this.auditStore.push(entry);
  }

  loadAuditSync(caseId: string, ownerId: string): AuditEntry[] {
    // Verify ownership of the case
    const caseData = this.store.get(this.key(ownerId, caseId));
    if (!caseData) return [];
    return this.auditStore.filter((e) => e.caseId === caseId);
  }

  /* ── Async methods (CaseRepository interface) ── */

  async save(caseObj: NoticeCase): Promise<NoticeCase> {
    try {
      return this.saveSync(caseObj);
    } catch (err) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError(
        `Failed to save case ${caseObj.id}`,
        RepositoryErrorCode.SAVE_FAILED,
        err,
      );
    }
  }

  async load(id: string, ownerId: string): Promise<NoticeCase | null> {
    try {
      return this.loadSync(id, ownerId);
    } catch (err) {
      throw new RepositoryError(
        `Failed to load case ${id}`,
        RepositoryErrorCode.LOAD_FAILED,
        err,
      );
    }
  }

  async delete(id: string, ownerId: string): Promise<boolean> {
    return this.deleteSync(id, ownerId);
  }

  async exists(id: string, ownerId: string): Promise<boolean> {
    return this.existsSync(id, ownerId);
  }

  async listSummaries(ownerId: string): Promise<CaseSummary[]> {
    return this.listSummariesSync(ownerId);
  }

  async listByStatus(status: string, ownerId: string): Promise<CaseSummary[]> {
    return this.listByStatusSync(status, ownerId);
  }

  async saveAudit(entry: AuditEntry, ownerId: string): Promise<void> {
    this.saveAuditSync(entry, ownerId);
  }

  async loadAudit(caseId: string, ownerId: string): Promise<AuditEntry[]> {
    return this.loadAuditSync(caseId, ownerId);
  }

  /* ── Test helpers ── */

  clear(): void {
    this.store.clear();
    this.auditStore = [];
  }

  size(): number {
    return this.store.size;
  }
}

/* ── Singleton (used during dev/SSR before Supabase is wired) ── */

let singleton: InMemoryCaseRepository | null = null;

export function getInMemoryRepository(): InMemoryCaseRepository {
  if (!singleton) {
    singleton = new InMemoryCaseRepository();
  }
  return singleton;
}

export function resetInMemoryRepository(): void {
  if (singleton) {
    singleton.clear();
    singleton = null;
  }
}
