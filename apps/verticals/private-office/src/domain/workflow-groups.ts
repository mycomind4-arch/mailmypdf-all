import type { RequirementRule } from "./requirement-rules";
import { allOf } from "./requirement-rules";

export type WorkflowGroupCompletionRule =
  | { type: "all-required"; capabilityIds: string[] }
  | { type: "core-plus-optional"; coreCapabilityIds: string[] }
  | { type: "threshold"; minimum: number; capabilityIds: string[] }
  | { type: "requirement"; requirement: RequirementRule };

export interface WorkflowGroupDefinition {
  id: string;
  title: string;
  description: string;
  workflowIds: string[];
  completionRule: WorkflowGroupCompletionRule;
  unlockRequirement?: RequirementRule;
  grantsCapabilities?: string[];
}

export const businessWorkflowGroups: WorkflowGroupDefinition[] = [
  {
    id: "form-business",
    title: "Form Business",
    description: "Create and legally establish the business entity.",
    workflowIds: ["form-llc"],
    completionRule: { type: "all-required", capabilityIds: ["form-llc"] },
    grantsCapabilities: ["business-entity-active"],
  },
  {
    id: "establish-business-identity",
    title: "Establish Business Identity",
    description: "Establish the business identity, tax identity, ownership record, and required registrations.",
    workflowIds: ["obtain-ein", "register-dba"],
    completionRule: { type: "requirement", requirement: allOf("form-llc", "obtain-ein") },
    unlockRequirement: allOf("form-llc"),
    grantsCapabilities: ["business-identity-established"],
  },
  {
    id: "financial-infrastructure",
    title: "Financial Infrastructure",
    description: "Establish banking and accounting infrastructure sufficient to operate the business cleanly.",
    workflowIds: ["open-business-bank-account", "set-up-accounting"],
    completionRule: { type: "all-required", capabilityIds: ["open-business-bank-account", "set-up-accounting"] },
    unlockRequirement: allOf("form-llc", "obtain-ein"),
    grantsCapabilities: ["business-financially-operational"],
  },
  {
    id: "legal-commercial-infrastructure",
    title: "Legal & Commercial Infrastructure",
    description: "Create the baseline commercial documents needed to transact with customers, vendors, and contractors.",
    workflowIds: ["create-contracts"],
    completionRule: { type: "all-required", capabilityIds: ["create-contracts"] },
    unlockRequirement: allOf("form-llc"),
    grantsCapabilities: ["can-contract"],
  },
  {
    id: "licensing-compliance",
    title: "Licensing & Compliance",
    description: "Determine and complete jurisdiction-dependent licenses, permits, registrations, and compliance tracking.",
    workflowIds: ["obtain-local-license"],
    completionRule: { type: "all-required", capabilityIds: ["obtain-local-license"] },
    unlockRequirement: allOf("form-llc"),
    grantsCapabilities: ["authorized-to-operate"],
  },
  {
    id: "risk-infrastructure",
    title: "Risk Infrastructure",
    description: "Put appropriate business insurance and risk controls in place.",
    workflowIds: ["obtain-business-insurance"],
    completionRule: { type: "all-required", capabilityIds: ["obtain-business-insurance"] },
    unlockRequirement: allOf("form-llc"),
    grantsCapabilities: ["business-risk-infrastructure-established"],
  },
  {
    id: "business-operational",
    title: "Business Operational",
    description: "Convergence state: the business has enough identity, financial, commercial, licensing, and risk infrastructure to operate.",
    workflowIds: ["form-llc", "obtain-ein", "register-dba", "open-business-bank-account", "set-up-accounting", "create-contracts", "obtain-local-license", "obtain-business-insurance"],
    completionRule: {
      type: "requirement",
      requirement: allOf("form-llc", "obtain-ein", "open-business-bank-account", "set-up-accounting", "create-contracts", "obtain-local-license", "obtain-business-insurance"),
    },
    unlockRequirement: allOf("form-llc"),
    grantsCapabilities: ["operating-business"],
  },
  {
    id: "employer",
    title: "Employer",
    description: "Establish the infrastructure and obligations necessary to employ workers.",
    workflowIds: ["hire-employees"],
    completionRule: { type: "all-required", capabilityIds: ["hire-employees"] },
    unlockRequirement: allOf("obtain-ein", "obtain-business-insurance"),
    grantsCapabilities: ["employer"],
  },
  {
    id: "business-credit",
    title: "Business Credit",
    description: "Build a business credit profile using established financial infrastructure.",
    workflowIds: ["obtain-business-credit"],
    completionRule: { type: "all-required", capabilityIds: ["obtain-business-credit"] },
    unlockRequirement: allOf("open-business-bank-account", "set-up-accounting"),
    grantsCapabilities: ["creditworthy-business"],
  },
  {
    id: "government-contracting",
    title: "Government Contracting",
    description: "Prepare the business to register, qualify, bid, and perform government contracts.",
    workflowIds: ["government-contracting"],
    completionRule: { type: "all-required", capabilityIds: ["government-contracting"] },
    unlockRequirement: allOf("obtain-ein", "obtain-local-license"),
    grantsCapabilities: ["government-contracting-capable"],
  },
  {
    id: "financing",
    title: "Financing",
    description: "Prepare for and pursue business debt or equity financing.",
    workflowIds: ["obtain-financing"],
    completionRule: { type: "all-required", capabilityIds: ["obtain-financing"] },
    unlockRequirement: allOf("obtain-business-credit"),
    grantsCapabilities: ["financeable-business"],
  },
  {
    id: "expansion",
    title: "Expansion",
    description: "Expand the business into additional jurisdictions, locations, or product lines.",
    workflowIds: ["expand-to-another-state", "multi-state-expansion"],
    completionRule: { type: "threshold", minimum: 1, capabilityIds: ["expand-to-another-state", "multi-state-expansion"] },
    unlockRequirement: allOf("obtain-financing"),
    grantsCapabilities: ["growing-business"],
  },
  {
    id: "acquisition",
    title: "Acquisition",
    description: "Identify, evaluate, finance, execute, and integrate a business acquisition.",
    workflowIds: ["acquire-business"],
    completionRule: { type: "all-required", capabilityIds: ["acquire-business"] },
    unlockRequirement: allOf("obtain-financing"),
    grantsCapabilities: ["acquisition-capable"],
  },
  {
    id: "enterprise-exit",
    title: "Enterprise & Exit",
    description: "Support enterprise structuring, subsidiary creation, valuation, and eventual exit.",
    workflowIds: ["subsidiary", "business-sale"],
    completionRule: { type: "threshold", minimum: 1, capabilityIds: ["subsidiary", "business-sale"] },
    unlockRequirement: allOf("acquire-business"),
    grantsCapabilities: ["enterprise", "exit-capable"],
  },
];

export const workflowGroups: Record<string, WorkflowGroupDefinition> = Object.fromEntries(
  businessWorkflowGroups.map((group) => [group.id, group]),
);
