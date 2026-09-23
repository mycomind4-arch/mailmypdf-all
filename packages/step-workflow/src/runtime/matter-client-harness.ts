/**
 * Wires a `StepWorkflowDefinition`-shaped UI to a real backend matter via
 * `@mailmypdf/workflows`'s `WorkflowMatterClient`, instead of this package's
 * own `StepMatterRepository`/Supabase persistence.
 *
 * Key modeling decision: `WorkflowMatterRecord.id` (from
 * `createHttpWorkflowMatterClient`) is the single source of truth. Step
 * state (`StepMatterState`) is derived client-side from the live
 * matter/analysis/input/draft/approval snapshots on every load, the same
 * way `NoticeResponseWorkflow.tsx` and `cp14-response/definition.ts`'s
 * `cp14CompletedSteps` already do it ad hoc. This avoids running two
 * persistence backends for one workflow.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  WorkflowDocumentRole,
  WorkflowMailingAddress,
  WorkflowMatterAnalysis,
  WorkflowMatterClient,
  WorkflowMatterDocument,
  WorkflowMatterRecord,
  WorkflowPacketPreview,
} from "@mailmypdf/workflows";
import {
  createStepMatterState,
  getActiveSteps,
  type StepMatterState,
  type StepState,
  type StepWorkflowDefinition,
} from "../step-workflow.js";

/**
 * Everything a `deriveSteps` function needs to work out per-step status and
 * data from the live backend state. All fields mirror what
 * `NoticeResponseWorkflow.tsx` loads in parallel on restore.
 */
export interface StepProjectionContext {
  matter: WorkflowMatterRecord;
  documents: WorkflowMatterDocument[];
  analysis: WorkflowMatterAnalysis | null;
  input: { version: number; input: Record<string, unknown> } | null;
  draft: { version: number; bodyText: string; createdAt: string } | null;
  approval: { approvalId: string; packetSha256: string; quote: WorkflowPacketPreview["quote"] } | null;
}

/**
 * Per-step projection a `deriveSteps` implementation returns for each step
 * id it wants to override. Steps not mentioned keep their
 * not-started/in-progress defaults from `createStepMatterState`.
 */
export type StepProjectionPatch = Partial<Pick<StepState, "status" | "checklist" | "data" | "completedAt">>;

export type DeriveSteps = (context: StepProjectionContext) => Record<string, StepProjectionPatch>;

/**
 * Pure function: project a live `WorkflowMatterClient` snapshot onto a
 * `StepMatterState`, using `deriveSteps` to compute each step's
 * status/checklist/data from the snapshot. Unit-testable without a DOM.
 */
export function projectMatterToStepState(
  definition: StepWorkflowDefinition,
  deriveSteps: DeriveSteps,
  snapshot: StepProjectionContext,
): StepMatterState {
  const base = createStepMatterState({
    id: snapshot.matter.id,
    ownerId: snapshot.matter.id,
    definition,
    now: snapshot.matter.createdAt,
  });

  const patches = deriveSteps(snapshot);
  const steps: Record<string, StepState> = { ...base.steps };
  for (const [stepId, patch] of Object.entries(patches)) {
    const current = steps[stepId];
    if (!current) continue;
    steps[stepId] = {
      ...current,
      ...patch,
      data: { ...current.data, ...(patch.data ?? {}) },
      checklist: patch.checklist ?? current.checklist,
    };
  }

  const approved = Boolean(snapshot.approval);
  const activeSteps = getActiveSteps(definition, { ...base, steps });
  const currentStep =
    activeSteps.find((step) => steps[step.id]?.status !== "complete") ?? activeSteps[activeSteps.length - 1];

  return {
    ...base,
    updatedAt: snapshot.matter.updatedAt,
    steps,
    approved,
    approvedAt: snapshot.approval ? snapshot.matter.updatedAt : null,
    currentStepId: currentStep ? currentStep.id : base.currentStepId,
  };
}

async function loadSnapshot(
  client: WorkflowMatterClient,
  matterId: string,
): Promise<StepProjectionContext> {
  const [matterSnapshot, analysis, input, draft, approval] = await Promise.all([
    client.loadMatter(matterId),
    client.loadAnalysis(matterId).catch(() => null),
    client.loadInput(matterId).catch(() => null),
    client.loadDraft(matterId).catch(() => null),
    client.loadApproval(matterId).catch(() => null),
  ]);
  return {
    matter: matterSnapshot.matter,
    documents: matterSnapshot.documents,
    analysis,
    input,
    draft,
    approval,
  };
}

export interface UseStepWorkflowMatterInput {
  definition: StepWorkflowDefinition;
  client: WorkflowMatterClient;
  /** Existing matter id to load, or empty/undefined to start with no matter. */
  matterId?: string;
  deriveSteps: DeriveSteps;
  verticalId: string;
}

export interface UseStepWorkflowMatterResult {
  state: StepMatterState | null;
  matterId: string;
  context: StepProjectionContext | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  createMatter: () => Promise<string>;
  uploadAndAttach: (input: {
    file: File;
    purpose: string;
    role: WorkflowDocumentRole;
    evidenceKind?: string | null;
    position?: number;
  }) => Promise<void>;
  runAnalysis: () => Promise<void>;
  saveStepInput: (input: Record<string, unknown>) => Promise<void>;
  generateAndSaveDraft: () => Promise<void>;
  previewAndApprovePacket: (input: {
    mailClass: "standard" | "certified" | "registered";
    recipient: WorkflowMailingAddress;
  }) => Promise<void>;
  startCheckout: (input: { sender: WorkflowMailingAddress }) => Promise<{ checkoutUrl: string }>;
}

