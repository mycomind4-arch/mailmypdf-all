/* ═══════════════════════════════════════════════════════════
   SUPABASE CASE REPOSITORY
   
   Persists cases to Supabase. Each case is stored as a single
   row in the `cases` table, with the full case JSON in a `data`
   column. Audit entries go in the `audit_entries` table.
   
   OWNERSHIP ENFORCEMENT:
   All queries are scoped by owner_id. A caller cannot load,
   delete, or list another user's cases. RLS policies at the
   database level provide a second layer of enforcement.
   
   RESPONSE VERSION PROTECTION:
   On save, if the stored case has a responseVersioning with more
   versions than the incoming case, versions are merged (appended
   only) to prevent accidental history loss from stale writes.
   
   AUDIT DURABILITY:
   Audit entries are persisted to a separate table and are
   immutable — they are never updated or deleted through the
   repository interface.
   ═══════════════════════════════════════════════════════════ */

import type { NoticeCase, CaseSummary } from "../domain/notice";
import { deserializeCase, serializeCase, toCaseSummary } from "../domain/notice";
import type { AuditEntry } from "../domain/audit";
import type { CaseRepository } from "../domain/case-repository";
import { RepositoryError, RepositoryErrorCode } from "../domain/case-repository";
import { getSupabase } from "./supabase-client";
import type { VersionedResponse } from "../domain/versioning";

export class SupabaseCaseRepository implements CaseRepository {
  private get table() {
    const supabase = getSupabase();
    if (!supabase) {
      throw new RepositoryError(
        "Supabase client not initialized",
        RepositoryErrorCode.NOT_CONFIGURED,
      );
    }
    return supabase.from("cases");
  }

  private get auditTable() {
    const supabase = getSupabase();
    if (!supabase) {
      throw new RepositoryError(
        "Supabase client not initialized",
        RepositoryErrorCode.NOT_CONFIGURED,
      );
    }
    return supabase.from("audit_entries");
  }

  /**
   * Merge versioned responses to prevent accidental history loss.
   * If the stored case has more versions than the incoming case,
   * append the incoming new versions to the stored history.
   */
  private mergeVersioning(
    stored: NoticeCase | null,
    incoming: NoticeCase,
  ): NoticeCase {
    if (!stored?.responseVersioning || !incoming.responseVersioning) {
      return incoming;
    }

    const storedVersions = stored.responseVersioning.versions || [];
    const incomingVersions = incoming.responseVersioning.versions || [];

    // If incoming has at least as many versions as stored, no merge needed
    if (incomingVersions.length >= storedVersions.length) {
      return incoming;
    }

    // Stale write detected — merge: keep all stored versions, add any new ones
    const storedIds = new Set(storedVersions.map((v: { id: string }) => v.id));
    const newVersions = incomingVersions.filter((v: { id: string }) => !storedIds.has(v.id));
    const mergedVersions = [...storedVersions, ...newVersions];

    const mergedVersioning: VersionedResponse = {
      ...stored.responseVersioning,
      versions: mergedVersions,
      // Use the incoming current version if it exists in merged set, else keep stored
      currentVersionId: incoming.responseVersioning.currentVersionId ||
        stored.responseVersioning.currentVersionId,
      currentVersionNumber: Math.max(
        incoming.responseVersioning.currentVersionNumber,
        stored.responseVersioning.currentVersionNumber,
      ),
      finalVersionId: incoming.responseVersioning.finalVersionId ||
        stored.responseVersioning.finalVersionId,
      updatedAt: new Date().toISOString(),
    };

    return {
      ...incoming,
      responseVersioning: mergedVersioning,
    };
  }

