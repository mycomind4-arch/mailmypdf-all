import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canonicalActionJson,
  type ActionExecutionStore,
  type ActionAuthorization,
  type ActionRecord,
} from "@mailmypdf/agent-runtime";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database, Json } from "@/integrations/supabase/types";
import type { AuthenticatedUserContext } from "@/lib/secure-core/auth.server";
import {
  RecoveryCaseError,
  type RecoveryCasePersistence,
  type StoredRecoveryCase,
} from "./recovery-case-service";

const uuid = z.string().uuid();
const timestamp = z.string().datetime({ offset: true });
const text = z.string().min(1).max(4000);
const money = z.object({
  amountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  currency: z.string().regex(/^[A-Z]{3}$/),
});
const goalSchema = z.object({
  schema: z.literal("mailmypdf.case-goal/v1"),
  id: uuid,
  ownerId: uuid,
  objective: text,
  desiredOutcome: text,
  category: text,
  subject: text.optional(),
  soughtValue: money.optional(),
  evidenceIds: z.array(uuid).max(1000),
  matterIds: z.array(uuid).max(1000),
  actionKeys: z.array(z.string().max(256)).max(1000),
  state: z.enum(["intake", "active", "waiting", "resolved", "cancelled"]),
  revision: z.number().int().positive(),
  createdAt: timestamp,
  updatedAt: timestamp,
  waiting: z.object({ reason: text, dueAt: timestamp.optional() }).optional(),
  resolution: z
    .object({
      outcome: text,
      evidenceIds: z.array(uuid).min(1),
      recoveredValue: money.optional(),
      confirmedBy: uuid,
    })
    .optional(),
});
const transaction = z.object({
  id: text,
  accountId: text,
  merchant: text,
  amountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z.string().regex(/^[A-Z]{3}$/),
  postedAt: timestamp,
  state: z.enum(["settled", "pending", "reversed"]),
  kind: z.enum(["debit", "credit"]),
  invoiceId: text.optional(),
  reversesTransactionId: text.optional(),
});
const sourceSchema = z.object({
  evidenceTrust: z.literal("user-supplied-unverified"),
  transactions: z.array(transaction).max(2000),
  candidate: z.object({
    id: text,
    type: z.literal("possible-duplicate-charge"),
    merchant: text,
    accountId: text,
    amountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    currency: z.string().regex(/^[A-Z]{3}$/),
    confidence: z.enum(["strong-evidence", "needs-review"]),
    transactionIds: z.array(text),
    duplicateTransactionIds: z.array(text),
    reason: text,
    nextStep: text,
  }),
});
const reviewSchema = z.object({
  tool: z.string().min(1).max(256),
  version: z.number().int().positive(),
  ownerId: uuid,
  actorId: uuid,
  caseId: uuid,
  connectionId: uuid,
  runId: z.string().min(1).max(256),
  idempotencyKey: z.string().min(1).max(256),
  requestSha256: z.string().regex(/^[a-f0-9]{64}$/),
  requiresApproval: z.boolean(),
  effect: z.enum(["none", "email", "storage", "browser", "payment", "mailing"]),
});
const actionSchema = z.object({
  review: reviewSchema,
  state: z.enum(["running", "succeeded", "failed", "needs_review"]),
  revision: z.number().int().positive(),
  startedAt: timestamp,
  updatedAt: timestamp,
  approvalId: uuid.optional(),
  output: z.unknown().optional(),
  errorCode: z.string().optional(),
});
function identity(context: AuthenticatedUserContext) {
  const parsed = uuid.safeParse(context.user.id);
  if (!parsed.success) throw new RecoveryCaseError(403, "Recovery owner authorization denied.");
  return (ownerId: string) => {
    if (ownerId !== parsed.data)
      throw new RecoveryCaseError(403, "Recovery owner authorization denied.");
  };
}
function fail(): never {
  throw new RecoveryCaseError(
    503,
    "Recovery storage is unavailable. Try again after reloading the case.",
  );
}
function json(value: unknown, max = 262144): Json {
  const content = canonicalActionJson(value);
  if (Buffer.byteLength(content, "utf8") > max)
    throw new RecoveryCaseError(400, "Recovery storage payload exceeds its limit.");
  return JSON.parse(content) as Json;
}
function decodeCase(raw: unknown, ownerId: string): StoredRecoveryCase {
  const result = z
    .object({
      id: uuid,
      owner_id: uuid,
      creation_key: z.string(),
      request_sha256: z.string().regex(/^[a-f0-9]{64}$/),
      goal: goalSchema,
      source: sourceSchema,
    })
    .safeParse(raw);
  if (
    !result.success ||
    result.data.owner_id !== ownerId ||
    result.data.goal.ownerId !== ownerId ||
    result.data.goal.id !== result.data.id
  )
    fail();
  const row = result.data;
  return {
    goal: row.goal,
    source: row.source,
    creationKey: row.creation_key,
    requestSha256: row.request_sha256,
  };
}
function decodeAction(raw: unknown, ownerId: string, key: string): ActionRecord {
  const result = z
    .object({ owner_id: uuid, idempotency_key: z.string(), record: actionSchema })
    .safeParse(raw);
  if (
    !result.success ||
    result.data.owner_id !== ownerId ||
    result.data.idempotency_key !== key ||
    result.data.record.review.ownerId !== ownerId ||
    result.data.record.review.actorId !== ownerId ||
    result.data.record.review.idempotencyKey !== key
  )
    fail();
  return result.data.record;
}
/** Reads use the verified user's RLS client. Service-role writes retain explicit owner predicates and DB guards. */
export function createRecoveryCaseStore(
  context: AuthenticatedUserContext,
  admin: SupabaseClient<Database> = supabaseAdmin,
): RecoveryCasePersistence {
  const owned = identity(context),
    read = context.supabase;
  return {
    async create(input) {
      owned(input.goal.ownerId);
      const ownerId = input.goal.ownerId;
      const { data, error } = await admin
        .from("recovery_case_goals")
        .insert({
          id: input.goal.id,
          owner_id: ownerId,
          creation_key: input.creationKey,
          request_sha256: input.requestSha256,
          goal: json(input.goal, 100000),
          source: json(input.source, 100000),
        })
        .select("*")
        .single();
      if (!error) return { stored: decodeCase(data, ownerId), replayed: false };
      if (error.code !== "23505") fail();
      const previous = await read
        .from("recovery_case_goals")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("creation_key", input.creationKey)
        .maybeSingle();
      if (previous.error || !previous.data) fail();
      const stored = decodeCase(previous.data, ownerId);
      if (stored.requestSha256 !== input.requestSha256)
        throw new RecoveryCaseError(
          409,
          "Recovery case retry key conflicts with a different request.",
        );
      return { stored, replayed: true };
    },
    async loadOwned(ownerId, id) {
      owned(ownerId);
      const { data, error } = await read
        .from("recovery_case_goals")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("id", id)
        .maybeSingle();
      if (error) fail();
      return data ? decodeCase(data, ownerId) : undefined;
    },
    async listOwned(ownerId, limit) {
      owned(ownerId);
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
        throw new RecoveryCaseError(400, "Invalid recovery list limit.");
      const { data, error } = await read
        .from("recovery_case_goals")
        .select("*")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit);
      if (error || !data) fail();
      return data.map((row) => decodeCase(row, ownerId));
    },
    async assertOwnedReferences(ownerId, _caseId, evidenceIds, matterIds) {
      owned(ownerId);
      for (const [table, ids] of [
        ["secure_documents", evidenceIds],
        ["workflow_cases", matterIds],
      ] as const) {
        if (!ids.length) continue;
        const unique = [...new Set(ids)];
        const { data, error } = await read
          .from(table)
          .select("id")
          .eq("owner_id", ownerId)
          .in("id", unique);
        if (error) fail();
        if (!data || data.length !== unique.length)
          throw new RecoveryCaseError(404, "Owned evidence or matter not found.");
      }
    },
    async save(goal, expectedRevision) {
      owned(goal.ownerId);
      const { data, error } = await admin
        .from("recovery_case_goals")
        .update({ goal: json(goal, 100000) })
        .eq("owner_id", goal.ownerId)
        .eq("id", goal.id)
        .eq("revision", expectedRevision)
        .select("*");
      if (error) fail();
      if (!data?.length)
        throw new RecoveryCaseError(409, "Recovery case revision changed. Reload before updating.");
      return decodeCase(data[0], goal.ownerId);
    },
  };
}
export function createRecoveryActionStore(
  context: AuthenticatedUserContext,
  admin: SupabaseClient<Database> = supabaseAdmin,
): ActionExecutionStore {
  const owned = identity(context),
    read = context.supabase;
  async function loadOwned(ownerId: string, key: string) {
    owned(ownerId);
    const { data, error } = await read
      .from("recovery_action_executions")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("idempotency_key", key)
      .maybeSingle();
    if (error) fail();
    return data ? decodeAction(data, ownerId, key) : undefined;
  }
  return {
    loadOwned,
    async claim(record) {
      const r = record.review;
      owned(r.ownerId);
      const { data, error } = await admin
        .from("recovery_action_executions")
        .insert({
          owner_id: r.ownerId,
          idempotency_key: r.idempotencyKey,
          case_id: r.caseId,
          connection_id: r.connectionId,
          approval_id: record.approvalId ?? null,
          request_sha256: r.requestSha256,
          record: json(record),
        })
        .select("*")
        .single();
      if (!error) return { created: true, record: decodeAction(data, r.ownerId, r.idempotencyKey) };
      if (error.code !== "23505") fail();
      const previous = await loadOwned(r.ownerId, r.idempotencyKey);
      if (!previous) fail();
      return { created: false, record: previous };
    },
    async finish(record, expectedRevision) {
      const r = record.review;
      owned(r.ownerId);
      const { data, error } = await admin
        .from("recovery_action_executions")
        .update({ record: json(record) })
        .eq("owner_id", r.ownerId)
        .eq("idempotency_key", r.idempotencyKey)
        .eq("revision", expectedRevision)
        .eq("state", "running")
        .select("owner_id");
      if (error) fail();
      if (!data?.length) throw new Error("ACTION_STORE_CONFLICT");
    },
  };
}
export function createRecoveryActionAuthorization(
  context: AuthenticatedUserContext,
): ActionAuthorization {
  const owned = identity(context),
    read = context.supabase;
  return {
    async authorize(request) {
      owned(request.ownerId);
      owned(request.actorId);
      const goal = await read
        .from("recovery_case_goals")
        .select("id,owner_id,state")
        .eq("owner_id", request.ownerId)
        .eq("id", request.caseId)
        .maybeSingle();
      if (goal.error) fail();
      if (
        !goal.data ||
        goal.data.owner_id !== request.ownerId ||
        goal.data.id !== request.caseId ||
        !["intake", "active", "waiting"].includes(goal.data.state)
      )
        throw new RecoveryCaseError(403, "Recovery action authorization denied.");
      const connection = await read
        .from("recovery_provider_connections")
        .select("id,owner_id,provider,status,scopes")
        .eq("owner_id", request.ownerId)
        .eq("id", request.connectionId)
        .maybeSingle();
      if (connection.error) fail();
      const c = connection.data;
      if (
        !c ||
        c.id !== request.connectionId ||
        c.owner_id !== request.ownerId ||
        c.provider !== "gmail" ||
        c.status !== "active" ||
        !Array.isArray(c.scopes) ||
        c.scopes.some((scope: unknown) => typeof scope !== "string")
      )
        throw new RecoveryCaseError(403, "Recovery action authorization denied.");
      return { scopes: c.scopes as string[] };
    },
    async loadApproval(ownerId, id) {
      owned(ownerId);
      const { data, error } = await read
        .from("recovery_action_approvals")
        .select("id,owner_id,approved_by,request_sha256,status,approved_at,expires_at")
        .eq("owner_id", ownerId)
        .eq("id", id)
        .maybeSingle();
      if (error) fail();
      if (!data || data.status !== "approved") return undefined;
      const parsed = z
        .object({
          id: uuid,
          owner_id: uuid,
          approved_by: uuid,
          request_sha256: z.string().regex(/^[a-f0-9]{64}$/),
          status: z.literal("approved"),
          approved_at: timestamp,
          expires_at: timestamp,
        })
        .safeParse(data);
      if (
        !parsed.success ||
        parsed.data.id !== id ||
        parsed.data.owner_id !== ownerId ||
        parsed.data.approved_by !== ownerId
      )
        fail();
      const a = parsed.data;
      return {
        id: a.id,
        ownerId: a.owner_id,
        approvedBy: a.approved_by,
        requestSha256: a.request_sha256,
        status: a.status,
        approvedAt: a.approved_at,
        expiresAt: a.expires_at,
      };
    },
  };
}
