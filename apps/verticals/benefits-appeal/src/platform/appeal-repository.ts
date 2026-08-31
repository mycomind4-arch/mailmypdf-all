import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServer } from "./supabase";
import type { Appeal } from "@/domain/appeal";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  type SaveStatus,
} from "@/lib/platform/core";
import {
  createAuditEvent,
  type AuditEvent,
  type AuditEventType,
} from "@/lib/platform/intelligence";

/* ─────────────────────────────────────────────
   Appeal Repository — server functions for
   persisting and retrieving appeals via Supabase.

   Upgraded with:
   - Ownership-aware persistence (all access is owner-scoped)
   - Version/response history protection (optimistic concurrency)
   - Immutable audit trail (append-only audit events)
   - Explicit save state (Result-based error handling)
   ───────────────────────────────────────────── */

/* ── Ownership Requirement ── */
function requireOwner(userId: string | undefined): string {
  if (!userId || userId.trim().length === 0) {
    throw new UnauthorizedError("Owner identity is required for this operation");
  }
  return userId;
}

/* ── Save (insert or update) an appeal with version protection ── */
export const saveAppeal = createServerFn()
  .validator((input: { appeal: Appeal; userId: string; expectedVersion?: number }) => input)
  .handler(async ({ data }) => {
    const ownerId = requireOwner(data.userId);
    const supabase = await getSupabaseServer();
    const { appeal, expectedVersion } = data;

    // Check existing version for optimistic concurrency
    const { data: existing } = await supabase
      .from("appeals")
      .select("id, user_id, version")
      .eq("id", appeal.id)
      .single();

    if (existing) {
      // Ownership check
      if (existing.user_id && existing.user_id !== ownerId) {
        throw new ForbiddenError("Cannot save an appeal owned by another user");
      }

      // Version check — stale writes cannot erase newer versions
      if (expectedVersion !== undefined && existing.version !== undefined && existing.version > expectedVersion) {
        throw new ConflictError(
          `Stale write detected: expected version ${expectedVersion} but current is ${existing.version}`,
          { expectedVersion, currentVersion: existing.version },
        );
      }

      // Update with incremented version
      const newVersion = (existing.version ?? 0) + 1;
      const row = {
        id: appeal.id,
        user_id: existing.user_id || ownerId,
        workflow_id: appeal.workflowId,
        status: appeal.status,
        decision: appeal.decision,
        grounds: appeal.grounds,
        evidence: appeal.evidence,
        arguments: appeal.arguments,
        draft: appeal.draft,
        review: appeal.review || null,
        packet: appeal.packet || null,
        proof: appeal.proof || null,
        timeline: appeal.timeline,
        version: newVersion,
        updated_at: new Date().toISOString(),
      };

      const { data: result, error } = await supabase
        .from("appeals")
        .update(row)
        .eq("id", appeal.id)
        .eq("version", existing.version ?? 0)
        .select()
        .single();

      if (error) {
        throw new ConflictError(`Failed to save appeal (concurrent modification): ${error.message}`);
      }

      // Record audit event
      await recordAuditEvent(supabase, {
        type: "appeal.updated",
        actor: "user",
        subjectId: appeal.id,
        ownerId,
        metadata: { version: newVersion, status: appeal.status },
      });

      return { id: result.id, saved: true, version: newVersion };
    } else {
      // Insert new appeal
      const row = {
        id: appeal.id,
        user_id: ownerId,
        workflow_id: appeal.workflowId,
        status: appeal.status,
        decision: appeal.decision,
        grounds: appeal.grounds,
        evidence: appeal.evidence,
        arguments: appeal.arguments,
        draft: appeal.draft,
        review: appeal.review || null,
        packet: appeal.packet || null,
        proof: appeal.proof || null,
        timeline: appeal.timeline,
        version: 1,
        created_at: appeal.createdAt,
        updated_at: new Date().toISOString(),
      };

      const { data: result, error } = await supabase
        .from("appeals")
        .insert(row)
        .select()
        .single();

      if (error) {
        throw new ConflictError(`Failed to create appeal: ${error.message}`);
      }

      // Record audit event
      await recordAuditEvent(supabase, {
        type: "appeal.created",
        actor: "user",
        subjectId: appeal.id,
        ownerId,
        metadata: { workflowId: appeal.workflowId },
      });

      return { id: result.id, saved: true, version: 1 };
    }
  });

