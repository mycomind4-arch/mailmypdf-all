import { z } from "zod";
import {
  actionSha256,
  canonicalActionJson,
  createCaseGoal,
  transitionCaseGoal,
  type CaseGoal,
} from "@mailmypdf/agent-runtime";
import type { RecoveryCandidate, RecoveryTransaction } from "@mailmypdf/intelligence";
import { screenProvidedRecoveryTransactions } from "./recovery-scan";

export class RecoveryCaseError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export interface RecoverySource {
  candidate: RecoveryCandidate;
  transactions: readonly RecoveryTransaction[];
  evidenceTrust: "user-supplied-unverified";
}
export interface StoredRecoveryCase {
  goal: CaseGoal;
  source: RecoverySource;
  creationKey: string;
  requestSha256: string;
}
export interface RecoveryCasePersistence {
  create(input: StoredRecoveryCase): Promise<{ stored: StoredRecoveryCase; replayed: boolean }>;
  loadOwned(ownerId: string, id: string): Promise<StoredRecoveryCase | undefined>;
  listOwned(ownerId: string, limit: number): Promise<StoredRecoveryCase[]>;
  assertOwnedReferences(
    ownerId: string,
    caseId: string,
    evidenceIds: readonly string[],
    matterIds: readonly string[],
  ): Promise<void>;
  save(goal: CaseGoal, expectedRevision: number): Promise<StoredRecoveryCase>;
}
const uuid = z.string().uuid();
const text = (max = 4000) => z.string().trim().min(1).max(max);
const money = z
  .object({
    amountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    currency: z.string().regex(/^[A-Z]{3}$/),
  })
  .strict();
export const recoveryCaseEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("activate") }).strict(),
  z.object({ type: z.literal("attach-evidence"), evidenceId: uuid }).strict(),
  z.object({ type: z.literal("link-matter"), matterId: uuid }).strict(),
  z
    .object({
      type: z.literal("wait"),
      reason: text(),
      dueAt: z.string().datetime({ offset: true }).optional(),
    })
    .strict(),
  z.object({ type: z.literal("resume") }).strict(),
  z
    .object({
      type: z.literal("resolve"),
      outcome: text(),
      evidenceIds: z.array(uuid).min(1).max(1000),
      recoveredValue: money.optional(),
    })
    .strict(),
  z.object({ type: z.literal("cancel") }).strict(),
]);
export const saveRecoveryCaseSchema = z
  .object({
    transactions: z.array(z.unknown()).min(2).max(2000),
    candidate_id: text(4000),
    desired_outcome: text(),
    user_confirmed_save: z.literal(true),
    idempotency_key: z.string().regex(/^[A-Za-z0-9._:-]{8,128}$/),
  })
  .strict();
export const getRecoveryCaseSchema = z.object({ case_id: uuid }).strict();
export const listRecoveryCasesSchema = z
  .object({ limit: z.number().int().min(1).max(100).default(25) })
  .strict();
export const updateRecoveryCaseSchema = z
  .object({
    case_id: uuid,
    expected_revision: z.number().int().min(1).max(2147483646),
    event: recoveryCaseEventSchema,
    user_confirmed_resolution: z.literal(true).optional(),
  })
  .strict()
  .refine((value) => value.event.type !== "resolve" || value.user_confirmed_resolution === true);
function parse<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw new RecoveryCaseError(400, "Invalid recovery case request.");
  return result.data;
}
function owner(value: string) {
  return parse(uuid, value);
}
function view(stored: StoredRecoveryCase) {
  return {
    case: structuredClone(stored.goal),
    source: structuredClone(stored.source),
    externalActionsAuthorized: false as const,
  };
}
const clock = { now: () => new Date().toISOString(), newId: (): string => crypto.randomUUID() };

