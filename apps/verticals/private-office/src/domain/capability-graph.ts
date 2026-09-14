/**
 * Capability Graph — Domain Model
 *
 * The capability graph is the source of truth for what a user can do
 * at any given life state. Capabilities are organized into verticals,
 * have prerequisites, and unlock other capabilities upon completion.
 *
 * Milestones are named states reached by completing a set of capabilities.
 * Reaching a milestone can unlock additional capabilities.
 *
 * Each capability may link to a Private Office workflow — the executable
 * Gold Standard process that completes the capability.
 */

import type { WorkflowId } from "./workflows";

export type VerticalId =
  | "private-office"
  | "small-business"
  | "gov-reply"
  | "immigration";

export interface Capability {
  id: string;
  title: string;
  description: string;
  vertical: VerticalId;
  family: string;
  workflowId?: WorkflowId;
  prerequisites: string[];
  unlocks: string[];
  milestoneId?: string;
  reactive?: boolean;
}

export interface CapabilityMilestone {
  id: string;
  title: string;
  description: string;
  capabilities: string[];
  unlocks: string[];
}

export interface CapabilityGraph {
  capabilities: Record<string, Capability>;
  milestones: Record<string, CapabilityMilestone>;
  entryPoints: string[];
}

const businessFormationCapabilities: Capability[] = [
  {
    id: "form-llc",
    title: "Create LLC",
    description:
      "Form a limited liability company — file articles of organization, establish the business entity.",
    vertical: "small-business",
    family: "Business Formation",
    prerequisites: [],
    unlocks: [
      "obtain-ein",
      "register-dba",
      "open-business-bank-account",
      "obtain-local-license",
      "obtain-business-insurance",
      "set-up-accounting",
      "create-contracts",
      "contractor-dispute",
    ],
    milestoneId: "llc-established",
  },
  {
    id: "obtain-ein",
    title: "Obtain EIN",
    description:
      "Apply for an Employer Identification Number from the IRS for the new business entity.",
    vertical: "small-business",
    family: "Business Formation",
    prerequisites: ["form-llc"],
    unlocks: [
      "open-business-bank-account",
      "set-up-accounting",
      "obtain-business-credit",
      "hire-employees",
      "obtain-financing",
    ],
    milestoneId: "business-operational",
  },
  {
    id: "register-dba",
    title: "Register DBA",
    description:
      "Register a Doing Business As name if operating under a name different from the LLC name.",
    vertical: "small-business",
    family: "Business Formation",
    prerequisites: ["form-llc"],
    unlocks: [],
    milestoneId: "business-operational",
  },
  {
    id: "open-business-bank-account",
    title: "Open Business Bank Account",
    description:
      "Open a business checking account using the EIN and LLC formation documents.",
    vertical: "small-business",
    family: "Banking",
    prerequisites: ["obtain-ein"],
    unlocks: ["obtain-business-credit"],
    milestoneId: "business-operational",
  },
  {
    id: "obtain-local-license",
    title: "Obtain Local Business License",
    description:
      "Apply for required local business licenses and permits for the jurisdiction.",
    vertical: "small-business",
    family: "Licensing",
    prerequisites: ["form-llc"],
    unlocks: ["government-contracting"],
    milestoneId: "business-operational",
  },
  {
    id: "obtain-business-insurance",
    title: "Obtain Business Insurance",
    description:
      "Obtain general liability, professional liability, or workers' compensation insurance as needed.",
    vertical: "small-business",
    family: "Insurance",
    prerequisites: ["form-llc"],
    unlocks: ["hire-employees"],
    milestoneId: "business-operational",
  },
  {
    id: "set-up-accounting",
    title: "Set Up Accounting",
    description:
      "Establish a bookkeeping system, set up chart of accounts, and configure tax tracking.",
    vertical: "small-business",
    family: "Financial Management",
    prerequisites: ["obtain-ein"],
    unlocks: ["obtain-business-credit", "obtain-financing"],
    milestoneId: "business-operational",
  },
  {
    id: "create-contracts",
    title: "Create Business Contracts",
    description:
      "Prepare standard contracts — service agreements, vendor contracts, client agreements.",
    vertical: "private-office",
    family: "Legal Documents",
    prerequisites: ["form-llc"],
    unlocks: [],
    milestoneId: "business-operational",
  },
  {
    id: "hire-employees",
    title: "Hire Employees",
    description:
      "Establish payroll, obtain workers' compensation coverage, and onboard employees.",
    vertical: "small-business",
    family: "Employment",
    prerequisites: ["obtain-ein", "obtain-business-insurance"],
    unlocks: [],
    milestoneId: "growing-business",
  },
  {
    id: "obtain-business-credit",
    title: "Establish Business Credit",
    description:
      "Build a business credit profile separate from personal credit — trade lines, business credit cards.",
    vertical: "small-business",
    family: "Financial Management",
    prerequisites: ["open-business-bank-account", "set-up-accounting"],
    unlocks: ["obtain-financing"],
    milestoneId: "growing-business",
  },
  {
    id: "government-contracting",
    title: "Government Contracting",
    description:
      "Register for government contracting — SAM registration, set-aside certifications, bid on contracts.",
    vertical: "gov-reply",
    family: "Government",
    prerequisites: ["obtain-local-license"],
    unlocks: [],
    milestoneId: "growing-business",
  },
  {
    id: "obtain-financing",
    title: "Obtain Financing",
    description:
      "Apply for business loans, lines of credit, or investable capital.",
    vertical: "small-business",
    family: "Financial Management",
    prerequisites: ["obtain-business-credit"],
    unlocks: ["acquire-business", "expand-to-another-state"],
    milestoneId: "growing-business",
  },
  {
    id: "expand-to-another-state",
    title: "Expand to Another State",
    description:
      "Register as a foreign LLC in another state, obtain local licenses, and expand operations.",
    vertical: "small-business",
    family: "Business Formation",
    prerequisites: ["obtain-financing"],
    unlocks: ["multi-state-expansion"],
    milestoneId: "growing-business",
  },
  {
    id: "acquire-business",
    title: "Acquire Business",
    description:
      "Purchase an existing business — due diligence, asset purchase or stock purchase, transfer documents.",
    vertical: "small-business",
    family: "Business Growth",
    prerequisites: ["obtain-financing"],
    unlocks: ["subsidiary", "business-sale"],
    milestoneId: "mature-business",
  },
  {
    id: "multi-state-expansion",
    title: "Multi-State Expansion",
    description:
      "Operate across multiple states — multi-state tax registration, compliance, and administration.",
    vertical: "small-business",
    family: "Business Growth",
    prerequisites: ["expand-to-another-state"],
    unlocks: [],
    milestoneId: "mature-business",
  },
  {
    id: "subsidiary",
    title: "Establish Subsidiary",
    description:
      "Create a subsidiary entity under the parent LLC — separate filing, governance, and accounting.",
    vertical: "small-business",
    family: "Business Formation",
    prerequisites: ["acquire-business"],
    unlocks: [],
    milestoneId: "mature-business",
  },
  {
    id: "business-sale",
    title: "Sell Business",
    description:
      "Prepare for and execute a business sale — valuation, asset purchase agreement, transfer documents.",
    vertical: "small-business",
    family: "Business Growth",
    prerequisites: ["acquire-business"],
    unlocks: [],
    milestoneId: "mature-business",
  },
];

