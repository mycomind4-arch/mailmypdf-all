import type {
  WorkflowMailingAddress,
  WorkflowMatterAnalysis,
  WorkflowMatterDocument,
  WorkflowMatterRecord,
  WorkflowMatterSnapshot,
  WorkflowPacketPreview,
} from "./matter-runtime-client.js";
import {
  createWorkflowDraftBasis,
  workflowDraftBasisMatches,
  type WorkflowDraftBasis,
} from "./draft-basis.js";
import {
  assertPacketMatchesApproval,
  createExactPacketApproval,
  requireCleanSourceDocument,
  requireIncludedDocumentsReady,
  WorkflowRuntimeError,
  type ExactPacketApproval,
} from "./matter-runtime.js";
import type { DraftValidationResult } from "./draft-validator.js";
import type { Cp2000StrategyPlan } from "./domain-packs/notice-response/cp2000-strategy.js";

export interface WorkflowRuntimeActor {
  id: string;
  scopes: readonly string[];
}

export interface WorkflowRuntimeStoredInput {
  version: number;
  input: Record<string, unknown>;
  createdAt: string;
}

export interface WorkflowRuntimeStoredEvent {
  id: string;
  type: string;
  occurredOn: string;
  data: Readonly<Record<string, unknown>>;
  createdAt: string;
  source: "user" | "provider" | "system";
}

export interface WorkflowRuntimeStoredDraft {
  version: number;
  bodyText: string;
  createdAt: string;
  /**
   * Server-authored snapshot of the exact workflow state this reviewed draft
   * was saved against. Older persisted drafts may lack it and fail closed
   * until they are reviewed and saved again.
   */
  basis?: WorkflowDraftBasis;
}

export interface WorkflowRuntimeStore {
  createMatter(input: {
    ownerId: string;
    workflowId: string;
    verticalId: string;
    createdAt: string;
  }): Promise<WorkflowMatterRecord>;
  loadMatter(ownerId: string, matterId: string): Promise<WorkflowMatterSnapshot | null>;

  replaceDocuments(
    ownerId: string,
    matterId: string,
    documents: readonly WorkflowMatterDocument[],
  ): Promise<readonly WorkflowMatterDocument[]>;

  saveAnalysis(
    ownerId: string,
    matterId: string,
    analysis: WorkflowMatterAnalysis,
  ): Promise<void>;
  loadAnalysis(ownerId: string, matterId: string): Promise<WorkflowMatterAnalysis | null>;

  saveInput(
    ownerId: string,
    matterId: string,
    input: Record<string, unknown>,
  ): Promise<WorkflowRuntimeStoredInput>;
  loadInput(ownerId: string, matterId: string): Promise<WorkflowRuntimeStoredInput | null>;

  saveDraft(
    ownerId: string,
    matterId: string,
    input: { bodyText: string; basis: WorkflowDraftBasis },
  ): Promise<WorkflowRuntimeStoredDraft>;
  loadDraft(ownerId: string, matterId: string): Promise<WorkflowRuntimeStoredDraft | null>;

  saveApproval(ownerId: string, matterId: string, approval: ExactPacketApproval): Promise<void>;
  loadApproval(ownerId: string, matterId: string): Promise<ExactPacketApproval | null>;

  /**
   * Optional durable event stream for workflows with post-fulfillment state.
   * Provider/system events must be appended by trusted server integrations,
   * never through the authenticated user-event endpoint below.
   */
  appendEvent?(
    ownerId: string,
    matterId: string,
    event: WorkflowRuntimeStoredEvent,
  ): Promise<void>;
  loadEvents?(
    ownerId: string,
    matterId: string,
  ): Promise<readonly WorkflowRuntimeStoredEvent[]>;
}

export interface WorkflowRuntimeUploadedDocument {
  id: string;
  filename: string;
  sizeBytes: number;
  securityStatus: string;
}