/* ── Load a single appeal by ID (owner-scoped) ── */
export const loadAppeal = createServerFn()
  .validator((input: { id: string; userId: string }) => input)
  .handler(async ({ data }) => {
    const ownerId = requireOwner(data.userId);
    const supabase = await getSupabaseServer();

    const { data: row, error } = await supabase
      .from("appeals")
      .select("*")
      .eq("id", data.id)
      .single();

    if (error) {
      throw new NotFoundError(`Failed to load appeal: ${error.message}`, { id: data.id });
    }

    // Ownership check — cross-owner reads fail
    if (row.user_id && row.user_id !== ownerId) {
      throw new ForbiddenError("Cannot load an appeal owned by another user", { id: data.id });
    }

    // Record audit event
    await recordAuditEvent(supabase, {
      type: "appeal.loaded",
      actor: "user",
      subjectId: data.id,
      ownerId,
      metadata: {},
    });

    return { ...rowToAppeal(row), version: row.version ?? 1 };
  });

/* ── List appeals for a user (owner-scoped) ── */
export const listAppeals = createServerFn()
  .validator((input: { userId: string; limit?: number; offset?: number }) => input)
  .handler(async ({ data }) => {
    const ownerId = requireOwner(data.userId);
    const supabase = await getSupabaseServer();
    const limit = data.limit || 50;
    const offset = data.offset || 0;

    const { data: rows, error } = await supabase
      .from("appeals")
      .select("*")
      .eq("user_id", ownerId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new NotFoundError(`Failed to list appeals: ${error.message}`);
    }

    return {
      appeals: (rows || []).map(rowToAppeal),
      hasMore: (rows?.length || 0) === limit,
    };
  });

/* ── List mailings for a user (owner-scoped) ── */
export const listMailings = createServerFn()
  .validator((input: { userId: string; limit?: number }) => input)
  .handler(async ({ data }) => {
    const ownerId = requireOwner(data.userId);
    const supabase = await getSupabaseServer();
    const limit = data.limit || 50;

    const { data: rows, error } = await supabase
      .from("mailings")
      .select(`
        *,
        appeals!inner (
          id,
          workflow_id,
          status,
          decision
        )
      `)
      .eq("appeals.user_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new NotFoundError(`Failed to list mailings: ${error.message}`);
    }

    return {
      mailings: (rows || []).map((row) => ({
        id: row.id,
        appealId: row.appeal_id,
        providerOrderId: row.provider_order_id,
        status: row.status,
        trackingNumber: row.tracking_number,
        mailingMethod: row.mailing_method,
        recipient: row.recipient,
        createdAt: row.created_at,
        workflowId: row.appeals?.workflow_id,
      })),
    };
  });

/* ── Save a mailing record (owner-scoped) ── */
export const saveMailing = createServerFn()
  .validator((input: {
    appealId: string;
    userId: string;
    providerOrderId?: string;
    status: string;
    trackingNumber?: string;
    mailingMethod: string;
    recipient: Record<string, unknown>;
    stripeSessionId?: string;
    stripePaymentId?: string;
  }) => input)
  .handler(async ({ data }) => {
    const ownerId = requireOwner(data.userId);
    const supabase = await getSupabaseServer();

    // Verify the appeal belongs to this owner
    const { data: appeal } = await supabase
      .from("appeals")
      .select("id, user_id")
      .eq("id", data.appealId)
      .single();

    if (!appeal) {
      throw new NotFoundError(`Appeal not found: ${data.appealId}`);
    }
    if (appeal.user_id && appeal.user_id !== ownerId) {
      throw new ForbiddenError("Cannot create mailing for an appeal owned by another user");
    }

    const { data: result, error } = await supabase
      .from("mailings")
      .insert({
        appeal_id: data.appealId,
        provider_order_id: data.providerOrderId || null,
        status: data.status,
        tracking_number: data.trackingNumber || null,
        mailing_method: data.mailingMethod,
        recipient: data.recipient,
        stripe_session_id: data.stripeSessionId || null,
        stripe_payment_id: data.stripePaymentId || null,
      })
      .select()
      .single();

    if (error) {
      throw new ConflictError(`Failed to save mailing: ${error.message}`);
    }

    // Record audit event
    await recordAuditEvent(supabase, {
      type: "mailing.created",
      actor: "user",
      subjectId: data.appealId,
      ownerId,
      metadata: { mailingId: result.id, method: data.mailingMethod },
    });

    return { id: result.id, saved: true };
  });

