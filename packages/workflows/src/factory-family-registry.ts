import {
  WORKFLOW_REGISTRY,
  type RuntimePolicyFamily,
  type WorkflowDefinition,
} from "./canonical-workflow-registry.js";
import type { WorkflowStartTemplate } from "./workflow-materialization.js";

export type FactoryFamilyId =
  | "records-request"
  | "notice-response"
  | "ssa-reconsideration"
  | "insurance-appeal"
  | "appeal-mail-general"
  | "benefits-appeal"
  | "claim-proof"
  | "code-enforcement"
  | "dispute-mail"
  | "immigration-mail"
  | "insurance-claims"
  | "legal-defense"
  | "permit-reply"
  | "private-office"
  | "small-business"
  | "tenant-reply"
  | "secured-transactions";

export type FactoryFamilyReadiness =
  | "factory-ready"
  | "review-gated"
  | "orchestrator-gap"
  | "materializer-gap"
  | "adapter-gap";

export type CatalogProductionDisposition =
  | "complete"
  | "ready-now"
  | "review-required"
  | "orchestrator-required"
  | "materializer-required"
  | "adapter-required";

export type FactoryFamilyAdapter = Readonly<{
  id: FactoryFamilyId;
  label: string;
  sections: readonly string[];
  readiness: FactoryFamilyReadiness;
  runtimePolicyFamily: RuntimePolicyFamily | null;
  startTemplate: WorkflowStartTemplate | null;
  note: string;
}>;

export type CatalogWorkflowProductionPlan = Readonly<{
  workflowId: string;
  label: string;
  sectionId: string;
  maturity: WorkflowDefinition["maturity"];
  familyId: FactoryFamilyId;
  familyLabel: string;
  familyReadiness: FactoryFamilyReadiness;
  disposition: CatalogProductionDisposition;
}>;

export type CatalogFamilyProductionSummary = Readonly<{
  familyId: FactoryFamilyId;
  label: string;
  readiness: FactoryFamilyReadiness;
  total: number;
  complete: number;
  unfinished: number;
  readyNow: number;
  reviewRequired: number;
  orchestratorRequired: number;
  materializerRequired: number;
  adapterRequired: number;
  unlockCount: number;
}>;

export type CanonicalCatalogProductionPlan = Readonly<{
  total: number;
  complete: number;
  unfinished: number;
  readyNow: number;
  reviewRequired: number;
  orchestratorRequired: number;
  materializerRequired: number;
  adapterRequired: number;
  workflows: readonly CatalogWorkflowProductionPlan[];
  families: readonly CatalogFamilyProductionSummary[];
}>;

