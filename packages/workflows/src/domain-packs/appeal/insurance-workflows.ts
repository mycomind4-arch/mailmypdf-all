import type { DomainCapability } from "../../domain-pack-contract.js";
import { insuranceAppealManifest } from "./insurance-packs.js";

export interface AppealAuthoritySource {
  title: string;
  url: string;
  freshnessRule: "verify-before-use";
}

/**
 * A thin workflow-specific overlay on the reusable insurance appeal pack.
 * It carries only distinctions that actually vary by workflow. The shared
 * engine remains responsible for extraction, evidence, timeline, strategy,
 * drafting, validation, packet generation, mailing, tracking, and proof.
 */
export interface InsuranceAppealWorkflowSpec {
  workflowId: string;
  title: string;
  lifecycle: "authority";
  baseDomainPackId: typeof insuranceAppealManifest.id;
  canonicalCapabilities: readonly DomainCapability[];
  specializedChecks: readonly string[];
  authorityRules: readonly string[];
  authoritySources: readonly AppealAuthoritySource[];
  pricingWorkflowId: string;
}

function defineInsuranceAppealWorkflow(
  spec: Omit<InsuranceAppealWorkflowSpec, "baseDomainPackId" | "canonicalCapabilities">,
): InsuranceAppealWorkflowSpec {
  if (!spec.workflowId.startsWith("appeal-")) {
    throw new Error(`Insurance appeal workflow id must use canonical appeal identity: ${spec.workflowId}`);
  }
  if (!spec.pricingWorkflowId.trim()) throw new Error(`Insurance appeal workflow ${spec.workflowId} requires pricingWorkflowId`);
  if (!spec.authorityRules.length) throw new Error(`Insurance appeal workflow ${spec.workflowId} requires authority rules`);
  return {
    ...spec,
    baseDomainPackId: insuranceAppealManifest.id,
    canonicalCapabilities: insuranceAppealManifest.capabilities,
  };
}

export const insuranceClaimDenialWorkflow = defineInsuranceAppealWorkflow({
  workflowId: "appeal-insurance-claim-denial",
  title: "Appeal an Insurance Claim Denial",
  lifecycle: "authority",
  pricingWorkflowId: "denied-claim",
  specializedChecks: [],
  authorityRules: [
    "Use the actual denial notice, policy/plan documents supplied by the user, applicable regulator guidance, and current authoritative sources as the controlling record.",
    "Never invent coverage terms, exclusions, claim facts, diagnoses, damages, appeal rights, deadlines, or outcomes.",
    "Do not assume all insurance claims share one appeal timeline or procedure; identify the issuer, plan type, jurisdiction, and notice-specific instructions.",
    "Separate internal appeal, external review, regulator complaint, and litigation/escalation paths when supported; never collapse them into one universal process.",
    "Unsupported procedural conclusions remain unresolved and block confident ready-to-send status.",
    "Never promise that an appeal will reverse the denial.",
  ],
  authoritySources: [
    { title: "CMS — Appeals", url: "https://www.cms.gov/medicare/appeals-grievances/medicare-health-plans", freshnessRule: "verify-before-use" },
    { title: "Healthcare.gov — Appeal a health plan decision", url: "https://www.healthcare.gov/marketplace-appeals/", freshnessRule: "verify-before-use" },
    { title: "NAIC — Consumer Insurance Information", url: "https://content.naic.org/consumer", freshnessRule: "verify-before-use" },
  ],
});

export const medicalInsuranceDenialWorkflow = defineInsuranceAppealWorkflow({
  workflowId: "appeal-medical-insurance-denial",
  title: "Appeal a Medical Insurance Denial",
  lifecycle: "authority",
  pricingWorkflowId: "medical-insurance-denial",
  specializedChecks: ["medical-necessity-analysis"],
  authorityRules: [
    "Treat the actual denial notice, plan or policy documents, applicable federal or state requirements, and current official sources as controlling.",
    "Never invent diagnoses, symptoms, treatment history, clinical findings, coverage terms, medical-necessity criteria, deadlines, appeal rights, or outcomes.",
    "Separate medical-necessity review from general coverage, prior authorization, network, coding, timely-filing, and external-review mechanisms.",
    "Do not treat a generic clinical guideline as the controlling plan criterion unless the source record establishes that relationship.",
    "Flag missing clinical records, provider statements, diagnostic evidence, or treatment history rather than filling gaps with assumptions.",
    "Unsupported procedural conclusions remain unresolved and block confident ready-to-send status.",
  ],
  authoritySources: [],
});

export const priorAuthorizationDenialWorkflow = defineInsuranceAppealWorkflow({
  workflowId: "appeal-prior-authorization-denial",
  title: "Appeal a Prior Authorization Denial",
  lifecycle: "authority",
  pricingWorkflowId: "prior-authorization-denial",
  specializedChecks: ["prior-authorization-path-analysis"],
  authorityRules: [
    "Use the actual denial notice, plan or policy documents supplied by the user, and current official plan/regulator sources as the controlling record.",
    "Never invent authorization criteria, coverage rules, deadlines, filing methods, medical facts, or outcomes.",
    "Distinguish prior authorization from medical necessity, post-service claim denial, network disputes, external review, and regulator complaints.",
    "A denial date is not automatically a deadline unless the notice or authoritative rules support that interpretation.",
    "Separate insurer/plan instructions from general guidance and require source verification before procedural conclusions are treated as settled.",
    "Unsupported clinical or procedural conclusions remain unresolved and block confident ready-to-send status.",
    "Never promise approval of the requested service or treatment.",
  ],
  authoritySources: [],
});

export const insuranceAppealWorkflowSpecs = [
  insuranceClaimDenialWorkflow,
  medicalInsuranceDenialWorkflow,
  priorAuthorizationDenialWorkflow,
] as const;

const insuranceAppealWorkflowRegistry = new Map(
  insuranceAppealWorkflowSpecs.map((spec) => [spec.workflowId, spec] as const),
);

export function getInsuranceAppealWorkflowSpec(workflowId: string): InsuranceAppealWorkflowSpec | undefined {
  return insuranceAppealWorkflowRegistry.get(workflowId);
}