export interface WorkflowRuntimeDocumentGateway {
  upload(input: {
    actor: WorkflowRuntimeActor;
    workflowId: string;
    purpose: string;
    consent: boolean;
    file: File;
  }): Promise<WorkflowRuntimeUploadedDocument>;
  describe(input: {
    actor: WorkflowRuntimeActor;
    documentId: string;
  }): Promise<{
    filename: string;
    mimeType: string | null;
    sizeBytes: number | null;
    pageCount: number | null;
    securityStatus: string;
    usable: boolean;
  }>;
}

export interface WorkflowRuntimeIntelligenceGateway {
  analyze(input: {
    actor: WorkflowRuntimeActor;
    matter: WorkflowMatterSnapshot;
    source: WorkflowMatterDocument;
  }): Promise<Omit<WorkflowMatterAnalysis, "version" | "createdAt">>;

  generateDraft(input: {
    actor: WorkflowRuntimeActor;
    matter: WorkflowMatterSnapshot;
    analysis: WorkflowMatterAnalysis;
    caseInput: WorkflowRuntimeStoredInput;
  }): Promise<{
    bodyText: string;
    model: string;
    validation?: DraftValidationResult;
    strategy?: Cp2000StrategyPlan;
  }>;
}

export interface WorkflowRuntimePacketGateway {
  preview(input: {
    actor: WorkflowRuntimeActor;
    matter: WorkflowMatterSnapshot;
    draft: WorkflowRuntimeStoredDraft;
    documents: readonly WorkflowMatterDocument[];
    mailClass: "standard" | "certified" | "registered";
  }): Promise<WorkflowPacketPreview>;
}

export interface WorkflowRuntimeCheckoutGateway {
  checkout(input: {
    actor: WorkflowRuntimeActor;
    matter: WorkflowMatterSnapshot;
    approval: ExactPacketApproval;
    sender: WorkflowMailingAddress;
  }): Promise<{
    checkoutUrl: string;
    orderId: string;
    packetSha256: string;
    totalCents: number;
  }>;
}

export interface WorkflowRuntimePolicy {
  validateMatter(input: { workflowId: string; verticalId: string }): void;
  /** Defaults to true. Request-first workflows may explicitly opt out. */
  requiresSourceDocument?: boolean;
  /**
   * Request-first workflows can deterministically create structured analysis
   * from validated user input. This preserves one downstream analysis contract
   * without fabricating or requiring a source document.
   */
  createAnalysisFromInput?(input: {
    matter: WorkflowMatterSnapshot;
    caseInput: WorkflowRuntimeStoredInput;
  }): WorkflowMatterAnalysis["result"] | Promise<WorkflowMatterAnalysis["result"]>;
  validateAnalysis?(analysis: WorkflowMatterAnalysis): void;
  validateInput(
    input: Record<string, unknown>,
    analysis: WorkflowMatterAnalysis | null,
    matter: WorkflowMatterSnapshot,
  ): Record<string, unknown>;
  validateDocumentsBeforeDraft?(documents: readonly WorkflowMatterDocument[], analysis: WorkflowMatterAnalysis): void;
  validateBeforeDraft?(input: {
    matter: WorkflowMatterSnapshot;
    caseInput: WorkflowRuntimeStoredInput;
    analysis: WorkflowMatterAnalysis;
  }): void;
  validateDocumentsBeforePacket?(documents: readonly WorkflowMatterDocument[], analysis: WorkflowMatterAnalysis): void;
  validateBeforePacket?(input: {
    matter: WorkflowMatterSnapshot;
    caseInput: WorkflowRuntimeStoredInput;
    analysis: WorkflowMatterAnalysis;
  }): void;
  /**
   * Validate an event submitted by the authenticated matter owner. Policies
   * must reject provider/system-only events such as actual-send confirmation.
   */
  validateUserEvent?(input: {
    event: Record<string, unknown>;
    matter: WorkflowMatterSnapshot;
    existingEvents: readonly WorkflowRuntimeStoredEvent[];
  }): {
    type: string;
    occurredOn: string;
    data: Readonly<Record<string, unknown>>;
  };
}

