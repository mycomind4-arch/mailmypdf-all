import { createHash } from "node:crypto";
import {
  createWorkflowRuntimeRequestHandler,
  type ExactPacketApproval,
  type WorkflowMatterAnalysis,
  type WorkflowMatterDocument,
  type WorkflowMatterRecord,
  type WorkflowMatterSnapshot,
  type WorkflowPacketPreview,
  type WorkflowRuntimeActor,
  type WorkflowRuntimePolicy,
  type WorkflowRuntimeServerDependencies,
  type WorkflowRuntimeStore,
  type WorkflowRuntimeStoredDraft,
  type WorkflowRuntimeStoredInput,
} from "@mailmypdf/workflows";

export class InMemoryWorkflowRuntimeStore implements WorkflowRuntimeStore {
  readonly matters = new Map<string, { ownerId: string; snapshot: WorkflowMatterSnapshot }>();
  readonly analyses = new Map<string, WorkflowMatterAnalysis>();
  readonly inputs = new Map<string, WorkflowRuntimeStoredInput>();
  readonly drafts = new Map<string, WorkflowRuntimeStoredDraft>();
  readonly approvals = new Map<string, ExactPacketApproval>();

  async createMatter(input: {
    ownerId: string;
    workflowId: string;
    verticalId: string;
    createdAt: string;
  }): Promise<WorkflowMatterRecord> {
    const matter: WorkflowMatterRecord = {
      id: `matter-${this.matters.size + 1}`,
      workflowId: input.workflowId,
      verticalId: input.verticalId,
      status: "active",
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    };
    this.matters.set(matter.id, {
      ownerId: input.ownerId,
      snapshot: { matter, documents: [] },
    });
    return matter;
  }

  async loadMatter(ownerId: string, matterId: string): Promise<WorkflowMatterSnapshot | null> {
    const row = this.matters.get(matterId);
    return row?.ownerId === ownerId ? row.snapshot : null;
  }

  async replaceDocuments(
    ownerId: string,
    matterId: string,
    documents: readonly WorkflowMatterDocument[],
  ): Promise<readonly WorkflowMatterDocument[]> {
    const row = this.matters.get(matterId);
    if (!row || row.ownerId !== ownerId) throw new Error("Matter not found");
    row.snapshot = {
      ...row.snapshot,
      matter: { ...row.snapshot.matter, updatedAt: row.snapshot.matter.updatedAt },
      documents: [...documents],
    };
    return row.snapshot.documents;
  }

  async saveAnalysis(
    ownerId: string,
    matterId: string,
    analysis: WorkflowMatterAnalysis,
  ): Promise<void> {
    if (!(await this.loadMatter(ownerId, matterId))) throw new Error("Matter not found");
    this.analyses.set(matterId, analysis);
  }

  async loadAnalysis(ownerId: string, matterId: string): Promise<WorkflowMatterAnalysis | null> {
    return (await this.loadMatter(ownerId, matterId))
      ? this.analyses.get(matterId) ?? null
      : null;
  }

  async saveInput(
    ownerId: string,
    matterId: string,
    input: Record<string, unknown>,
  ): Promise<WorkflowRuntimeStoredInput> {
    if (!(await this.loadMatter(ownerId, matterId))) throw new Error("Matter not found");
    const previous = this.inputs.get(matterId);
    const stored: WorkflowRuntimeStoredInput = {
      version: (previous?.version ?? 0) + 1,
      input: { ...input },
      createdAt: "2026-09-17T00:00:00.000Z",
    };
    this.inputs.set(matterId, stored);
    return stored;
  }

  async loadInput(ownerId: string, matterId: string): Promise<WorkflowRuntimeStoredInput | null> {
    return (await this.loadMatter(ownerId, matterId))
      ? this.inputs.get(matterId) ?? null
      : null;
  }

