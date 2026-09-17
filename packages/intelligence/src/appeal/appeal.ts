import { decisionSchema, type Decision } from "./decision.js";
import { appealGroundSchema, type AppealGround } from "./ground.js";
import { evidenceSchema, type AppealEvidence } from "./evidence.js";
import { argumentSchema, type AppealArgument } from "./argument.js";

export type AppealStatus = "draft" | "in_progress" | "ready" | "mailed" | "delivered" | "archived";
export type AppealMailingMethod = "standard" | "certified" | "registered";
export type AppealProofStatus = "assembled" | "mailed" | "in_transit" | "delivered" | "failed";

export interface AppealReadinessCheck {
  id: string;
  label: string;
  description: string;
  status: "pass" | "warning" | "fail";
  detail?: string;
}

export interface AppealReadinessReview {
  score: number;
  checks: AppealReadinessCheck[];
  issuesRequiringAttention: number;
  generatedAt: string;
}

export interface AppealExhibitEntry {
  number: string;
  evidenceId: string;
  label: string;
  pageRef?: string;
  description?: string;
}

export interface AppealPacket {
  id: string;
  appealId: string;
  finalLetter: string;
  attachmentIds: string[];
  exhibitIndex: AppealExhibitEntry[];
  recipientName: string;
  recipientAddress1: string;
  recipientAddress2?: string;
  recipientCity: string;
  recipientState: string;
  recipientZip: string;
  mailingMethod: AppealMailingMethod;
  pageCount: number;
  assembledAt: string;
}

export interface AppealProofPacket {
  id: string;
  appealId: string;
  packetId: string;
  finalAppealHash: string;
  attachmentHashes: string[];
  exhibitIndexHash?: string;
  recipientName: string;
  recipientAddress1: string;
  recipientCity: string;
  recipientState: string;
  recipientZip: string;
  mailingMethod: AppealMailingMethod;
  mailingTimestamp?: string;
  trackingNumber?: string;
  deliveryConfirmation?: string;
  transactionRecord?: string;
  providerOrderId?: string;
  status: AppealProofStatus;
  createdAt: string;
  sealedAt?: string;
}

export interface AppealTimelineEvent {
  id: string;
  date: string;
  description: string;
  source: "system" | "user" | "extraction";
}

export interface Appeal {
  id: string;
  workflowId: string;
  status: AppealStatus;
  decision: Decision;
  grounds: AppealGround[];
  evidence: AppealEvidence[];
  arguments: AppealArgument[];
  draft: string;
  review?: AppealReadinessReview;
  packet?: AppealPacket;
  proof?: AppealProofPacket;
  timeline: AppealTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAppealStatus(value: unknown): value is AppealStatus {
  return value === "draft" || value === "in_progress" || value === "ready" || value === "mailed" || value === "delivered" || value === "archived";
}

function parseReview(value: unknown): AppealReadinessReview | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || typeof value.score !== "number" || typeof value.issuesRequiringAttention !== "number" || typeof value.generatedAt !== "string" || !Array.isArray(value.checks)) {
    throw new Error("Invalid appeal readiness review");
  }
  return {
    score: Math.min(100, Math.max(0, value.score)),
    issuesRequiringAttention: Math.max(0, value.issuesRequiringAttention),
    generatedAt: value.generatedAt,
    checks: value.checks.map((entry) => {
      if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.label !== "string" || typeof entry.description !== "string") {
        throw new Error("Invalid appeal readiness check");
      }
      if (entry.status !== "pass" && entry.status !== "warning" && entry.status !== "fail") throw new Error("Invalid appeal readiness status");
      return {
        id: entry.id,
        label: entry.label,
        description: entry.description,
        status: entry.status,
        ...(typeof entry.detail === "string" ? { detail: entry.detail } : {}),
      };
    }),
  };
}