export interface WorkflowRuntimeServerDependencies {
  authenticate(request: Request): Promise<WorkflowRuntimeActor | null>;
  store: WorkflowRuntimeStore;
  documents: WorkflowRuntimeDocumentGateway;
  intelligence: WorkflowRuntimeIntelligenceGateway;
  packet: WorkflowRuntimePacketGateway;
  checkout: WorkflowRuntimeCheckoutGateway;
  policyFor(workflowId: string): WorkflowRuntimePolicy | null;
  now?: () => string;
  id?: () => string;
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "JSON object required");
  }
  return value as Record<string, unknown>;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return asObject(await request.json());
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Valid JSON body required");
  }
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, `${label} is required`);
  return value.trim();
}

function mailClass(value: unknown): "standard" | "certified" | "registered" {
  if (value === "standard" || value === "certified" || value === "registered") return value;
  throw new HttpError(400, "mailClass is invalid");
}

function mailingAddress(value: unknown): WorkflowMailingAddress {
  const object = asObject(value);
  return {
    name: requiredString(object.name, "name"),
    line1: requiredString(object.line1, "line1"),
    line2: typeof object.line2 === "string" ? object.line2 : null,
    city: requiredString(object.city, "city"),
    state: requiredString(object.state, "state"),
    postal: requiredString(object.postal, "postal"),
  };
}

async function requireMatter(
  deps: WorkflowRuntimeServerDependencies,
  actor: WorkflowRuntimeActor,
  matterId: string,
): Promise<WorkflowMatterSnapshot> {
  const matter = await deps.store.loadMatter(actor.id, matterId);
  if (!matter) throw new HttpError(404, "Workflow matter not found");
  return matter;
}

function policyFor(deps: WorkflowRuntimeServerDependencies, workflowId: string): WorkflowRuntimePolicy {
  const policy = deps.policyFor(workflowId);
  if (!policy) throw new HttpError(404, "Workflow runtime policy is not registered");
  return policy;
}

function nextAnalysisVersion(previous: WorkflowMatterAnalysis | null): number {
  return (previous?.version ?? 0) + 1;
}

function routeParts(url: URL, basePath: string): string[] {
  const base = basePath.replace(/\/$/, "");
  if (!url.pathname.startsWith(`${base}/`) && url.pathname !== base) {
    throw new HttpError(404, "Workflow runtime route not found");
  }
  return url.pathname.slice(base.length).split("/").filter(Boolean).map(decodeURIComponent);
}

function requireSourceForPolicy(
  policy: WorkflowRuntimePolicy,
  documents: readonly WorkflowMatterDocument[],
): WorkflowMatterDocument | null {
  if (policy.requiresSourceDocument !== false) return requireCleanSourceDocument(documents);
  const source = documents.find((document) => document.role === "subject_notice");
  if (!source) return null;
  if (!source.usable || source.securityStatus !== "clean") {
    // Reuse the canonical error semantics when an optional source is present.
    return requireCleanSourceDocument(documents);
  }
  return source;
}

function requireFreshDraft(input: {
  draft: WorkflowRuntimeStoredDraft;
  analysis: WorkflowMatterAnalysis;
  caseInput: WorkflowRuntimeStoredInput;
  documents: readonly WorkflowMatterDocument[];
}): void {
  const current = createWorkflowDraftBasis({
    analysis: input.analysis,
    inputVersion: input.caseInput.version,
    documents: input.documents,
  });

  if (!input.draft.basis) {
    throw new WorkflowRuntimeError(
      "This saved draft predates draft freshness tracking. Review and save the draft again before building a packet.",
      "DRAFT_BASIS_MISSING",
    );
  }
  if (!workflowDraftBasisMatches(input.draft.basis, current)) {
    throw new WorkflowRuntimeError(
      "Workflow facts, analysis, or documents changed after this draft was saved. Review and save the draft again.",
      "DRAFT_BASIS_STALE",
    );
  }
}

