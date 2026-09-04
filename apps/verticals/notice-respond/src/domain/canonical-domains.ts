/* ═══════════════════════════════════════════════════════════
   CANONICAL DOMAINS — the authoritative source of truth for
   every vertical/domain in the MailMyPDF ecosystem.

   A workflow's OWNER is determined by the user's underlying
   problem/domain — NOT by which engine happens to execute it.

   The engine does NOT determine the domain.
   CP2000 → notice-respond (document-action engine)
   TransUnion dispute → dispute-mail (dispute engine)
   Both use document analysis, but ownership is different.

   ═══════════════════════════════════════════════════════════ */

import type { WorkflowEngine } from "./workflow-definition";

// ── Canonical Domain Definition ──────────────────────────────

export interface CanonicalDomain {
  /** The vertical identifier used in the registry */
  id: string;
  /** Human-readable name */
  name: string;
  /** The GitHub repository that owns this domain's workflows */
  canonicalRepo: string;
  /** Description of what this domain covers */
  description: string;
  /** Engines primarily used by this domain */
  primaryEngines: WorkflowEngine[];
  /** Rule: what kinds of workflows belong here */
  ownershipRule: string;
  /** Whether this domain has a live repo */
  repoExists: boolean;
  /** Status of the domain */
  status: "active" | "planned" | "research";
}

// ── Canonical Domain Registry ────────────────────────────────
//
// Every domain that exists or is planned in the ecosystem.
// Do NOT add domains here unless the repo exists or is
// explicitly planned with a documented rationale.
//

export const CANONICAL_DOMAINS: Record<string, CanonicalDomain> = {
  "notice-respond": {
    id: "notice-respond",
    name: "Notice Respond",
    canonicalRepo: "notice-respond",
    description:
      "Respond to notices, orders, demands, correspondence, or administrative actions received from government agencies, courts, municipalities, or other authorities.",
    primaryEngines: ["document-action", "jurisdictional"],
    ownershipRule:
      "Government/agency notice → analyze → determine response → draft → validate → mail. Includes IRS notices, court summons, DMV notices, SSA notices, agency actions.",
    repoExists: true,
    status: "active",
  },
  "dispute-mail": {
    id: "dispute-mail",
    name: "Dispute Mail",
    canonicalRepo: "dispute-mail",
    description:
      "Challenge inaccurate information, debts, charges, records, transactions, or claims.",
    primaryEngines: ["dispute"],
    ownershipRule:
      "Consumer identifies inaccurate information → dispute → evidence → contradiction → response. Includes credit bureau disputes, collection disputes, debt disputes, billing disputes.",
    repoExists: true,
    status: "active",
  },
  "appeal-mail": {
    id: "appeal-mail",
    name: "Appeal Mail",
    canonicalRepo: "appeal-mail",
    description:
      "Challenge an adverse decision after a decision/denial has already been issued.",
    primaryEngines: ["appeal"],
    ownershipRule:
      "Decision/denial → reason → standard → evidence → deficiencies → appeal strategy → draft. Includes insurance appeals, SSDI/SSI appeals, unemployment appeals, Medicaid appeals, financial aid appeals, academic appeals.",
    repoExists: true,
    status: "planned",
  },
  "immigration-mail": {
    id: "immigration-mail",
    name: "Immigration Mail",
    canonicalRepo: "immigration-mail",
    description:
      "USCIS and immigration-specific correspondence and evidence workflows.",
    primaryEngines: ["document-action"],
    ownershipRule:
      "USCIS/immigration correspondence → analyze → evidence → response. Includes I-797, I-797C, RFE, NOID, biometrics, interview notices, evidence submissions.",
    repoExists: true,
    status: "planned",
  },
  "debt-defense": {
    id: "debt-defense",
    name: "Debt Defense",
    canonicalRepo: "debt-defense",
    description:
      "Handle the broader debt-collection lifecycle, especially escalation and defense.",
    primaryEngines: ["dispute"],
    ownershipRule:
      "Debt collection lifecycle → validation → defense → response. Includes debt validation, collection defense, collection lawsuit response, FDCPA correspondence, cease-contact.",
    repoExists: true,
    status: "planned",
  },
  "records-requests": {
    id: "records-requests",
    name: "Records Requests",
    canonicalRepo: "records-requests",
    description:
      "Obtain records, documents, communications, reports, or public information.",
    primaryEngines: ["records"],
    ownershipRule:
      "Record sought → jurisdiction → custodian → eligibility → request → deadline → submission. Includes FOIA, public records, police records, court records, property records, permit records.",
    repoExists: true,
    status: "planned",
  },
  "insurance-claims": {
    id: "insurance-claims",
    name: "Insurance Claims",
    canonicalRepo: "insurance-claims",
    description:
      "Insurance claim-specific workflows including denials, underpayments, and documentation.",
    primaryEngines: ["appeal", "document-action"],
    ownershipRule:
      "Insurance claim → denial/underpayment → documentation → reconsideration. Includes denied claims, underpayment, RFI, reconsideration, property/auto/workers comp/life claims.",
    repoExists: true,
    status: "planned",
  },
  "tenant-reply": {
    id: "tenant-reply",
    name: "Tenant Reply",
    canonicalRepo: "tenant-reply",
    description:
      "Tenant-side responses and correspondence involving landlords/property managers.",
    primaryEngines: ["jurisdictional"],
    ownershipRule:
      "Landlord/property manager action → tenant response. Includes eviction notice response, pay-or-quit, cure-or-quit, lease violation, repair request, habitability complaint, security deposit dispute.",
    repoExists: true,
    status: "planned",
  },
  "code-enforcement": {
    id: "code-enforcement",
    name: "Code Enforcement",
    canonicalRepo: "code-enforcement",
    description:
      "Respond to property/code enforcement authorities.",
    primaryEngines: ["jurisdictional"],
    ownershipRule:
      "Code violation → compliance plan → response → hearing. Includes code violations, property maintenance, zoning violations, nuisance property, unpermitted construction, occupancy violations.",
    repoExists: true,
    status: "planned",
  },
  "permit-response": {
    id: "permit-response",
    name: "Permit Response",
    canonicalRepo: "permit-response",
    description:
      "Respond to building/planning/zoning/permit authorities.",
    primaryEngines: ["jurisdictional"],
    ownershipRule:
      "Permit authority action → correction/reconsideration. Includes permit correction, plan review comments, failed inspection, zoning notice, planning comments, permit denial.",
    repoExists: true,
    status: "planned",
  },
  "benefits-appeal": {
    id: "benefits-appeal",
    name: "Benefits Appeal",
    canonicalRepo: "benefits-appeal",
    description:
      "Government benefits appeal workflows (SSDI, SSI, unemployment, Medicaid).",
    primaryEngines: ["appeal"],
    ownershipRule:
      "Benefits denial → appeal → evidence → hearing. Overlaps with appeal-mail for government benefit programs. Separate repo exists; determine whether to merge into appeal-mail based on technical reuse and SEO architecture.",
    repoExists: true,
    status: "research",
  },
};

