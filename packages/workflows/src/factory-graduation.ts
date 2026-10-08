import { WORKFLOW_REGISTRY } from "./canonical-workflow-registry.js";
import { canonicalChatFactoryReport } from "./chat-execution-registry.js";

/**
 * Read-only graduation planning for the Workflow Factory.
 *
 * A chat-certified manifest verifies declarative tool/field/gate contracts.
 * It is NOT an end-to-end acceptance test, a deployment certificate, or proof
 * of an actual payment or physical mailing. Keep those signals separate.
 */
export const REFERENCE_JOURNEYS = Object.freeze([
  {
    id: "conversational-letter",
    label: "Conversational letter mailing",
    workflowId: null,
    requiredTools: [
      "prepare_conversational_letter",
      "review_direct_pdf_mail",
      "approve_direct_pdf_mail",
      "get_payment_readiness",
      "prepare_direct_pdf_checkout",
      "charge_and_send_direct_pdf_mail",
      "get_order_status",
    ],
    acceptanceTestPaths: ["mailmypdf/tests/mcp-conversational-letter-e2e-harness.test.mjs", "mailmypdf/tests/mcp-direct-mail.test.ts"],
    nextAcceptance: "Run the draft, immutable PDF/envelope review, approval, sandbox charge, Lob submission, status and proof-of-mailing scenario.",
  },
  {
    id: "cp14-response",
    label: "IRS CP14 response",
    workflowId: "notice-respond/cp14-response",
    requiredTools: [],
    acceptanceTestPaths: ["mailmypdf/tests/notice-workflow-factory.test.ts", "mailmypdf/tests/workflow-runtime.test.ts"],
    nextAcceptance: "Verify notice intake, source extraction, required fact review, correct letter and exhibits, approval-bound payment and tracked mailing.",
  },
  {
    id: "public-records-request",
    label: "Public records request",
    workflowId: "records-request/public-records-request",
    requiredTools: [],
    acceptanceTestPaths: ["mailmypdf/tests/records-request-draft-runtime.test.ts", "mailmypdf/tests/mcp-connector.test.ts"],
    nextAcceptance: "Verify request-first intake, agency and jurisdiction review, exemptions, response deadline, exact packet, approval, and mailing evidence.",
  },
] as const);

export type FactoryMilestone =
  | "certify-chat-contract"
  | "register-chat-contract"
  | "connect-domain-runtime"
  | "build-runtime";

export type FactoryQueueItem = Readonly<{
  id: string;
  label: string;
  sectionId: string;
  maturity: string;
  priority: number;
  milestone: FactoryMilestone;
  diagnosticCodes: readonly string[];
  nextAction: string;
}>;

function milestoneFor(reason: string): { milestone: FactoryMilestone; priority: number; nextAction: string } {
  if (reason === "certification-failed") return {
    milestone: "certify-chat-contract", priority: 0,
    nextAction: "Repair the concrete manifest, field, gate or connector-tool diagnostics and rerun chat certification.",
  };
  if (reason === "chat-contract-not-registered") return {
    milestone: "register-chat-contract", priority: 1,
    nextAction: "Register the actual runtime chat contract and rerun certification. Do not invent a runtime policy.",
  };
  if (reason === "platform-runtime-not-registered") return {
    milestone: "build-runtime", priority: 3,
    nextAction: "Implement a reviewed manifest, real runtime binding, approval gates and acceptance scenarios before claiming chat execution.",
  };
  return {
    milestone: "connect-domain-runtime", priority: 2,
    nextAction: "Connect the existing domain intake to a reviewed platform manifest and runtime before enabling mailing actions.",
  };
}

/** Deterministic per-workflow backlog; never mutates repository or customer data. */
export function buildFactoryGraduationReport(
  availableTools: ReadonlySet<string> | readonly string[],
) {
  const tools = new Set(availableTools);
  const certifications = canonicalChatFactoryReport(tools);
  const byId = new Map(certifications.map((entry) => [entry.id, entry]));
  const canonical = new Map(WORKFLOW_REGISTRY.map((workflow) => [workflow.id, workflow]));

  const journeys = REFERENCE_JOURNEYS.map((journey) => {
    const record = journey.workflowId ? byId.get(journey.workflowId) : null;
    const workflow = journey.workflowId ? canonical.get(journey.workflowId) : null;
    const missingTools = journey.requiredTools.filter((name) => !tools.has(name));
    const contractReady = journey.workflowId
      ? record?.chatExecutable === true
      : missingTools.length === 0;

    return Object.freeze({
      id: journey.id,
      label: journey.label,
      workflowId: journey.workflowId,
      workspaceHref: workflow?.workspaceHref ?? null,
      // For ordinary letters this means only that the necessary MCP tools
      // exist. For specialist workflows it additionally means that manifest,
      // runtime contract and connector schemas have passed certification.
      contractReady,
      contractEvidence: journey.workflowId ? "manifest-chat-certification" as const : "tool-surface-only" as const,
      missingTools: Object.freeze(missingTools),
      diagnostics: Object.freeze(record?.diagnostics ?? []),
      acceptance: "not-verified-by-this-report" as const,
      liveFulfillment: "not-verified-by-this-report" as const,
      acceptanceTestPaths: journey.acceptanceTestPaths,
      nextAcceptance: journey.nextAcceptance,
    });
  });

  const queue: FactoryQueueItem[] = [];
  for (const workflow of WORKFLOW_REGISTRY) {
    const check = byId.get(workflow.id);
    if (check?.chatExecutable === true) continue;
    const { milestone, priority, nextAction } = milestoneFor(check?.reason ?? "");
    const priorityBoost = REFERENCE_JOURNEYS.some((journey) => journey.workflowId === workflow.id) ? -1 : 0;
    queue.push(Object.freeze({
      id: workflow.id,
      label: workflow.label,
      sectionId: workflow.sectionId,
      maturity: workflow.maturity,
      priority: Math.max(0, priority + priorityBoost),
      milestone,
      diagnosticCodes: Object.freeze([...(check?.diagnostics ?? [])].map((diagnostic) => diagnostic.code)),
      nextAction,
    }));
  }
  queue.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  return Object.freeze({
    schemaVersion: "mailmypdf.factory-graduation/v1" as const,
    summary: Object.freeze({
      total: WORKFLOW_REGISTRY.length,
      platformRuntimeRegistered: WORKFLOW_REGISTRY.filter((w) => w.execution?.kind === "platform").length,
      localIntakes: WORKFLOW_REGISTRY.filter((w) => w.execution?.kind === "local").length,
      chatContractCertified: certifications.filter((w) => w.chatExecutable).length,
      awaitingGraduation: queue.length,
      referenceContractsReady: journeys.filter((j) => j.contractReady).length,
      referencesTotal: journeys.length,
    }),
    references: Object.freeze(journeys),
    queue: Object.freeze(queue),
  });
}