function parsePacket(value: unknown): AppealPacket | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.appealId !== "string" || typeof value.finalLetter !== "string") {
    throw new Error("Invalid appeal packet");
  }
  const method = value.mailingMethod;
  if (method !== "standard" && method !== "certified" && method !== "registered") throw new Error("Invalid appeal mailing method");
  if (!Array.isArray(value.attachmentIds) || !value.attachmentIds.every((entry) => typeof entry === "string")) throw new Error("Invalid appeal packet attachments");
  if (!Array.isArray(value.exhibitIndex)) throw new Error("Invalid appeal exhibit index");
  const exhibitIndex = value.exhibitIndex.map((entry) => {
    if (!isRecord(entry) || typeof entry.number !== "string" || typeof entry.evidenceId !== "string" || typeof entry.label !== "string") throw new Error("Invalid appeal exhibit entry");
    return {
      number: entry.number,
      evidenceId: entry.evidenceId,
      label: entry.label,
      ...(typeof entry.pageRef === "string" ? { pageRef: entry.pageRef } : {}),
      ...(typeof entry.description === "string" ? { description: entry.description } : {}),
    };
  });
  for (const field of ["recipientName", "recipientAddress1", "recipientCity", "recipientState", "recipientZip", "assembledAt"] as const) {
    if (typeof value[field] !== "string") throw new Error(`Invalid appeal packet ${field}`);
  }
  return {
    id: value.id,
    appealId: value.appealId,
    finalLetter: value.finalLetter,
    attachmentIds: value.attachmentIds as string[],
    exhibitIndex,
    recipientName: value.recipientName as string,
    recipientAddress1: value.recipientAddress1 as string,
    ...(typeof value.recipientAddress2 === "string" ? { recipientAddress2: value.recipientAddress2 } : {}),
    recipientCity: value.recipientCity as string,
    recipientState: value.recipientState as string,
    recipientZip: value.recipientZip as string,
    mailingMethod: method,
    pageCount: typeof value.pageCount === "number" && Number.isFinite(value.pageCount) ? value.pageCount : 1,
    assembledAt: value.assembledAt as string,
  };
}

function parseProof(value: unknown): AppealProofPacket | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error("Invalid appeal proof packet");
  const status = value.status;
  const mailingMethod = value.mailingMethod;
  if (status !== "assembled" && status !== "mailed" && status !== "in_transit" && status !== "delivered" && status !== "failed") throw new Error("Invalid appeal proof status");
  if (mailingMethod !== "standard" && mailingMethod !== "certified" && mailingMethod !== "registered") throw new Error("Invalid appeal proof mailing method");
  const required = ["id", "appealId", "packetId", "finalAppealHash", "recipientName", "recipientAddress1", "recipientCity", "recipientState", "recipientZip", "createdAt"] as const;
  for (const field of required) if (typeof value[field] !== "string") throw new Error(`Invalid appeal proof ${field}`);
  if (!Array.isArray(value.attachmentHashes) || !value.attachmentHashes.every((entry) => typeof entry === "string")) throw new Error("Invalid appeal proof attachment hashes");
  return {
    id: value.id as string,
    appealId: value.appealId as string,
    packetId: value.packetId as string,
    finalAppealHash: value.finalAppealHash as string,
    attachmentHashes: value.attachmentHashes as string[],
    recipientName: value.recipientName as string,
    recipientAddress1: value.recipientAddress1 as string,
    recipientCity: value.recipientCity as string,
    recipientState: value.recipientState as string,
    recipientZip: value.recipientZip as string,
    mailingMethod,
    status,
    createdAt: value.createdAt as string,
    ...(typeof value.exhibitIndexHash === "string" ? { exhibitIndexHash: value.exhibitIndexHash } : {}),
    ...(typeof value.mailingTimestamp === "string" ? { mailingTimestamp: value.mailingTimestamp } : {}),
    ...(typeof value.trackingNumber === "string" ? { trackingNumber: value.trackingNumber } : {}),
    ...(typeof value.deliveryConfirmation === "string" ? { deliveryConfirmation: value.deliveryConfirmation } : {}),
    ...(typeof value.transactionRecord === "string" ? { transactionRecord: value.transactionRecord } : {}),
    ...(typeof value.providerOrderId === "string" ? { providerOrderId: value.providerOrderId } : {}),
    ...(typeof value.sealedAt === "string" ? { sealedAt: value.sealedAt } : {}),
  };
}