  async save(caseObj: NoticeCase): Promise<NoticeCase> {
    if (!caseObj.ownerId) {
      throw new RepositoryError(
        "Cannot save a case without an owner",
        RepositoryErrorCode.VALIDATION_ERROR,
      );
    }

    try {
      // Load existing to protect version history
      const existing = await this.load(caseObj.id, caseObj.ownerId);
      const toSave = this.mergeVersioning(existing, caseObj);

      const data = serializeCase(toSave);
      const summary = toCaseSummary(toSave);

      const row = {
        id: caseObj.id,
        owner_id: caseObj.ownerId,
        status: caseObj.status,
        notice_type: caseObj.noticeType,
        agency: caseObj.agency || null,
        reference_number: caseObj.referenceNumber || null,
        notice_date: caseObj.noticeDate || null,
        readiness_score: caseObj.readinessScore,
        health_status: caseObj.healthStatus,
        deadline_date: summary.deadlineDate || null,
        has_draft: summary.hasDraft,
        has_mailing: summary.hasMailing,
        created_at: caseObj.createdAt,
        updated_at: caseObj.updatedAt,
        data: data,
      };

      const { error } = await this.table.upsert(row, { onConflict: "id" });

      if (error) {
        throw new RepositoryError(
          `Supabase save failed: ${error.message}`,
          RepositoryErrorCode.SAVE_FAILED,
          error,
        );
      }

      return toSave;
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
      // Query by both id AND owner_id — ownership enforced at query level
      const { data, error } = await this.table
        .select("data")
        .eq("id", id)
        .eq("owner_id", ownerId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // Not found or not owned
        throw new RepositoryError(
          `Supabase load failed: ${error.message}`,
          RepositoryErrorCode.LOAD_FAILED,
          error,
        );
      }

      if (!data?.data) return null;
      return deserializeCase(data.data as Record<string, unknown>);
    } catch (err) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError(
        `Failed to load case ${id}`,
        RepositoryErrorCode.LOAD_FAILED,
        err,
      );
    }
  }

  async delete(id: string, ownerId: string): Promise<boolean> {
    try {
      // Delete only if owned by the caller
      const { error } = await this.table
        .delete()
        .eq("id", id)
        .eq("owner_id", ownerId);

      if (error) {
        throw new RepositoryError(
          `Supabase delete failed: ${error.message}`,
          RepositoryErrorCode.DELETE_FAILED,
          error,
        );
      }

      return true;
    } catch (err) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError(
        `Failed to delete case ${id}`,
        RepositoryErrorCode.DELETE_FAILED,
        err,
      );
    }
  }

  async exists(id: string, ownerId: string): Promise<boolean> {
    try {
      const { data, error } = await this.table
        .select("id")
        .eq("id", id)
        .eq("owner_id", ownerId)
        .maybeSingle();

      if (error) return false;
      return !!data;
    } catch {
      return false;
    }
  }

  async listSummaries(ownerId: string): Promise<CaseSummary[]> {
    try {
      const { data, error } = await this.table
        .select(
          "id, workflow_id, status, notice_type, agency, reference_number, notice_date, readiness_score, health_status, deadline_date, has_draft, has_mailing, created_at, updated_at",
        )
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false });

      if (error) {
        throw new RepositoryError(
          `Supabase list failed: ${error.message}`,
          RepositoryErrorCode.LOAD_FAILED,
          error,
        );
      }

      if (!data) return [];

      return this.mapSummaries(data);
    } catch (err) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError(
        "Failed to list cases",
        RepositoryErrorCode.LOAD_FAILED,
        err,
      );
    }
  }

  async listByStatus(status: string, ownerId: string): Promise<CaseSummary[]> {
    try {
      const { data, error } = await this.table
        .select(
          "id, workflow_id, status, notice_type, agency, reference_number, notice_date, readiness_score, health_status, deadline_date, has_draft, has_mailing, created_at, updated_at",
        )
        .eq("status", status)
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false });

      if (error) {
        throw new RepositoryError(
          `Supabase listByStatus failed: ${error.message}`,
          RepositoryErrorCode.LOAD_FAILED,
          error,
        );
      }

      if (!data) return [];

      return this.mapSummaries(data);
    } catch (err) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError(
        "Failed to list cases by status",
        RepositoryErrorCode.LOAD_FAILED,
        err,
      );
    }
  }

  async saveAudit(entry: AuditEntry, ownerId: string): Promise<void> {
    try {
      // If entry references a case, verify ownership
      if (entry.caseId) {
        const owned = await this.exists(entry.caseId, ownerId);
        if (!owned) {
          throw new RepositoryError(
            "Cannot save audit entry for a case owned by another user",
            RepositoryErrorCode.UNAUTHORIZED,
          );
        }
      }

      const { error } = await this.auditTable.insert({
        id: entry.id,
        case_id: entry.caseId || null,
        actor: entry.actor,
        action: entry.action,
        object_type: entry.objectType,
        description: entry.description,
        result: entry.result,
        is_security_event: entry.isSecurityEvent,
        timestamp: entry.timestamp,
        data: entry,
      });

      if (error) {
        // Duplicate insert (immutable entries) — check if it's a PK conflict
        if (error.code === "23505") {
          // Already saved — idempotent, not an error
          return;
        }
        throw new RepositoryError(
          `Supabase audit save failed: ${error.message}`,
          RepositoryErrorCode.SAVE_FAILED,
          error,
        );
      }
    } catch (err) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError(
        "Failed to save audit entry",
        RepositoryErrorCode.SAVE_FAILED,
        err,
      );
    }
  }

  async loadAudit(caseId: string, ownerId: string): Promise<AuditEntry[]> {
    try {
      // Verify ownership of the case
      const owned = await this.exists(caseId, ownerId);
      if (!owned) return [];

      const { data, error } = await this.auditTable
        .select("data")
        .eq("case_id", caseId)
        .order("timestamp", { ascending: true });

      if (error) {
        throw new RepositoryError(
          `Supabase audit load failed: ${error.message}`,
          RepositoryErrorCode.LOAD_FAILED,
          error,
        );
      }

      if (!data) return [];
      return data.map((row: any) => row.data as AuditEntry);
    } catch (err) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError(
        "Failed to load audit entries",
        RepositoryErrorCode.LOAD_FAILED,
        err,
      );
    }
  }

  private mapSummaries(data: any[]): CaseSummary[] {
    return data.map((row: any) => ({
      id: row.id,
      workflowId: row.workflow_id,
      status: row.status,
      noticeType: row.notice_type,
      agency: row.agency || undefined,
      referenceNumber: row.reference_number || undefined,
      noticeDate: row.notice_date || undefined,
      readinessScore: row.readiness_score,
      healthStatus: row.health_status,
      deadlineDate: row.deadline_date || undefined,
      hasDraft: row.has_draft,
      hasMailing: row.has_mailing,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}