const disputeDefenseCapabilities: Capability[] = [
  {
    id: "contractor-dispute",
    title: "Contractor Dispute",
    description:
      "Prepare a documented contractor dispute letter for defective work, incomplete work, billing disputes, or breach of agreement.",
    vertical: "private-office",
    family: "Property Disputes",
    workflowId: "contractor-dispute",
    prerequisites: [],
    unlocks: ["property-insurance-claim"],
    reactive: true,
    milestoneId: "dispute-resolution",
  },
  {
    id: "property-insurance-claim",
    title: "Property Insurance Claim",
    description:
      "Document and pursue a property insurance claim — denied claims, underpayments, disputed scope, or supplemental claims.",
    vertical: "private-office",
    family: "Property Disputes",
    workflowId: "property-insurance-claim",
    prerequisites: [],
    unlocks: [],
    reactive: true,
    milestoneId: "dispute-resolution",
  },
  {
    id: "bank-wire-dispute",
    title: "Bank & Wire Transfer Dispute",
    description:
      "Document a bank or wire transfer dispute — unauthorized wires, mistaken transfers, beneficiary errors, or disputed transactions.",
    vertical: "private-office",
    family: "Financial Defense",
    workflowId: "bank-wire-dispute",
    prerequisites: [],
    unlocks: ["debt-validation-dispute"],
    reactive: true,
    milestoneId: "financial-protection",
  },
  {
    id: "debt-validation-dispute",
    title: "Debt Validation Dispute",
    description:
      "Document a debt validation dispute under the FDCPA — disputed debt, request for validation, unauthorized collection, or time-barred debt.",
    vertical: "private-office",
    family: "Financial Defense",
    workflowId: "debt-validation-dispute",
    prerequisites: [],
    unlocks: [],
    reactive: true,
    milestoneId: "financial-protection",
  },
  {
    id: "trust-beneficiary-notice",
    title: "Trust Beneficiary Notice",
    description:
      "Document a trust beneficiary matter — request for information, accounting, distribution status, or trustee communication.",
    vertical: "private-office",
    family: "Trust & Estate",
    workflowId: "trust-beneficiary-notice",
    prerequisites: [],
    unlocks: [],
    reactive: true,
  },
  {
    id: "security-deposit-dispute",
    title: "Security Deposit Dispute",
    description:
      "Document a security deposit dispute — non-return, partial return, unauthorized deductions, or disputed damage charges.",
    vertical: "private-office",
    family: "Property Disputes",
    workflowId: "security-deposit-dispute",
    prerequisites: [],
    unlocks: [],
    reactive: true,
  },
];