// ── Domain Validation ─────────────────────────────────────────

export interface DomainValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface WorkflowOwnershipEntry {
  id: string;
  vertical: string;
  repo: string;
  engine: string;
}

/**
 * Validate that a single workflow's domain ownership is correct.
 *
 * Checks:
 * 1. The vertical exists in CANONICAL_DOMAINS
 * 2. The repo exists in CANONICAL_DOMAINS (as a canonicalRepo)
 * 3. The repo matches the canonical repo for the vertical
 * 4. The engine is compatible with the domain's primary engines (warning)
 */
export function validateDomainOwnership(
  entry: WorkflowOwnershipEntry
): DomainValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check vertical exists
  const domain = CANONICAL_DOMAINS[entry.vertical];
  if (!domain) {
    errors.push(
      `Unknown vertical "${entry.vertical}" for workflow "${entry.id}". ` +
        `Known domains: ${Object.keys(CANONICAL_DOMAINS).join(", ")}`
    );
    return { valid: false, errors, warnings };
  }

  // 2. Check repo is a known canonical repo
  const knownRepos = new Set(
    Object.values(CANONICAL_DOMAINS).map((d) => d.canonicalRepo)
  );
  if (!knownRepos.has(entry.repo)) {
    errors.push(
      `Unknown repo "${entry.repo}" for workflow "${entry.id}". ` +
        `Known repos: ${Array.from(knownRepos).join(", ")}`
    );
  }

  // 3. Check repo matches canonical repo for the vertical
  if (domain.canonicalRepo !== entry.repo) {
    errors.push(
      `Repo mismatch for workflow "${entry.id}": ` +
        `vertical "${entry.vertical}" requires repo "${domain.canonicalRepo}" ` +
        `but has repo "${entry.repo}"`
    );
  }

  // 4. Warn if engine is not in the domain's primary engines
  if (!domain.primaryEngines.includes(entry.engine as WorkflowEngine)) {
    warnings.push(
      `Engine "${entry.engine}" is not a primary engine for domain "${entry.vertical}". ` +
        `Primary engines: ${domain.primaryEngines.join(", ")}`
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate all entries in the master registry for domain ownership.
 *
 * Checks:
 * - Every entry's vertical/repo combination is valid
 * - No duplicate workflow IDs
 * - No cross-domain contamination (e.g., credit disputes in notice-respond)
 */
export interface RegistryValidationResult {
  allValid: boolean;
  totalEntries: number;
  validCount: number;
  invalidCount: number;
  duplicateIds: string[];
  errors: string[];
  warnings: string[];
  perEntry: { id: string; valid: boolean; errors: string[]; warnings: string[] }[];
}

export function validateRegistryOwnership(
  entries: WorkflowOwnershipEntry[]
): RegistryValidationResult {
  const perEntry = entries.map((entry) => {
    const result = validateDomainOwnership(entry);
    return {
      id: entry.id,
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
    };
  });

  // Check for duplicate IDs
  const idCounts = new Map<string, number>();
  for (const entry of entries) {
    idCounts.set(entry.id, (idCounts.get(entry.id) || 0) + 1);
  }
  const duplicateIds = Array.from(idCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([id, _]) => id);

  // Check for cross-domain contamination:
  // A workflow should not be registered under a domain it doesn't belong to.
  const contaminationErrors: string[] = [];
  for (const entry of entries) {
    // Credit bureau disputes must never be notice-respond
    if (
      (entry.id.includes("equifax") ||
        entry.id.includes("experian") ||
        entry.id.includes("transunion")) &&
      entry.vertical === "notice-respond"
    ) {
      contaminationErrors.push(
        `Cross-domain contamination: "${entry.id}" is registered as vertical "notice-respond" but credit bureau disputes belong in "dispute-mail"`
      );
    }
    // FOIA/records must never be notice-respond
    if (
      (entry.id.includes("foia") || entry.id.includes("records-request")) &&
      entry.vertical === "notice-respond"
    ) {
      contaminationErrors.push(
        `Cross-domain contamination: "${entry.id}" is registered as vertical "notice-respond" but records requests belong in "records-requests"`
      );
    }
    // IRS notices must never be dispute-mail
    if (
      (entry.id.includes("cp14") ||
        entry.id.includes("cp2000") ||
        entry.id.includes("cp504")) &&
      entry.vertical === "dispute-mail"
    ) {
      contaminationErrors.push(
        `Cross-domain contamination: "${entry.id}" is registered as vertical "dispute-mail" but IRS notices belong in "notice-respond"`
      );
    }
    // Insurance claims must never be notice-respond
    if (
      entry.id.includes("insurance") &&
      entry.vertical === "notice-respond"
    ) {
      contaminationErrors.push(
        `Cross-domain contamination: "${entry.id}" is registered as vertical "notice-respond" but insurance claims belong in "insurance-claims" or "appeal-mail"`
      );
    }
  }

  const allErrors = [
    ...perEntry.flatMap((e) => e.errors.map((err) => `${e.id}: ${err}`)),
    ...duplicateIds.map((id) => `Duplicate workflow ID: "${id}"`),
    ...contaminationErrors,
  ];

  const allWarnings = perEntry.flatMap((e) =>
    e.warnings.map((w) => `${e.id}: ${w}`)
  );

  return {
    allValid: allErrors.length === 0,
    totalEntries: entries.length,
    validCount: perEntry.filter((e) => e.valid).length,
    invalidCount: perEntry.filter((e) => !e.valid).length,
    duplicateIds,
    errors: allErrors,
    warnings: allWarnings,
    perEntry,
  };
}

/**
 * Get the canonical domain for a given vertical ID.
 */
export function getDomain(verticalId: string): CanonicalDomain | undefined {
  return CANONICAL_DOMAINS[verticalId];
}

/**
 * Get the canonical repo for a given vertical ID.
 */
export function getCanonicalRepo(verticalId: string): string | undefined {
  return CANONICAL_DOMAINS[verticalId]?.canonicalRepo;
}

/**
 * Check if a vertical/repo combination is valid.
 */
export function isValidOwnership(vertical: string, repo: string): boolean {
  const domain = CANONICAL_DOMAINS[vertical];
  if (!domain) return false;
  return domain.canonicalRepo === repo;
}

/**
 * List all known domains.
 */
export function listDomains(): CanonicalDomain[] {
  return Object.values(CANONICAL_DOMAINS);
}
