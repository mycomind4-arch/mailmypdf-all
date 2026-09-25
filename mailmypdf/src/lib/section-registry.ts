/**
 * Canonical MailMyPDF section topology.
 *
 * Root-level sections are the public product architecture. Navigation, legacy
 * vertical compatibility, topology verification, and section-level discovery
 * should derive from this registry instead of maintaining separate lists.
 */

export type SectionLifecycleStatus = "planned" | "beta" | "live";
export type SectionExecutionState = "catalog" | "domain-ready" | "executable" | "gold";
export type SectionCategory =
  | "government"
  | "appeals"
  | "disputes"
  | "housing"
  | "professional"
  | "legal"
  | "business";

export type SectionCapabilities = {
  requiresAI: boolean;
  requiresDocuments: boolean;
  supportsDrafting: boolean;
  supportsEvidence: boolean;
  supportsMailing: boolean;
};

export type SectionDefinition = {
  id: string;
  name: string;
  shortName: string;
  path: `/${string}`;
  tagline: string;
  description: string;
  category: SectionCategory;
  categoryLabel: string;
  status: SectionLifecycleStatus;
  executionState: SectionExecutionState;
  icon: string;
  primaryCTA: string;
  enabled: boolean;
  capabilities: SectionCapabilities;
};

export const SECTION_REGISTRY = [
  {
    id: "appeal-mail",
    name: "Appeal Mail",
    shortName: "Appeal Mail",
    path: "/appeal-mail",
    tagline: "Build and mail an appeal.",
    description: "Appeals, reconsiderations, denials, adverse decisions, supporting evidence, review, and mailing.",
    category: "appeals",
    categoryLabel: "Appeals / Claims",
    status: "live",
    executionState: "catalog",
    icon: "Scale",
    primaryCTA: "Start an Appeal",
    enabled: true,
    capabilities: { requiresAI: true, requiresDocuments: true, supportsDrafting: true, supportsEvidence: true, supportsMailing: true },
  },
  {
    id: "benefits-appeal",
    name: "Benefits Appeal",
    shortName: "Benefits Appeal",
    path: "/benefits-appeal",
    tagline: "Organize a benefits appeal.",
    description: "Benefits denials, reconsideration, documentation, evidence packages, and review preparation.",
    category: "appeals",
    categoryLabel: "Appeals / Claims",
    status: "planned",
    executionState: "catalog",
    icon: "HeartPulse",
    primaryCTA: "Start an Appeal",
    enabled: true,
    capabilities: { requiresAI: true, requiresDocuments: true, supportsDrafting: true, supportsEvidence: true, supportsMailing: true },
  },
  {
    id: "claim-proof",
    name: "Claim Proof",
    shortName: "Claim Proof",
    path: "/claim-proof",
    tagline: "Organize and prove a claim.",
    description: "Evidence-first claim documentation, supporting records, cover letters, and proof packages.",
    category: "appeals",
    categoryLabel: "Appeals / Claims",
    status: "live",
    executionState: "catalog",
    icon: "FileCheck",
    primaryCTA: "Start a Claim",
    enabled: true,
    capabilities: { requiresAI: true, requiresDocuments: true, supportsDrafting: true, supportsEvidence: true, supportsMailing: true },
  },
  {
    id: "code-enforcement",
    name: "Code Enforcement",
    shortName: "Code Enforcement",
    path: "/code-enforcement",
    tagline: "Build the record around a code-enforcement matter.",
    description: "Notices, inspections, property facts, evidence, compliance, hearings, deadlines, and case records.",
    category: "government",
    categoryLabel: "Government / Official",
    status: "planned",
    executionState: "catalog",
    icon: "Landmark",
    primaryCTA: "Start a Response",
    enabled: true,
    capabilities: { requiresAI: true, requiresDocuments: true, supportsDrafting: true, supportsEvidence: true, supportsMailing: true },
  },
  {
    id: "dispute-mail",
    name: "Dispute Mail",
    shortName: "Dispute Mail",
    path: "/dispute-mail",
    tagline: "Dispute it in writing.",
    description: "Debt, credit, billing, collections, unauthorized charges, evidence, and documented dispute correspondence.",
    category: "disputes",
    categoryLabel: "Disputes",
    status: "live",
    executionState: "catalog",
    icon: "ShieldAlert",
    primaryCTA: "Start a Dispute",
    enabled: true,
    capabilities: { requiresAI: true, requiresDocuments: true, supportsDrafting: true, supportsEvidence: true, supportsMailing: true },
  },
  {
    id: "immigration-mail",
    name: "Immigration Mail",
    shortName: "Immigration Mail",
    path: "/immigration-mail",
    tagline: "Organize immigration correspondence.",
    description: "Immigration notices, evidence packages, records requests, explanation letters, review, and mailing.",
    category: "government",
    categoryLabel: "Immigration",
    status: "live",
    executionState: "catalog",
    icon: "FileText",
    primaryCTA: "Start a Matter",
    enabled: true,
    capabilities: { requiresAI: true, requiresDocuments: true, supportsDrafting: true, supportsEvidence: true, supportsMailing: true },
  },
  {
    id: "insurance-claims",
    name: "Insurance Claims",
    shortName: "Insurance Claims",
    path: "/insurance-claims",
    tagline: "Prepare the claim record.",
    description: "Claims, denials, underpayments, evidence, supplements, correspondence, and appeals.",
    category: "appeals",
    categoryLabel: "Appeals / Claims",
    status: "planned",
    executionState: "catalog",
    icon: "ShieldCheck",
    primaryCTA: "Start a Claim",
    enabled: true,
    capabilities: { requiresAI: true, requiresDocuments: true, supportsDrafting: true, supportsEvidence: true, supportsMailing: true },
  },
  {
    id: "legal-defense",
    name: "Legal Defense",
    shortName: "Legal Defense",
    path: "/legal-defense",
    tagline: "Build the defense record before details disappear.",
    description: "Arrest reconstruction, evidence mapping, discovery organization, chronology, and counsel-ready defense packets.",
    category: "legal",
    categoryLabel: "Legal Defense",
    status: "beta",
    executionState: "executable",
    icon: "ShieldCheck",
    primaryCTA: "Start a Defense File",
    enabled: true,
    capabilities: { requiresAI: false, requiresDocuments: true, supportsDrafting: true, supportsEvidence: true, supportsMailing: false },
  },
  {
    id: "notice-respond",
    name: "Notice Respond",
    shortName: "Notice Respond",
    path: "/notice-respond",
    tagline: "Respond to notices before deadlines.",
    description: "Official notices, agency actions, deadlines, supporting documents, formal responses, and mailing.",
    category: "government",
    categoryLabel: "Government / Official",
    status: "live",
    executionState: "executable",
    icon: "Clock",
    primaryCTA: "Start a Response",
    enabled: true,
    capabilities: { requiresAI: true, requiresDocuments: true, supportsDrafting: true, supportsEvidence: true, supportsMailing: true },
  },
  {
    id: "permit-reply",
    name: "Permit Reply",
    shortName: "Permit Reply",
    path: "/permit-reply",
    tagline: "Respond to permit and regulatory notices.",
    description: "Permit, licensing, inspection, correction, and regulatory response workflows.",
    category: "government",
    categoryLabel: "Regulatory / Permit / Rights",
    status: "live",
    executionState: "domain-ready",
    icon: "FileText",
    primaryCTA: "Start a Response",
    enabled: true,
    capabilities: { requiresAI: true, requiresDocuments: true, supportsDrafting: true, supportsEvidence: true, supportsMailing: true },
  },
  {
    id: "private-office",
    name: "Private Office",
    shortName: "Private Office",
    path: "/private-office",
    tagline: "Professional correspondence, provably delivered.",
    description: "Controlled high-stakes correspondence, evidence, approvals, document records, and certified mailing.",
    category: "professional",
    categoryLabel: "Private Office",
    status: "live",
    executionState: "catalog",
    icon: "Briefcase",
    primaryCTA: "Start a Matter",
    enabled: true,
    capabilities: { requiresAI: true, requiresDocuments: true, supportsDrafting: true, supportsEvidence: true, supportsMailing: true },
  },
  {
    id: "records-request",
    name: "Records Requests",
    shortName: "Records Requests",
    path: "/records-request",
    tagline: "Request public records with a documented process.",
    description: "FOIA, public-records, agency-record, police-record, and evidence-preservation request workflows.",
    category: "government",
    categoryLabel: "Records / Information",
    status: "live",
    executionState: "executable",
    icon: "FolderOpen",
    primaryCTA: "Start a Request",
    enabled: true,
    capabilities: { requiresAI: true, requiresDocuments: false, supportsDrafting: true, supportsEvidence: false, supportsMailing: true },
  },
  {
    id: "secured-transactions",
    name: "Secured Transactions",
    shortName: "Secured Transactions",
    path: "/secured-transactions",
    tagline: "Build the transaction record before taking the next step.",
    description: "Identity, capacity, obligations, collateral, evidence, authority, jurisdiction, and transaction records.",
    category: "business",
    categoryLabel: "Commercial / Transactions",
    status: "planned",
    executionState: "domain-ready",
    icon: "FileKey",
    primaryCTA: "Start a Matter",
    enabled: true,
    capabilities: { requiresAI: false, requiresDocuments: true, supportsDrafting: true, supportsEvidence: true, supportsMailing: false },
  },
  {
    id: "small-business",
    name: "Small Business",
    shortName: "Small Business",
    path: "/small-business",
    tagline: "Business correspondence, sent on time.",
    description: "Business correspondence, reminders, demands, renewals, compliance, approvals, tracking, and proof.",
    category: "business",
    categoryLabel: "Business",
    status: "planned",
    executionState: "catalog",
    icon: "Building2",
    primaryCTA: "Start a Mailing",
    enabled: true,
    capabilities: { requiresAI: false, requiresDocuments: true, supportsDrafting: true, supportsEvidence: false, supportsMailing: true },
  },
  {
    id: "tenant-reply",
    name: "Tenant Reply",
    shortName: "Tenant Reply",
    path: "/tenant-reply",
    tagline: "Respond to housing issues in writing.",
    description: "Tenant notices, repairs, deposits, landlord correspondence, evidence, and documented housing responses.",
    category: "housing",
    categoryLabel: "Housing",
    status: "live",
    executionState: "catalog",
    icon: "Home",
    primaryCTA: "Start a Reply",
    enabled: true,
    capabilities: { requiresAI: true, requiresDocuments: false, supportsDrafting: true, supportsEvidence: true, supportsMailing: true },
  },
] as const satisfies readonly SectionDefinition[];

export type SectionId = (typeof SECTION_REGISTRY)[number]["id"];

export const SECTION_IDS = SECTION_REGISTRY.map((section) => section.id) as SectionId[];

export const LEGACY_SECTION_ALIASES: Readonly<Record<string, SectionId>> = {
  "appeal-reply": "appeal-mail",
  "notice-response": "notice-respond",
  "debt-defense": "dispute-mail",
  "small-business-mail": "small-business",
};

export function getSectionById(id: string) {
  return SECTION_REGISTRY.find((section) => section.id === id);
}

export function getSectionByPath(path: string) {
  return SECTION_REGISTRY.find((section) => section.path === path);
}

export function resolveSectionId(idOrLegacyAlias: string): SectionId | undefined {
  const direct = getSectionById(idOrLegacyAlias);
  return direct?.id ?? LEGACY_SECTION_ALIASES[idOrLegacyAlias];
}

export function getNavigationSections() {
  return SECTION_REGISTRY.filter((section) => section.enabled);
}