const businessFormationMilestones: CapabilityMilestone[] = [
  {
    id: "llc-established",
    title: "LLC Established",
    description: "The business entity has been legally formed.",
    capabilities: ["form-llc"],
    unlocks: [],
  },
  {
    id: "business-operational",
    title: "Business Operational",
    description:
      "The business is fully set up — EIN, banking, licensing, insurance, accounting, and contracts in place.",
    capabilities: [
      "obtain-ein",
      "register-dba",
      "open-business-bank-account",
      "obtain-local-license",
      "obtain-business-insurance",
      "set-up-accounting",
      "create-contracts",
    ],
    unlocks: [
      "hire-employees",
      "obtain-business-credit",
      "government-contracting",
      "obtain-financing",
      "expand-to-another-state",
    ],
  },
  {
    id: "growing-business",
    title: "Growing Business",
    description:
      "The business is growing — employees hired, credit established, financing secured, or expansion underway.",
    capabilities: [
      "hire-employees",
      "obtain-business-credit",
      "government-contracting",
      "obtain-financing",
      "expand-to-another-state",
    ],
    unlocks: [
      "acquire-business",
      "multi-state-expansion",
      "subsidiary",
      "business-sale",
    ],
  },
  {
    id: "mature-business",
    title: "Mature Business",
    description:
      "The business has reached maturity — acquisitions, multi-state operations, subsidiaries, or exit.",
    capabilities: [
      "acquire-business",
      "multi-state-expansion",
      "subsidiary",
      "business-sale",
    ],
    unlocks: [],
  },
  {
    id: "dispute-resolution",
    title: "Dispute Resolution",
    description:
      "Property disputes documented and pursued — contractor issues and insurance claims addressed.",
    capabilities: ["contractor-dispute", "property-insurance-claim"],
    unlocks: [],
  },
  {
    id: "financial-protection",
    title: "Financial Protection",
    description:
      "Financial defense matters resolved — bank/wire disputes and debt validation addressed.",
    capabilities: ["bank-wire-dispute", "debt-validation-dispute"],
    unlocks: [],
  },
];