  async saveDraft(
    ownerId: string,
    matterId: string,
    input: Parameters<WorkflowRuntimeStore["saveDraft"]>[2],
  ): Promise<WorkflowRuntimeStoredDraft> {
    if (!(await this.loadMatter(ownerId, matterId))) throw new Error("Matter not found");
    const previous = this.drafts.get(matterId);
    const stored: WorkflowRuntimeStoredDraft = {
      version: (previous?.version ?? 0) + 1,
      bodyText: input.bodyText,
      basis: input.basis,
      createdAt: "2026-09-17T00:00:00.000Z",
    };
    this.drafts.set(matterId, stored);
    return stored;
  }

  async loadDraft(ownerId: string, matterId: string): Promise<WorkflowRuntimeStoredDraft | null> {
    return (await this.loadMatter(ownerId, matterId))
      ? this.drafts.get(matterId) ?? null
      : null;
  }

  async saveApproval(
    ownerId: string,
    matterId: string,
    approval: ExactPacketApproval,
  ): Promise<void> {
    if (!(await this.loadMatter(ownerId, matterId))) throw new Error("Matter not found");
    this.approvals.set(matterId, approval);
  }

  async loadApproval(ownerId: string, matterId: string): Promise<ExactPacketApproval | null> {
    return (await this.loadMatter(ownerId, matterId))
      ? this.approvals.get(matterId) ?? null
      : null;
  }
}

export interface AcceptanceDocumentDescriptor {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number;
  securityStatus: string;
  usable: boolean;
}

export interface MatterRuntimeAcceptanceHarnessOptions {
  policyFor(workflowId: string): WorkflowRuntimePolicy | null;
  actor?: WorkflowRuntimeActor;
  accessToken?: string;
  now?: () => string;
  analyze?: WorkflowRuntimeServerDependencies["intelligence"]["analyze"];
  generateDraft?: WorkflowRuntimeServerDependencies["intelligence"]["generateDraft"];
  previewPacket?: WorkflowRuntimeServerDependencies["packet"]["preview"];
  checkout?: WorkflowRuntimeServerDependencies["checkout"]["checkout"];
}