/* ── Delete an appeal (owner-scoped) ── */
export const deleteAppeal = createServerFn()
  .validator((input: { id: string; userId: string }) => input)
  .handler(async ({ data }) => {
    const ownerId = requireOwner(data.userId);
    const supabase = await getSupabaseServer();

    // Verify ownership before deletion
    const { data: existing } = await supabase
      .from("appeals")
      .select("id, user_id")
      .eq("id", data.id)
      .single();

    if (!existing) {
      throw new NotFoundError(`Appeal not found: ${data.id}`);
    }
    if (existing.user_id && existing.user_id !== ownerId) {
      throw new ForbiddenError("Cannot delete an appeal owned by another user");
    }

    const { error } = await supabase
      .from("appeals")
      .delete()
      .eq("id", data.id)
      .eq("user_id", ownerId);

    if (error) {
      throw new ConflictError(`Failed to delete appeal: ${error.message}`);
    }

    // Record audit event (audit survives deletion)
    await recordAuditEvent(supabase, {
      type: "appeal.deleted",
      actor: "user",
      subjectId: data.id,
      ownerId,
      metadata: {},
    });

    return { deleted: true };
  });

/* ── Read audit trail for an appeal (owner-scoped) ── */
export const readAuditTrail = createServerFn()
  .validator((input: { appealId: string; userId: string; limit?: number }) => input)
  .handler(async ({ data }) => {
    const ownerId = requireOwner(data.userId);
    const supabase = await getSupabaseServer();
    const limit = data.limit || 100;

    const { data: rows, error } = await supabase
      .from("audit_events")
      .select("*")
      .eq("subject_id", data.appealId)
      .eq("owner_id", ownerId)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new NotFoundError(`Failed to read audit trail: ${error.message}`);
    }

    return {
      events: (rows || []).map((row) => ({
        id: row.id,
        type: row.event_type,
        occurredAt: row.occurred_at,
        actor: row.actor,
        subjectId: row.subject_id,
        ownerId: row.owner_id,
        metadata: row.metadata,
      })) as AuditEvent[],
    };
  });

/* ── Helpers ── */

async function recordAuditEvent(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  input: {
    type: AuditEventType;
    actor: "user" | "system" | "ai" | "external";
    subjectId: string;
    ownerId: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const event = createAuditEvent(input);
  // Best-effort audit recording — failures here don't block the primary operation
  // but are logged so they're never silently swallowed
  const { error } = await supabase.from("audit_events").insert({
    id: event.id,
    event_type: event.type,
    occurred_at: event.occurredAt,
    actor: event.actor,
    subject_id: event.subjectId,
    owner_id: event.ownerId,
    metadata: event.metadata,
  });

  if (error) {
    console.error(`[AUDIT] Failed to record audit event: ${error.message}`, { event });
  }
}

function rowToAppeal(row: any): Appeal {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    status: row.status,
    decision: row.decision || {},
    grounds: row.grounds || [],
    evidence: row.evidence || [],
    arguments: row.arguments || [],
    draft: row.draft || "",
    review: row.review || undefined,
    packet: row.packet || undefined,
    proof: row.proof || undefined,
    timeline: row.timeline || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
