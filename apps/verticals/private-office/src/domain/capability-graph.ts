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

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Verticals that contribute workflows to the capability graph.
 * Private Office owns the graph; verticals contribute capabilities.
 */
export type VerticalId =
  | "private-office"
  | "small-business"
  | "gov-reply"
  | "immigration";

/**
 * A capability is a discrete thing the user can do or has done.
 *
 * Lifecycle: locked → available → in-progress → completed
 */
export interface Capability {
  id: string;
  title: string;
  description: string;
  vertical: VerticalId;
  family: string;
  /** Links to a Private Office workflow — the executable process */
  workflowId?: WorkflowId;
  /** Capabilities that must be completed before this one is available */
  prerequisites: string[];
  /** Capabilities this one unlocks upon completion */
  unlocks: string[];
  /** Milestone this capability contributes to (all must be completed to reach milestone) */
  milestoneId?: string;
  /** Whether this is a reactive/defensive capability (vs. proactive/building) */
  reactive?: boolean;
}

/**
 * A named state reached by completing a set of capabilities.
 * Reaching a milestone can unlock additional capabilities.
 */
export interface CapabilityMilestone {
  id: string;
  title: string;
  description: string;
  /** All of these capabilities must be completed to reach this milestone */
  capabilities: string[];
  /** Capabilities unlocked when this milestone is reached */
  unlocks: string[];
}

/**
 * The full directed graph of capabilities, milestones, and unlock relationships.
 */
export interface CapabilityGraph {
  capabilities: Record<string, Capability>;
  milestones: Record<string, CapabilityMilestone>;
  /** Capabilities with no prerequisites — starting points */
  entryPoints: string[];
}

// ─── Business Formation Vertical ─────────────────────────────────────

const businessFormationCapabilities: Capability[] = [
  // ── Entry point ──
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

  // ── Post-LLC capabilities ──
  {
    id: "obtain-ein",
    title: "Obtain EIN",
    description:
      "Apply for an Employer Identification Number from the IRS for the new business entity.",
    vertical: "small-business",
    family: "Business Formation",
    prerequisites: ["form-llc"],
    unlocks: ["open-business-bank-account", "set-up-accounting", "obtain-business-credit", "hire-employees", "obtain-financing"],
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

  // ── Business Operational capabilities ──
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

  // ── Growing Business capabilities ──
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

// ─── Dispute & Defense Vertical (existing Gold Standard workflows) ───

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

// ─── Milestones ──────────────────────────────────────────────────────

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

// ─── Graph Construction ──────────────────────────────────────────────

function buildGraph(
  capabilities: Capability[],
  milestones: CapabilityMilestone[],
): CapabilityGraph {
  const capabilityMap: Record<string, Capability> = {};
  for (const cap of capabilities) {
    capabilityMap[cap.id] = cap;
  }

  const milestoneMap: Record<string, CapabilityMilestone> = {};
  for (const ms of milestones) {
    milestoneMap[ms.id] = ms;
  }

  const entryPoints = capabilities
    .filter((c) => c.prerequisites.length === 0)
    .map((c) => c.id);

  return {
    capabilities: capabilityMap,
    milestones: milestoneMap,
    entryPoints,
  };
}

export const capabilityGraph: CapabilityGraph = buildGraph(
  [...businessFormationCapabilities, ...disputeDefenseCapabilities],
  businessFormationMilestones,
);

// ─── Utility Functions ──────────────────────────────────────────────

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
  return Object.values(graph.capabilities).filter((c) => c.vertical === vertical);
}

export function getMilestone(
  graph: CapabilityGraph,
  id: string,
): CapabilityMilestone | undefined {
  return graph.milestones[id];
}

export function getReactiveCapabilities(graph: CapabilityGraph): Capability[] {
  return Object.values(graph.capabilities).filter((c) => c.reactive === true);
}

export function getProactiveCapabilities(graph: CapabilityGraph): Capability[] {
  return Object.values(graph.capabilities).filter((c) => c.reactive !== true);
}

/**
 * Validates the graph for integrity:
 * - All prerequisite references point to existing capabilities
 * - All unlock references point to existing capabilities
 * - All milestone references point to existing milestones
 * - No circular dependency chains
 */
export function validateGraph(graph: CapabilityGraph): string[] {
  const errors: string[] = [];

  for (const cap of Object.values(graph.capabilities)) {
    for (const prereq of cap.prerequisites) {
      if (!graph.capabilities[prereq]) {
        errors.push(`Capability "${cap.id}" has unknown prerequisite "${prereq}"`);
      }
    }
    for (const unlock of cap.unlocks) {
      if (!graph.capabilities[unlock]) {
        errors.push(`Capability "${cap.id}" unlocks unknown capability "${unlock}"`);
      }
    }
    if (cap.milestoneId && !graph.milestones[cap.milestoneId]) {
      errors.push(`Capability "${cap.id}" references unknown milestone "${cap.milestoneId}"`);
    }
  }

  for (const ms of Object.values(graph.milestones)) {
    for (const capId of ms.capabilities) {
      if (!graph.capabilities[capId]) {
        errors.push(`Milestone "${ms.id}" references unknown capability "${capId}"`);
      }
    }
    for (const unlock of ms.unlocks) {
      if (!graph.capabilities[unlock]) {
        errors.push(`Milestone "${ms.id}" unlocks unknown capability "${unlock}"`);
      }
    }
  }

  // Check for circular dependencies (DFS)
  for (const cap of Object.values(graph.capabilities)) {
    const visited = new Set<string>();
    const stack: string[] = [cap.id];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === cap.id && visited.has(cap.id)) {
        errors.push(`Circular dependency detected involving "${cap.id}"`);
        break;
      }
      if (visited.has(current)) continue;
      visited.add(current);
      const node = graph.capabilities[current];
      if (node) {
        for (const prereq of node.prerequisites) {
          if (prereq === cap.id && !visited.has(prereq)) {
            errors.push(`Circular dependency: "${cap.id}" → "${current}" → "${cap.id}"`);
            break;
          }
          if (!visited.has(prereq)) {
            stack.push(prereq);
          }
        }
      }
    }
  }

  return errors;
}