function buildGraph(
  capabilities: Capability[],
  milestones: CapabilityMilestone[],
): CapabilityGraph {
  const capabilityMap: Record<string, Capability> = {};
  for (const cap of capabilities) capabilityMap[cap.id] = cap;

  const milestoneMap: Record<string, CapabilityMilestone> = {};
  for (const ms of milestones) milestoneMap[ms.id] = ms;

  return {
    capabilities: capabilityMap,
    milestones: milestoneMap,
    entryPoints: capabilities
      .filter((capability) => capability.prerequisites.length === 0)
      .map((capability) => capability.id),
  };
}

export const capabilityGraph: CapabilityGraph = buildGraph(
  [...businessFormationCapabilities, ...disputeDefenseCapabilities],
  businessFormationMilestones,
);

export function getCapability(
  graph: CapabilityGraph,
  id: string,
): Capability | undefined {
  return graph.capabilities[id];
}

export function getCapabilitiesByVertical(
  graph: CapabilityGraph,
  vertical: VerticalId,
): Capability[] {
  return Object.values(graph.capabilities).filter((capability) => capability.vertical === vertical);
}

export function getMilestone(
  graph: CapabilityGraph,
  id: string,
): CapabilityMilestone | undefined {
  return graph.milestones[id];
}

export function getReactiveCapabilities(graph: CapabilityGraph): Capability[] {
  return Object.values(graph.capabilities).filter((capability) => capability.reactive === true);
}

export function getProactiveCapabilities(graph: CapabilityGraph): Capability[] {
  return Object.values(graph.capabilities).filter((capability) => capability.reactive !== true);
}

export function validateGraph(graph: CapabilityGraph): string[] {
  const errors: string[] = [];

  for (const capability of Object.values(graph.capabilities)) {
    for (const prerequisite of capability.prerequisites) {
      if (!graph.capabilities[prerequisite]) {
        errors.push(`Capability "${capability.id}" has unknown prerequisite "${prerequisite}"`);
      }
    }
    for (const unlock of capability.unlocks) {
      if (!graph.capabilities[unlock]) {
        errors.push(`Capability "${capability.id}" unlocks unknown capability "${unlock}"`);
      }
    }
    if (capability.milestoneId && !graph.milestones[capability.milestoneId]) {
      errors.push(`Capability "${capability.id}" references unknown milestone "${capability.milestoneId}"`);
    }
  }

  for (const milestone of Object.values(graph.milestones)) {
    for (const capabilityId of milestone.capabilities) {
      if (!graph.capabilities[capabilityId]) {
        errors.push(`Milestone "${milestone.id}" references unknown capability "${capabilityId}"`);
      }
    }
    for (const unlock of milestone.unlocks) {
      if (!graph.capabilities[unlock]) {
        errors.push(`Milestone "${milestone.id}" unlocks unknown capability "${unlock}"`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (capabilityId: string): void => {
    if (visiting.has(capabilityId)) {
      errors.push(`Circular dependency detected involving "${capabilityId}"`);
      return;
    }
    if (visited.has(capabilityId)) return;
    visiting.add(capabilityId);
    for (const prerequisite of graph.capabilities[capabilityId]?.prerequisites ?? []) {
      visit(prerequisite);
    }
    visiting.delete(capabilityId);
    visited.add(capabilityId);
  };
  for (const capabilityId of Object.keys(graph.capabilities)) visit(capabilityId);

  return [...new Set(errors)];
}