function parseTimeline(value: unknown): AppealTimelineEvent[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Invalid appeal timeline");
  return value.map((entry) => {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.date !== "string" || typeof entry.description !== "string") throw new Error("Invalid appeal timeline event");
    if (entry.source !== "system" && entry.source !== "user" && entry.source !== "extraction") throw new Error("Invalid appeal timeline source");
    return { id: entry.id, date: entry.date, description: entry.description, source: entry.source };
  });
}

export const appealSchema = {
  parse(input: unknown): Appeal {
    if (!isRecord(input) || typeof input.id !== "string" || typeof input.workflowId !== "string" || input.workflowId.length === 0) {
      throw new Error("Invalid appeal");
    }
    if (!isAppealStatus(input.status)) throw new Error("Invalid appeal status");
    if (typeof input.createdAt !== "string" || typeof input.updatedAt !== "string") throw new Error("Appeal timestamps are required");
    const grounds = input.grounds === undefined ? [] : Array.isArray(input.grounds) ? input.grounds.map((entry) => appealGroundSchema.parse(entry)) : (() => { throw new Error("Invalid appeal grounds"); })();
    const evidence = input.evidence === undefined ? [] : Array.isArray(input.evidence) ? input.evidence.map((entry) => evidenceSchema.parse(entry)) : (() => { throw new Error("Invalid appeal evidence"); })();
    const argumentsList = input.arguments === undefined ? [] : Array.isArray(input.arguments) ? input.arguments.map((entry) => argumentSchema.parse(entry)) : (() => { throw new Error("Invalid appeal arguments"); })();
    const review = parseReview(input.review);
    const packet = parsePacket(input.packet);
    const proof = parseProof(input.proof);
    return {
      id: input.id,
      workflowId: input.workflowId,
      status: input.status,
      decision: decisionSchema.parse(input.decision),
      grounds,
      evidence,
      arguments: argumentsList,
      draft: typeof input.draft === "string" ? input.draft : "",
      timeline: parseTimeline(input.timeline),
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      ...(review ? { review } : {}),
      ...(packet ? { packet } : {}),
      ...(proof ? { proof } : {}),
    };
  },
};

export function createAppeal(workflowId: string, decision: Decision): Appeal {
  const now = new Date().toISOString();
  return appealSchema.parse({
    id: crypto.randomUUID(),
    workflowId,
    status: "draft",
    decision,
    grounds: [],
    evidence: [],
    arguments: [],
    draft: "",
    timeline: [],
    createdAt: now,
    updatedAt: now,
  });
}

export function canPersistMailedStatus(appeal: Appeal): boolean {
  const proof = appeal.proof;
  if (!proof?.providerOrderId?.trim() || !proof.mailingTimestamp?.trim()) return false;
  return proof.status === "mailed" || proof.status === "in_transit" || proof.status === "delivered";
}

export function updateAppeal(appeal: Appeal, updates: Partial<Appeal>): Appeal {
  const next = appealSchema.parse({ ...appeal, ...updates, updatedAt: new Date().toISOString() });
  if ((updates.status === "mailed" || updates.status === "delivered") && !canPersistMailedStatus(next)) {
    throw new Error("Cannot mark appeal as mailed or delivered without provider order, mailing timestamp, and provider-backed proof status");
  }
  return next;
}

export function isReadyToMail(appeal: Appeal): boolean {
  if (appeal.status !== "ready" || !appeal.review) return false;
  const { issuesRequiringAttention: issues, score } = appeal.review;
  return (score >= 60 && issues === 0) || (score >= 80 && issues <= 2);
}

export function inferProgress(appeal: Appeal): number {
  let progress = 0;
  if (appeal.decision.facts.length > 0 || appeal.decision.agency) progress += 15;
  if (appeal.decision.deadline?.date) progress += 10;
  if (appeal.decision.reasons.length > 0) progress += 10;
  if (appeal.grounds.length > 0) progress += 20;
  if (appeal.evidence.length > 0) progress += 15;
  if (appeal.draft.length > 50) progress += 15;
  if (appeal.review) progress += 10;
  if (appeal.packet) progress += 5;
  return Math.min(100, progress);
}