/** Explicit intake only. A supplied invoice link is provenance, never independently verified evidence. */
export async function createRecoveryCaseFromScan(
  raw: unknown,
  ownerId: string,
  store: RecoveryCasePersistence,
  time = clock,
) {
  owner(ownerId);
  const args = parse(saveRecoveryCaseSchema, raw);
  let source: RecoverySource;
  try {
    const transactions = JSON.parse(
      canonicalActionJson(args.transactions),
    ) as RecoveryTransaction[];
    const result = screenProvidedRecoveryTransactions({ transactions });
    for (const transaction of transactions)
      transaction.postedAt = new Date(transaction.postedAt).toISOString();
    const candidate = result.scan.candidates.find((value) => value.id === args.candidate_id);
    if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
    const ids = new Set(candidate.transactionIds);
    source = {
      candidate,
      transactions: transactions.filter(
        (value) =>
          ids.has(value.id) ||
          (value.reversesTransactionId && ids.has(value.reversesTransactionId)),
      ),
      evidenceTrust: "user-supplied-unverified",
    };
    // Leave headroom below the SQL jsonb bound, which includes formatting overhead.
    if (Buffer.byteLength(canonicalActionJson(source), "utf8") > 100_000)
      throw new Error("SOURCE_TOO_LARGE");
  } catch {
    throw new RecoveryCaseError(400, "Invalid recovery candidate or transaction data.");
  }
  const requestSha256 = await actionSha256({
    ownerId,
    source,
    desiredOutcome: args.desired_outcome,
  });
  const goal = createCaseGoal({
    id: time.newId(),
    ownerId,
    objective: "Review a possible duplicate charge and recover any confirmed excess.",
    desiredOutcome: args.desired_outcome,
    category: "billing-recovery",
    subject: source.candidate.merchant.trim().slice(0, 500),
    soughtValue: { amountMinor: source.candidate.amountMinor, currency: source.candidate.currency },
    now: time.now(),
  });
  const result = await store.create({
    goal,
    source,
    creationKey: args.idempotency_key,
    requestSha256,
  });
  return { ...view(result.stored), replayed: result.replayed };
}
export async function getRecoveryCase(
  raw: unknown,
  ownerId: string,
  store: RecoveryCasePersistence,
) {
  owner(ownerId);
  const args = parse(getRecoveryCaseSchema, raw);
  const stored = await store.loadOwned(ownerId, args.case_id);
  if (!stored) throw new RecoveryCaseError(404, "Recovery case not found.");
  return view(stored);
}
export async function listRecoveryCases(
  raw: unknown,
  ownerId: string,
  store: RecoveryCasePersistence,
) {
  owner(ownerId);
  const args = parse(listRecoveryCasesSchema, raw);
  return {
    cases: (await store.listOwned(ownerId, args.limit)).map(view),
    externalActionsAuthorized: false as const,
  };
}
export async function updateRecoveryCase(
  raw: unknown,
  ownerId: string,
  store: RecoveryCasePersistence,
  time: Pick<typeof clock, "now"> = clock,
) {
  owner(ownerId);
  const args = parse(updateRecoveryCaseSchema, raw);
  const stored = await store.loadOwned(ownerId, args.case_id);
  if (!stored) throw new RecoveryCaseError(404, "Recovery case not found.");
  if (stored.goal.revision !== args.expected_revision)
    throw new RecoveryCaseError(409, "Recovery case revision changed. Reload before updating.");
  const event = args.event;
  const evidence =
    event.type === "attach-evidence"
      ? [event.evidenceId]
      : event.type === "resolve"
        ? event.evidenceIds
        : [];
  const matters = event.type === "link-matter" ? [event.matterId] : [];
  await store.assertOwnedReferences(ownerId, args.case_id, evidence, matters);
  let next: CaseGoal;
  try {
    next = transitionCaseGoal(stored.goal, ownerId, event, time.now());
  } catch {
    throw new RecoveryCaseError(
      400,
      "Invalid recovery case transition, deadline, or resolution evidence.",
    );
  }
  return view(await store.save(next, args.expected_revision));
}
