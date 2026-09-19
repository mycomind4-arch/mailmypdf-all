import { timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";

const DEFAULT_DRAFT_RETENTION_HOURS = 24;
const DEFAULT_CLEANUP_BATCH_SIZE = 100;
const MAX_CLEANUP_BATCH_SIZE = 500;
const CLEANUP_MARKER = "Expired unpaid draft cleanup";

export type DraftCleanupFailure = {
  orderId: string;
  stage: "claim" | "events" | "order" | "storage";
  message: string;
  storagePath?: string;
};

export type DraftCleanupResult = {
  cutoff: string;
  eligible: number;
  claimed: number;
  deleted: number;
  failed: DraftCleanupFailure[];
  dryRun: boolean;
};

function configuredInteger(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function configuredCleanupSecret(): string {
  const secret = process.env.MAILMYPDF_CLEANUP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("MAILMYPDF_CLEANUP_SECRET must contain at least 32 characters");
  }
  return secret;
}

function equalSecret(candidate: string, expected: string): boolean {
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  if (candidateBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(candidateBytes, expectedBytes);
}

export function requireCleanupAuthorization(request: Request): void {
  const authorization = request.headers.get("authorization");
  const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!supplied || !equalSecret(supplied, configuredCleanupSecret())) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

export function draftCleanupCutoff(now = new Date()): string {
  const retentionHours = configuredInteger(
    "MAILMYPDF_DRAFT_RETENTION_HOURS",
    DEFAULT_DRAFT_RETENTION_HOURS,
    1,
    168,
  );
  return new Date(now.getTime() - retentionHours * 60 * 60 * 1000).toISOString();
}

export async function cleanupExpiredDrafts(options: { dryRun?: boolean; now?: Date } = {}): Promise<DraftCleanupResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cutoff = draftCleanupCutoff(options.now);
  const batchSize = configuredInteger(
    "MAILMYPDF_CLEANUP_BATCH_SIZE",
    DEFAULT_CLEANUP_BATCH_SIZE,
    1,
    MAX_CLEANUP_BATCH_SIZE,
  );

  const { data: drafts, error: selectError } = await supabaseAdmin
    .from("orders")
    .select("id, pdf_storage_path, created_at, status, stripe_session_id")
    .eq("status", "draft")
    .is("stripe_session_id", null)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (selectError) throw new Error(`Could not select expired drafts: ${selectError.message}`);

  const eligible = drafts ?? [];
  const result: DraftCleanupResult = {
    cutoff,
    eligible: eligible.length,
    claimed: 0,
    deleted: 0,
    failed: [],
    dryRun: options.dryRun === true,
  };

  if (result.dryRun) return result;

  for (const draft of eligible) {
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("orders")
      .update({ status: "cancelled", admin_notes: CLEANUP_MARKER })
      .eq("id", draft.id)
      .eq("status", "draft")
      .is("stripe_session_id", null)
      .lt("created_at", cutoff)
      .select("id");

    if (claimError) {
      result.failed.push({ orderId: draft.id, stage: "claim", message: claimError.message });
      continue;
    }
    if (!claimed || claimed.length !== 1) continue;
    result.claimed += 1;

    const { error: eventsError } = await supabaseAdmin
      .from("order_events")
      .delete()
      .eq("order_id", draft.id);
    if (eventsError) {
      result.failed.push({ orderId: draft.id, stage: "events", message: eventsError.message });
      continue;
    }

    const { data: deleted, error: orderError } = await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", draft.id)
      .eq("status", "cancelled")
      .eq("admin_notes", CLEANUP_MARKER)
      .select("id");
    if (orderError || !deleted || deleted.length !== 1) {
      result.failed.push({
        orderId: draft.id,
        stage: "order",
        message: orderError?.message ?? "Claimed draft could not be deleted",
      });
      continue;
    }

    const { error: storageError } = await supabaseAdmin.storage
      .from("order-pdfs")
      .remove([draft.pdf_storage_path]);
    if (storageError) {
      result.failed.push({
        orderId: draft.id,
        stage: "storage",
        message: storageError.message,
        storagePath: draft.pdf_storage_path,
      });
      continue;
    }

    result.deleted += 1;
  }

  if (result.failed.length > 0) {
    logger.error("Draft cleanup completed with failures", { failed: result.failed.length, deleted: result.deleted });
  } else {
    console.info("MailMyPDF draft cleanup completed", result);
  }

  return result;
}
