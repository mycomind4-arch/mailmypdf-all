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
  specializedChecks: [],
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

export const insuranceCoverageDenialWorkflow = defineInsuranceAppealWorkflow({
  workflowId: "appeal-insurance-coverage-denial",
  title: "Appeal an Insurance Coverage Denial",
  lifecycle: "authority",
  pricingWorkflowId: "insurance-coverage-denial",
  specializedChecks: ["coverage-analysis"],
  authorityRules: [
    "Use the actual coverage denial, policy or plan documents supplied by the user, issuer instructions, applicable regulator guidance, and current authoritative sources as the controlling record.",
    "Never invent coverage terms, exclusions, medical facts, policy language, deadlines, appeal rights, or outcomes.",
    "Do not assume all coverage denials share one appeal timeline or procedure; identify issuer, plan type, jurisdiction, and notice-specific instructions.",
    "Separate coverage interpretation, claim denial, prior authorization, internal appeal, external review, regulator complaint, and litigation paths when supported; never collapse them into one universal process.",
    "Unsupported procedural conclusions remain unresolved and block confident ready-to-send status.",
    "Never promise that coverage will be approved or a denial will be reversed.",
  ],
  authoritySources: [],
});

export const medicalNecessityDenialWorkflow = defineInsuranceAppealWorkflow({
  workflowId: "appeal-medical-necessity-denial",
  title: "Appeal a Medical Necessity Denial",
  lifecycle: "authority",
  pricingWorkflowId: "medical-necessity-appeal",
  specializedChecks: [],
  authorityRules: [
    "Use the actual denial notice, plan/policy language supplied by the user, applicable plan documents, and current authoritative sources as the controlling record.",
    "Never invent diagnoses, clinical history, medical necessity criteria, policy terms, regulations, deadlines, appeal rights, or outcomes.",
    "Keep insurer assertions separate from documented clinical facts and from unresolved medical questions.",
    "Do not treat a generic medical-necessity standard as the controlling rule when the notice identifies a plan-specific or program-specific criterion.",
    "Separate internal appeal, external review, peer review, regulator complaint, and other escalation mechanisms when the controlling sources support them.",
    "A deadline extracted from a notice remains unverified until the controlling notice/rule set supports its procedural meaning.",
    "Unsupported clinical or procedural conclusions remain unresolved and block confident ready-to-send status.",
    "Never promise that an appeal will overturn the medical-necessity determination.",
  ],
  authoritySources: [],
});

export const outOfNetworkDenialWorkflow = defineInsuranceAppealWorkflow({
  workflowId: "appeal-out-of-network-denial",
  title: "Appeal an Out-of-Network Denial",
  lifecycle: "authority",
  pricingWorkflowId: "out-of-network-denial",
  specializedChecks: [],
  authorityRules: [
    "Use the actual denial notice, plan or policy documents supplied by the user, and current official plan/regulator sources as the controlling record.",
    "Never invent network status, plan provisions, exceptions, balance-billing rules, deadlines, filing methods, medical facts, or outcomes.",
    "Distinguish an out-of-network denial from prior authorization, medical necessity, post-service claim denial, emergency/access exceptions, external review, and regulator complaints.",
    "Treat network status and exception eligibility as source-dependent facts; never infer them from provider type, ZIP code, or general practice.",
    "Separate insurer/plan instructions from general guidance and require source verification before procedural conclusions are treated as settled.",
    "Unsupported network, clinical, or procedural conclusions remain unresolved and block confident ready-to-send status.",
    "Never promise coverage, reimbursement, or an in-network exception.",
  ],
  authoritySources: [],
});

export const dentalInsuranceDenialWorkflow = defineInsuranceAppealWorkflow({
  workflowId: "appeal-dental-insurance-denial",
  title: "Dental Insurance Appeal",
  lifecycle: "authority",
  pricingWorkflowId: "dental-insurance-appeal",
  specializedChecks: [],
  authorityRules: [
    "Use the actual dental decision, plan/policy documents supplied by the user, and current official insurer/regulator sources as the controlling record.",
    "Never invent dental findings, procedure history, coverage limitations, deadlines, filing methods, or outcomes.",
    "Distinguish dental claim denial, medical necessity, prior authorization, network issues, coordination of benefits, and regulator complaint paths.",
    "A decision date is not automatically a deadline unless the notice or authoritative source supports that interpretation.",
    "Separate plan instructions from general guidance and verify procedural conclusions before treating them as settled.",
    "Unsupported dental, clinical, coverage, or procedural conclusions remain unresolved and block confident ready-to-send status.",
    "Never promise claim payment, coverage, or appeal success.",
  ],
  authoritySources: [],
});

export const lifeInsuranceDenialWorkflow = defineInsuranceAppealWorkflow({
  workflowId: "appeal-life-insurance-denial",
  title: "Life Insurance Denial Appeal",
  lifecycle: "authority",
  pricingWorkflowId: "life-insurance-denial",
  specializedChecks: ["policy-source-resolution"],
  authorityRules: [
    "Use the actual denial notice, policy/certificate documents supplied by the user, and current official regulator or insurer sources as the controlling record.",
    "Never invent policy provisions, exclusions, contestability rules, deadlines, filing methods, beneficiary facts, underwriting facts, or outcomes.",
    "Keep policy interpretation, factual disputes, underwriting/contestability issues, beneficiary information, and procedural requirements distinct.",
    "A claim or denial date is not automatically a filing deadline unless the notice or authoritative source supports that conclusion.",
    "Treat insurer instructions as specific to the notice and policy; require source verification before presenting general guidance as controlling.",
    "Unsupported policy, legal, medical, beneficiary, or procedural conclusions remain unresolved and block confident ready-to-send status.",
    "Never promise claim payment, policy reinstatement, or reversal of the denial.",
  ],
  authoritySources: [],
});

export const insuranceAppealWorkflowSpecs = [
  insuranceClaimDenialWorkflow,
  medicalInsuranceDenialWorkflow,
  priorAuthorizationDenialWorkflow,
  insuranceCoverageDenialWorkflow,
  medicalNecessityDenialWorkflow,
  outOfNetworkDenialWorkflow,
  dentalInsuranceDenialWorkflow,
  lifeInsuranceDenialWorkflow,
] as const;

const insuranceAppealWorkflowRegistry = new Map(
  insuranceAppealWorkflowSpecs.map((spec) => [spec.workflowId, spec] as const),
);

export function getInsuranceAppealWorkflowSpec(workflowId: string): InsuranceAppealWorkflowSpec | undefined {
  return insuranceAppealWorkflowRegistry.get(workflowId);
}