export const FACTORY_FAMILY_ADAPTERS: readonly FactoryFamilyAdapter[] =
  Object.freeze([
    Object.freeze({
      id: "records-request",
      label: "Records Request",
      sections: Object.freeze(["records-request"]),
      readiness: "factory-ready",
      runtimePolicyFamily: "records-request",
      startTemplate: "records-request",
      note:
        "The supervised factory can adopt catalog workflows into the shared Records Request runtime today.",
    }),
    Object.freeze({
      id: "notice-response",
      label: "Notice Response",
      sections: Object.freeze(["notice-respond"]),
      readiness: "review-gated",
      runtimePolicyFamily: "notice-response",
      startTemplate: "notice-response",
      note:
        "The materializer and runtime exist, but new workflows still require a reviewer-authored authority-sensitive notice profile.",
    }),
    Object.freeze({
      id: "ssa-reconsideration",
      label: "SSA Reconsideration",
      sections: Object.freeze(["appeal-mail"]),
      readiness: "orchestrator-gap",
      runtimePolicyFamily: "ssa-reconsideration",
      startTemplate: "ssa-reconsideration",
      note:
        "The shared artifact and materializer exist; the persistent Factory Job executor still needs to admit this family.",
    }),
    Object.freeze({
      id: "insurance-appeal",
      label: "Insurance Appeal",
      sections: Object.freeze(["appeal-mail"]),
      readiness: "materializer-gap",
      runtimePolicyFamily: "insurance-appeal",
      startTemplate: null,
      note:
        "A platform runtime exists, but a family-level start materializer and supervised factory adapter are still missing.",
    }),
    Object.freeze({
      id: "appeal-mail-general",
      label: "General Appeal Mail",
      sections: Object.freeze(["appeal-mail"]),
      readiness: "adapter-gap",
      runtimePolicyFamily: null,
      startTemplate: null,
      note:
        "Catalog appeals outside the existing insurance and SSA runtime families need a reusable appeal adapter.",
    }),
    Object.freeze({
      id: "benefits-appeal",
      label: "Benefits Appeal",
      sections: Object.freeze(["benefits-appeal"]),
      readiness: "adapter-gap",
      runtimePolicyFamily: null,
      startTemplate: null,
      note:
        "Benefits appeals need a reusable authority-aware benefits appeal family adapter.",
    }),
    Object.freeze({
      id: "claim-proof",
      label: "Claim Proof",
      sections: Object.freeze(["claim-proof"]),
      readiness: "adapter-gap",
      runtimePolicyFamily: null,
      startTemplate: null,
      note:
        "Claim evidence and packet workflows need a shared claim-proof family adapter.",
    }),
    Object.freeze({
      id: "code-enforcement",
      label: "Code Enforcement",
      sections: Object.freeze(["code-enforcement"]),
      readiness: "adapter-gap",
      runtimePolicyFamily: null,
      startTemplate: null,
      note:
        "Code-enforcement notices, evidence, records, and responses need a shared reviewed family adapter.",
    }),
    Object.freeze({
      id: "dispute-mail",
      label: "Dispute Mail",
      sections: Object.freeze(["dispute-mail"]),
      readiness: "adapter-gap",
      runtimePolicyFamily: null,
      startTemplate: null,
      note:
        "Disputes need a reusable claim/fact/evidence/demand correspondence family adapter.",
    }),
    Object.freeze({
      id: "immigration-mail",
      label: "Immigration Mail",
      sections: Object.freeze(["immigration-mail"]),
      readiness: "materializer-gap",
      runtimePolicyFamily: "immigration-cover-letter",
      startTemplate: null,
      note:
        "The cover-letter runtime exists for the proven slice, but catalog-wide immigration materialization remains missing.",
    }),
    Object.freeze({
      id: "insurance-claims",
      label: "Insurance Claims",
      sections: Object.freeze(["insurance-claims"]),
      readiness: "adapter-gap",
      runtimePolicyFamily: null,
      startTemplate: null,
      note:
        "First-party claim submission and follow-up workflows need a reusable insurance-claim family adapter.",
    }),
    Object.freeze({
      id: "legal-defense",
      label: "Legal Defense",
      sections: Object.freeze(["legal-defense"]),
      readiness: "adapter-gap",
      runtimePolicyFamily: null,
      startTemplate: null,
      note:
        "Legal-defense correspondence and evidence packages need a reviewed legal-response family adapter.",
    }),
    Object.freeze({
      id: "permit-reply",
      label: "Permit Reply",
      sections: Object.freeze(["permit-reply"]),
      readiness: "adapter-gap",
      runtimePolicyFamily: null,
      startTemplate: null,
      note:
        "Permit requests and agency replies need a reusable permit-response adapter.",
    }),
    Object.freeze({
      id: "private-office",
      label: "Private Office",
      sections: Object.freeze(["private-office"]),
      readiness: "adapter-gap",
      runtimePolicyFamily: null,
      startTemplate: null,
      note:
        "Private-office matters need reusable correspondence, evidence, and recipient-resolution adapters.",
    }),
    Object.freeze({
      id: "small-business",
      label: "Small Business",
      sections: Object.freeze(["small-business"]),
      readiness: "adapter-gap",
      runtimePolicyFamily: null,
      startTemplate: null,
      note:
        "Business notices, disputes, collections, and records workflows need a small-business family adapter.",
    }),
    Object.freeze({
      id: "tenant-reply",
      label: "Tenant Reply",
      sections: Object.freeze(["tenant-reply"]),
      readiness: "adapter-gap",
      runtimePolicyFamily: null,
      startTemplate: null,
      note:
        "Tenant notices, disputes, repair demands, and evidence workflows need a tenant-response family adapter.",
    }),
    Object.freeze({
      id: "secured-transactions",
      label: "Secured Transactions",
      sections: Object.freeze(["secured-transactions"]),
      readiness: "adapter-gap",
      runtimePolicyFamily: null,
      startTemplate: null,
      note:
        "The domain engines exist separately; production workflows still need a reviewed factory adapter and runtime contract.",
    }),
  ] satisfies readonly FactoryFamilyAdapter[]);

const adapterById = new Map(
  FACTORY_FAMILY_ADAPTERS.map((adapter) => [adapter.id, adapter] as const),
);