async function resolveDraftAnalysis(input: {
  deps: WorkflowRuntimeServerDependencies;
  policy: WorkflowRuntimePolicy;
  actor: WorkflowRuntimeActor;
  matter: WorkflowMatterSnapshot;
  caseInput: WorkflowRuntimeStoredInput;
  now: () => string;
}): Promise<WorkflowMatterAnalysis> {
  const previous = await input.deps.store.loadAnalysis(input.actor.id, input.matter.matter.id);
  if (previous && previous.model !== "workflow-input") return previous;

  if (!input.policy.createAnalysisFromInput) {
    if (previous) return previous;
    throw new HttpError(409, "Analyze the source document before drafting");
  }

  const expectedDocumentId = `workflow-input:${input.caseInput.version}`;
  if (previous?.documentId === expectedDocumentId) return previous;

  const result = await input.policy.createAnalysisFromInput({
    matter: input.matter,
    caseInput: input.caseInput,
  });
  const analysis: WorkflowMatterAnalysis = {
    version: nextAnalysisVersion(previous),
    documentId: expectedDocumentId,
    model: "workflow-input",
    createdAt: input.now(),
    result,
  };
  input.policy.validateAnalysis?.(analysis);
  await input.deps.store.saveAnalysis(input.actor.id, input.matter.matter.id, analysis);
  return analysis;
}

/**
 * Framework-independent shared runtime host. A deployment only needs to mount
 * this function at /api/workflow-runtime and provide adapters for auth,
 * persistence, secure documents, AI/intelligence, packet construction, and
 * checkout. Workflow-specific rules remain in the registered policy.
 *
 * Document-first remains the default safety posture. A workflow may opt into
 * request-first execution only by setting requiresSourceDocument=false and
 * supplying createAnalysisFromInput, which produces deterministic structured
 * state from already validated user input.
 */