/**
 * React hook driving a `StepWorkflowDefinition`-shaped UI off a real
 * backend matter: loads matter/analysis/input/draft/approval in parallel,
 * projects them onto `StepMatterState`, and exposes action wrappers that
 * call the client then refresh.
 */
export function useStepWorkflowMatter(input: UseStepWorkflowMatterInput): UseStepWorkflowMatterResult {
  const { definition, client, deriveSteps, verticalId } = input;
  const [matterId, setMatterId] = useState(input.matterId ?? "");
  const [context, setContext] = useState<StepProjectionContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!matterId) return;
    setLoading(true);
    setError("");
    try {
      const snapshot = await loadSnapshot(client, matterId);
      if (mounted.current) setContext(snapshot);
    } catch (cause) {
      if (mounted.current) {
        setError(cause instanceof Error ? cause.message : "Unable to load this matter.");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [client, matterId]);

  useEffect(() => {
    if (matterId) void refresh();
  }, [matterId, refresh]);

  const createMatter = useCallback(async (): Promise<string> => {
    setLoading(true);
    setError("");
    try {
      const matter = await client.createMatter({ workflowId: definition.id, verticalId });
      setMatterId(matter.id);
      return matter.id;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to create this matter.";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [client, definition.id, verticalId]);

  const ensureMatter = useCallback(async (): Promise<string> => {
    if (matterId) return matterId;
    return createMatter();
  }, [matterId, createMatter]);

  const uploadAndAttach = useCallback(
    async (uploadInput: {
      file: File;
      purpose: string;
      role: WorkflowDocumentRole;
      evidenceKind?: string | null;
      position?: number;
    }) => {
      const id = await ensureMatter();
      setError("");
      try {
        const uploaded = await client.uploadDocument({
          file: uploadInput.file,
          workflowId: definition.id,
          purpose: uploadInput.purpose,
        });
        await client.attachDocument({
          matterId: id,
          documentId: uploaded.id,
          role: uploadInput.role,
          evidenceKind: uploadInput.evidenceKind,
          position: uploadInput.position,
        });
        await refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to upload this document.");
        throw cause;
      }
    },
    [client, definition.id, ensureMatter, refresh],
  );

  const runAnalysis = useCallback(async () => {
    const id = await ensureMatter();
    setError("");
    try {
      await client.analyze(id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to analyze this matter.");
      throw cause;
    }
  }, [client, ensureMatter, refresh]);

  const saveStepInput = useCallback(
    async (stepInput: Record<string, unknown>) => {
      const id = await ensureMatter();
      setError("");
      try {
        await client.saveInput(id, stepInput);
        await refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to save this step.");
        throw cause;
      }
    },
    [client, ensureMatter, refresh],
  );

  const generateAndSaveDraft = useCallback(async () => {
    const id = await ensureMatter();
    setError("");
    try {
      const generated = await client.generateDraft(id);
      await client.saveDraft(id, generated.bodyText);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to generate this draft.");
      throw cause;
    }
  }, [client, ensureMatter, refresh]);

  const previewAndApprovePacket = useCallback(
    async (approveInput: { mailClass: "standard" | "certified" | "registered"; recipient: WorkflowMailingAddress }) => {
      const id = await ensureMatter();
      setError("");
      try {
        const preview = await client.previewPacket(id, approveInput.mailClass);
        await client.approvePacket({
          matterId: id,
          preview,
          recipient: approveInput.recipient,
          mailClass: approveInput.mailClass,
        });
        await refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to approve this packet.");
        throw cause;
      }
    },
    [client, ensureMatter, refresh],
  );

  const startCheckout = useCallback(
    async (checkoutInput: { sender: WorkflowMailingAddress }): Promise<{ checkoutUrl: string }> => {
      const id = await ensureMatter();
      setError("");
      try {
        const approval = context?.approval ?? (await client.loadApproval(id));
        if (!approval) throw new Error("This matter must be approved before checkout.");
        const result = await client.checkout({
          matterId: id,
          approvalId: approval.approvalId,
          sender: checkoutInput.sender,
        });
        await refresh();
        return { checkoutUrl: result.checkoutUrl };
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to start checkout.");
        throw cause;
      }
    },
    [client, context, ensureMatter, refresh],
  );

  const state = context ? projectMatterToStepState(definition, deriveSteps, context) : null;

  return {
    state,
    matterId,
    context,
    loading,
    error,
    refresh,
    createMatter,
    uploadAndAttach,
    runAnalysis,
    saveStepInput,
    generateAndSaveDraft,
    previewAndApprovePacket,
    startCheckout,
  };
}

export interface PollDocumentSecurityStatusOptions {
  intervalMs?: number;
  timeoutMs?: number;
}

/**
 * Poll a matter's documents until the given document reaches a terminal
 * security status (anything other than pending), or the timeout elapses.
 * Ported from `NoticeResponseWorkflow.tsx`'s 3-second
 * `window.setInterval(() => void refreshDocuments(matterId)..., 3000)` poll
 * loop, generalized into a standalone awaitable so both dispute-mail and
 * notice-respond can reuse it outside a component's `useEffect`.
 */
export async function pollDocumentSecurityStatus(
  client: WorkflowMatterClient,
  matterId: string,
  documentId: string,
  options: PollDocumentSecurityStatusOptions = {},
): Promise<WorkflowMatterDocument | null> {
  const intervalMs = options.intervalMs ?? 3000;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const deadline = Date.now() + timeoutMs;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snapshot = await client.loadMatter(matterId);
    const document = snapshot.documents.find((candidate) => candidate.documentId === documentId);
    if (!document) return null;
    const stillPending = !document.usable && document.securityStatus !== "rejected";
    if (!stillPending) return document;
    if (Date.now() >= deadline) return document;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