export interface MatterRuntimeAcceptanceHarness {
  handle(request: Request): Promise<Response>;
  request(path: string, init?: RequestInit): Request;
  json<T = Record<string, unknown>>(response: Response): Promise<T>;
  store: InMemoryWorkflowRuntimeStore;
  documents: Map<string, AcceptanceDocumentDescriptor>;
  checkoutCalls: { count: number };
  setDocumentState(
    documentId: string,
    patch: Partial<Pick<AcceptanceDocumentDescriptor, "securityStatus" | "usable" | "pageCount">>,
  ): void;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * In-process acceptance harness for the shared matter runtime.
 *
 * It uses the real request handler and workflow policies while replacing only
 * external persistence, document storage/scanning, AI, packet, and checkout
 * provider seams with deterministic in-memory implementations.
 */
export function createMatterRuntimeAcceptanceHarness(
  options: MatterRuntimeAcceptanceHarnessOptions,
): MatterRuntimeAcceptanceHarness {
  const store = new InMemoryWorkflowRuntimeStore();
  const documents = new Map<string, AcceptanceDocumentDescriptor>();
  const checkoutCalls = { count: 0 };
  const actor = options.actor ?? { id: "acceptance-user", scopes: ["ai:execute"] };
  const accessToken = options.accessToken ?? "acceptance-token";
  const now = options.now ?? (() => "2026-09-17T00:00:00.000Z");
  let idCounter = 0;

  const dependencies: WorkflowRuntimeServerDependencies = {
    store,
    now,
    id: () => `acceptance-id-${++idCounter}`,
    authenticate: async (request) =>
      request.headers.get("authorization") === `Bearer ${accessToken}`
        ? actor
        : null,
    policyFor: options.policyFor,
    documents: {
      async upload({ file, consent }) {
        if (!consent) throw new Error("Document consent is required");
        const id = `acceptance-doc-${documents.size + 1}`;
        documents.set(id, {
          filename: file.name,
          mimeType: file.type || "application/pdf",
          sizeBytes: file.size,
          pageCount: 1,
          securityStatus: "clean",
          usable: true,
        });
        return {
          id,
          filename: file.name,
          sizeBytes: file.size,
          securityStatus: "clean",
        };
      },
      async describe({ documentId }) {
        const descriptor = documents.get(documentId);
        if (!descriptor) throw new Error(`Unknown acceptance document: ${documentId}`);
        return { ...descriptor };
      },
    },
    intelligence: {
      analyze:
        options.analyze ??
        (async ({ source }) => ({
          documentId: source.documentId,
          model: "acceptance-mock-analysis",
          result: {
            decision: "Denied",
            issuer: "Acceptance Insurer",
            referenceNumber: "ACC-1001",
            decisionDate: "2026-09-01",
            deadline: null,
            confidence: "high" as const,
            summary: "The source document records an adverse insurance claim decision.",
            reasons: ["The insurer stated a claim-specific reason in the source decision."],
            missingInformation: [],
            suggestedEvidence: [],
            promptInjectionObserved: false,
          },
        })),
      generateDraft:
        options.generateDraft ??
        (async ({ matter, caseInput }) => ({
          bodyText: [
            "Appeal of Insurance Decision",
            `Matter: ${matter.matter.workflowId}`,
            String(caseInput.input.reasonsForDisagreement ?? "I request reconsideration."),
            String(caseInput.input.requestedOutcome ?? "Please reconsider the decision."),
          ].join("\n\n"),
          model: "acceptance-mock-draft",
        })),
    },
    packet: {
      preview:
        options.previewPacket ??
        (async ({ matter, draft, documents: included, mailClass }) => {
          const packetSeed = JSON.stringify({
            matterId: matter.matter.id,
            workflowId: matter.matter.workflowId,
            draftVersion: draft.version,
            bodyText: draft.bodyText,
            mailClass,
            documents: included.map((document) => ({
              documentId: document.documentId,
              role: document.role,
              evidenceKind: document.evidenceKind,
              position: document.position,
            })),
          });
          const manifest: WorkflowPacketPreview["manifest"] = included.map((document) => ({
            documentId: document.documentId,
            role: document.role,
            evidenceKind: document.evidenceKind,
            filename: document.filename,
            sha256: sha256(document.documentId),
            pageCount: document.pageCount ?? 1,
          }));
          return {
            packetSha256: sha256(packetSeed),
            responsePages: 1,
            supportingPages: included.reduce(
              (sum, document) => sum + (document.pageCount ?? 1),
              0,
            ),
            manifest,
            quote: { totalCents: 1494 },
          };
        }),
    },
    checkout: {
      checkout:
        options.checkout ??
        (async ({ approval }) => {
          checkoutCalls.count += 1;
          return {
            checkoutUrl: `https://checkout.test/${approval.approvalId}`,
            orderId: `acceptance-order-${checkoutCalls.count}`,
            packetSha256: approval.packetSha256,
            totalCents: approval.totalCents,
          };
        }),
    },
  };

  const handle = createWorkflowRuntimeRequestHandler(dependencies);

  return {
    handle,
    store,
    documents,
    checkoutCalls,
    request(path, init = {}) {
      const headers = new Headers(init.headers);
      headers.set("authorization", `Bearer ${accessToken}`);
      return new Request(`https://acceptance.test/api/workflow-runtime${path}`, {
        ...init,
        headers,
      });
    },
    json<T = Record<string, unknown>>(response: Response) {
      return response.json() as Promise<T>;
    },
    setDocumentState(documentId, patch) {
      const current = documents.get(documentId);
      if (!current) throw new Error(`Unknown acceptance document: ${documentId}`);
      documents.set(documentId, { ...current, ...patch });
    },
  };
}