const policyFamilyToFactoryFamily = Object.freeze({
  "insurance-appeal": "insurance-appeal",
  "ssa-reconsideration": "ssa-reconsideration",
  "immigration-cover-letter": "immigration-mail",
  "records-request": "records-request",
  "notice-response": "notice-response",
} satisfies Readonly<Record<RuntimePolicyFamily, FactoryFamilyId>>);

const sectionFallback: Readonly<Record<string, FactoryFamilyId>> = Object.freeze({
  "appeal-mail": "appeal-mail-general",
  "benefits-appeal": "benefits-appeal",
  "claim-proof": "claim-proof",
  "code-enforcement": "code-enforcement",
  "dispute-mail": "dispute-mail",
  "immigration-mail": "immigration-mail",
  "insurance-claims": "insurance-claims",
  "legal-defense": "legal-defense",
  "notice-respond": "notice-response",
  "permit-reply": "permit-reply",
  "private-office": "private-office",
  "records-request": "records-request",
  "small-business": "small-business",
  "tenant-reply": "tenant-reply",
  "secured-transactions": "secured-transactions",
} satisfies Readonly<Record<string, FactoryFamilyId>>);

function adapterForId(id: FactoryFamilyId): FactoryFamilyAdapter {
  const adapter = adapterById.get(id);
  if (!adapter) throw new Error(`Factory family adapter '${id}' is not registered.`);
  return adapter;
}

export function factoryFamilyForWorkflow(
  workflow: WorkflowDefinition,
): FactoryFamilyAdapter {
  if (workflow.execution?.kind === "platform") {
    return adapterForId(
      policyFamilyToFactoryFamily[workflow.execution.policyFamily],
    );
  }

  const fallback = sectionFallback[workflow.sectionId];
  if (!fallback) {
    throw new Error(
      `Canonical workflow ${workflow.id} has no factory-family classification.`,
    );
  }
  return adapterForId(fallback);
}

function dispositionForWorkflow(
  workflow: WorkflowDefinition,
  adapter: FactoryFamilyAdapter,
): CatalogProductionDisposition {
  if (workflow.maturity === "executable") return "complete";

  switch (adapter.readiness) {
    case "factory-ready":
      return "ready-now";
    case "review-gated":
      return "review-required";
    case "orchestrator-gap":
      return "orchestrator-required";
    case "materializer-gap":
      return "materializer-required";
    case "adapter-gap":
      return "adapter-required";
  }
}

export function planCanonicalCatalogProduction(
  workflows: readonly WorkflowDefinition[] = WORKFLOW_REGISTRY,
): CanonicalCatalogProductionPlan {
  const planned = Object.freeze(
    workflows.map((workflow): CatalogWorkflowProductionPlan => {
      const family = factoryFamilyForWorkflow(workflow);
      return Object.freeze({
        workflowId: workflow.id,
        label: workflow.label,
        sectionId: workflow.sectionId,
        maturity: workflow.maturity,
        familyId: family.id,
        familyLabel: family.label,
        familyReadiness: family.readiness,
        disposition: dispositionForWorkflow(workflow, family),
      });
    }),
  );

  const count = (disposition: CatalogProductionDisposition) =>
    planned.filter((workflow) => workflow.disposition === disposition).length;

  const families = Object.freeze(
    FACTORY_FAMILY_ADAPTERS.map((adapter): CatalogFamilyProductionSummary => {
      const members = planned.filter(
        (workflow) => workflow.familyId === adapter.id,
      );
      const familyCount = (disposition: CatalogProductionDisposition) =>
        members.filter((workflow) => workflow.disposition === disposition).length;
      const complete = familyCount("complete");
      const unfinished = members.length - complete;
      return Object.freeze({
        familyId: adapter.id,
        label: adapter.label,
        readiness: adapter.readiness,
        total: members.length,
        complete,
        unfinished,
        readyNow: familyCount("ready-now"),
        reviewRequired: familyCount("review-required"),
        orchestratorRequired: familyCount("orchestrator-required"),
        materializerRequired: familyCount("materializer-required"),
        adapterRequired: familyCount("adapter-required"),
        unlockCount: unfinished,
      });
    })
      .filter((family) => family.total > 0)
      .sort(
        (left, right) =>
          right.unlockCount - left.unlockCount ||
          left.label.localeCompare(right.label),
      ),
  );

  const complete = count("complete");
  return Object.freeze({
    total: planned.length,
    complete,
    unfinished: planned.length - complete,
    readyNow: count("ready-now"),
    reviewRequired: count("review-required"),
    orchestratorRequired: count("orchestrator-required"),
    materializerRequired: count("materializer-required"),
    adapterRequired: count("adapter-required"),
    workflows: planned,
    families,
  });
}