export function createWorkflowRuntimeRequestHandler(
  deps: WorkflowRuntimeServerDependencies,
  options: { basePath?: string } = {},
): (request: Request) => Promise<Response> {
  const basePath = options.basePath ?? "/api/workflow-runtime";
  const now = deps.now ?? (() => new Date().toISOString());
  const id = deps.id ?? (() => globalThis.crypto.randomUUID());

  return async (request: Request): Promise<Response> => {
    try {
      const actor = await deps.authenticate(request);
      if (!actor) throw new HttpError(401, "Authentication required");

      const parts = routeParts(new URL(request.url), basePath);

      if (request.method === "POST" && parts.length === 1 && parts[0] === "matters") {
        const body = await readJson(request);
        const workflowId = requiredString(body.workflowId, "workflowId");
        const verticalId = requiredString(body.verticalId, "verticalId");
        policyFor(deps, workflowId).validateMatter({ workflowId, verticalId });
        const matter = await deps.store.createMatter({
          ownerId: actor.id,
          workflowId,
          verticalId,
          createdAt: now(),
        });
        return json({ matter }, 201);
      }

      if (request.method === "POST" && parts.length === 1 && parts[0] === "documents") {
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) throw new HttpError(400, "file is required");
        const workflowId = requiredString(form.get("workflowId"), "workflowId");
        const purpose = requiredString(form.get("purpose"), "purpose");
        const consent = form.get("consent") === "true";
        policyFor(deps, workflowId);
        const document = await deps.documents.upload({ actor, workflowId, purpose, consent, file });
        return json({ document }, 201);
      }

      if (parts[0] !== "matters" || !parts[1]) throw new HttpError(404, "Workflow runtime route not found");
      const matterId = parts[1];
      let matter = await requireMatter(deps, actor, matterId);
      const policy = policyFor(deps, matter.matter.workflowId);

      if (request.method === "GET" && parts.length === 2) return json(matter);

      if (parts[2] === "documents") {
        if (request.method === "POST" && parts.length === 3) {
          const body = await readJson(request);
          const documentId = requiredString(body.documentId, "documentId");
          const role = body.role;
          if (role !== "subject_notice" && role !== "evidence") throw new HttpError(400, "role is invalid");
          const described = await deps.documents.describe({ actor, documentId });
          const next: WorkflowMatterDocument = {
            id: id(),
            documentId,
            role,
            evidenceKind: typeof body.evidenceKind === "string" ? body.evidenceKind : null,
            pageCount: described.pageCount,
            included: role === "evidence",
            position: typeof body.position === "number" && Number.isInteger(body.position) ? body.position : matter.documents.length,
            filename: described.filename,
            mimeType: described.mimeType,
            sizeBytes: described.sizeBytes,
            securityStatus: described.securityStatus,
            usable: described.usable,
          };
          const documents = role === "subject_notice"
            ? [...matter.documents.filter((item) => item.role !== "subject_notice"), next]
            : [...matter.documents, next];
          const saved = await deps.store.replaceDocuments(actor.id, matterId, documents);
          return json({ documents: saved });
        }

        if (parts[3]) {
          const documentId = parts[3];
          if (request.method === "DELETE") {
            const documents = matter.documents.filter((item) => item.documentId !== documentId);
            const saved = await deps.store.replaceDocuments(actor.id, matterId, documents);
            return json({ documents: saved });
          }
          if (request.method === "PATCH") {
            const body = await readJson(request);
            const documents = matter.documents.map((item) => item.documentId !== documentId ? item : {
              ...item,
              ...(typeof body.included === "boolean" ? { included: body.included } : {}),
              ...(typeof body.position === "number" && Number.isInteger(body.position) ? { position: body.position } : {}),
            });
            const saved = await deps.store.replaceDocuments(actor.id, matterId, documents);
            return json({ documents: saved });
          }
        }
      }

      if (parts[2] === "events" && parts.length === 3) {
        if (!deps.store.loadEvents || !deps.store.appendEvent) {
          throw new HttpError(501, "Workflow event persistence is not configured");
        }

        if (request.method === "GET") {
          return json({ events: await deps.store.loadEvents(actor.id, matterId) });
        }

        if (request.method === "POST") {
          if (!policy.validateUserEvent) {
            throw new HttpError(405, "This workflow does not accept user-recorded events");
          }
          const body = await readJson(request);
          const existingEvents = await deps.store.loadEvents(actor.id, matterId);
          const validated = policy.validateUserEvent({
            event: body,
            matter,
            existingEvents,
          });
          const event: WorkflowRuntimeStoredEvent = {
            id: id(),
            type: validated.type,
            occurredOn: validated.occurredOn,
            data: validated.data,
            createdAt: now(),
            source: "user",
          };
          await deps.store.appendEvent(actor.id, matterId, event);
          return json({ event }, 201);
        }
      }

      if (parts[2] === "analysis" && parts.length === 3) {
        if (request.method === "GET") return json({ analysis: await deps.store.loadAnalysis(actor.id, matterId) });
        if (request.method === "POST") {
          const source = requireCleanSourceDocument(matter.documents);
          const previous = await deps.store.loadAnalysis(actor.id, matterId);
          const result = await deps.intelligence.analyze({ actor, matter, source });
          const analysis: WorkflowMatterAnalysis = {
            ...result,
            version: nextAnalysisVersion(previous),
            createdAt: now(),
          };
          policy.validateAnalysis?.(analysis);
          await deps.store.saveAnalysis(actor.id, matterId, analysis);
          return json({ analysis });
        }
      }

      if (parts[2] === "input" && parts.length === 3) {
        if (request.method === "GET") return json({ input: await deps.store.loadInput(actor.id, matterId) });
        if (request.method === "POST") {
          const body = await readJson(request);
          const analysis = await deps.store.loadAnalysis(actor.id, matterId);
          const validated = policy.validateInput(body, analysis, matter);
          const stored = await deps.store.saveInput(actor.id, matterId, validated);
          return json({ version: stored.version });
        }
      }

      if (parts[2] === "draft") {
        if (request.method === "GET" && parts.length === 3) {
          return json({ draft: await deps.store.loadDraft(actor.id, matterId) });
        }
        if (request.method === "POST" && parts[3] === "generate") {
          const caseInput = await deps.store.loadInput(actor.id, matterId);
          if (!caseInput) throw new HttpError(409, "Save workflow facts before drafting");
          matter = await requireMatter(deps, actor, matterId);
          requireSourceForPolicy(policy, matter.documents);
          requireIncludedDocumentsReady(matter.documents);
          const analysis = await resolveDraftAnalysis({ deps, policy, actor, matter, caseInput, now });
          policy.validateDocumentsBeforeDraft?.(matter.documents, analysis);
          policy.validateBeforeDraft?.({ matter, caseInput, analysis });
          const generated = await deps.intelligence.generateDraft({ actor, matter, analysis, caseInput });
          return json({
            bodyText: generated.bodyText,
            model: generated.model,
            basedOnAnalysisVersion: analysis.version,
            ...(generated.validation ? { validation: generated.validation } : {}),
            ...(generated.strategy ? { strategy: generated.strategy } : {}),
          });
        }
        if (request.method === "POST" && parts.length === 3) {
          const body = await readJson(request);
          const bodyText = requiredString(body.bodyText, "bodyText");
          const caseInput = await deps.store.loadInput(actor.id, matterId);
          if (!caseInput) throw new HttpError(409, "Save workflow facts before saving a draft");
          matter = await requireMatter(deps, actor, matterId);
          requireSourceForPolicy(policy, matter.documents);
          requireIncludedDocumentsReady(matter.documents);
          const analysis = await resolveDraftAnalysis({ deps, policy, actor, matter, caseInput, now });
          policy.validateDocumentsBeforeDraft?.(matter.documents, analysis);
          policy.validateBeforeDraft?.({ matter, caseInput, analysis });
          const basis = createWorkflowDraftBasis({
            analysis,
            inputVersion: caseInput.version,
            documents: matter.documents,
          });
          const stored = await deps.store.saveDraft(actor.id, matterId, { bodyText, basis });
          return json({ version: stored.version });
        }
      }

      if (request.method === "POST" && parts[2] === "packet" && parts.length === 3) {
        const body = await readJson(request);
        const selectedMailClass = mailClass(body.mailClass);
        const analysis = await deps.store.loadAnalysis(actor.id, matterId);
        if (!analysis) throw new HttpError(409, "Analysis is required before packet construction");
        const draft = await deps.store.loadDraft(actor.id, matterId);
        if (!draft) throw new HttpError(409, "A saved draft is required before packet construction");
        const caseInput = await deps.store.loadInput(actor.id, matterId);
        if (!caseInput) throw new HttpError(409, "Saved workflow facts are required before packet construction");
        matter = await requireMatter(deps, actor, matterId);
        requireSourceForPolicy(policy, matter.documents);
        const included = requireIncludedDocumentsReady(matter.documents);
        policy.validateDocumentsBeforePacket?.(matter.documents, analysis);
        policy.validateBeforePacket?.({ matter, caseInput, analysis });
        requireFreshDraft({ draft, analysis, caseInput, documents: matter.documents });
        const packet = await deps.packet.preview({
          actor,
          matter,
          draft,
          documents: included,
          mailClass: selectedMailClass,
        });
        return json({ packet });
      }

      if (parts[2] === "approval" && parts.length === 3) {
        if (request.method === "GET") {
          const approval = await deps.store.loadApproval(actor.id, matterId);
          return json({ approval: approval ? {
            approvalId: approval.approvalId,
            packetSha256: approval.packetSha256,
            quote: { totalCents: approval.totalCents },
          } : null });
        }
        if (request.method === "POST") {
          const body = await readJson(request);
          const expectedPacketSha256 = requiredString(body.expectedPacketSha256, "expectedPacketSha256");
          const expectedTotalCents = body.expectedTotalCents;
          if (!Number.isSafeInteger(expectedTotalCents) || (expectedTotalCents as number) < 0) {
            throw new HttpError(400, "expectedTotalCents is invalid");
          }
          const selectedMailClass = mailClass(body.mailClass);
          const recipient = mailingAddress(body.recipient);
          const analysis = await deps.store.loadAnalysis(actor.id, matterId);
          if (!analysis) throw new HttpError(409, "Analysis is required before approval");
          const draft = await deps.store.loadDraft(actor.id, matterId);
          if (!draft) throw new HttpError(409, "A saved draft is required before approval");
          const caseInput = await deps.store.loadInput(actor.id, matterId);
          if (!caseInput) throw new HttpError(409, "Saved workflow facts are required before approval");
          matter = await requireMatter(deps, actor, matterId);
          requireSourceForPolicy(policy, matter.documents);
          const included = requireIncludedDocumentsReady(matter.documents);
          policy.validateDocumentsBeforePacket?.(matter.documents, analysis);
          policy.validateBeforePacket?.({ matter, caseInput, analysis });
          requireFreshDraft({ draft, analysis, caseInput, documents: matter.documents });
          const current = await deps.packet.preview({ actor, matter, draft, documents: included, mailClass: selectedMailClass });
          if (current.packetSha256 !== expectedPacketSha256 || current.quote.totalCents !== expectedTotalCents) {
            throw new HttpError(409, "Packet or price changed after preview; review the new packet");
          }
          const approval = createExactPacketApproval({
            approvalId: id(),
            matterId,
            workflowId: matter.matter.workflowId,
            preview: current,
            recipient,
            mailClass: selectedMailClass,
            approvedBy: actor.id,
            approvedAt: now(),
          });
          await deps.store.saveApproval(actor.id, matterId, approval);
          return json({ approvalId: approval.approvalId, packetSha256: approval.packetSha256, quote: current.quote });
        }
      }

      if (request.method === "POST" && parts[2] === "checkout" && parts.length === 3) {
        const body = await readJson(request);
        const approvalId = requiredString(body.approvalId, "approvalId");
        const sender = mailingAddress(body.sender);
        const approval = await deps.store.loadApproval(actor.id, matterId);
        if (!approval || approval.approvalId !== approvalId) throw new HttpError(409, "Approved packet is required before checkout");
        matter = await requireMatter(deps, actor, matterId);
        const draft = await deps.store.loadDraft(actor.id, matterId);
        if (!draft) throw new HttpError(409, "Saved draft is missing");
        const analysis = await deps.store.loadAnalysis(actor.id, matterId);
        if (!analysis) throw new HttpError(409, "Analysis is missing");
        const caseInput = await deps.store.loadInput(actor.id, matterId);
        if (!caseInput) throw new HttpError(409, "Saved workflow facts are missing");
        requireSourceForPolicy(policy, matter.documents);
        const included = requireIncludedDocumentsReady(matter.documents);
        policy.validateDocumentsBeforePacket?.(matter.documents, analysis);
        policy.validateBeforePacket?.({ matter, caseInput, analysis });
        requireFreshDraft({ draft, analysis, caseInput, documents: matter.documents });
        const current = await deps.packet.preview({ actor, matter, draft, documents: included, mailClass: approval.mailClass });
        assertPacketMatchesApproval(approval, current);
        return json(await deps.checkout.checkout({ actor, matter, approval, sender }));
      }

      throw new HttpError(404, "Workflow runtime route not found");
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      if (error instanceof WorkflowRuntimeError) {
        const status = error.code.includes("INPUT_") ? 400 : 409;
        return json({ error: error.message, code: error.code }, status);
      }
      const message = error instanceof Error ? error.message : "Workflow runtime failed";
      return json({ error: message }, 500);
    }
  };
}
