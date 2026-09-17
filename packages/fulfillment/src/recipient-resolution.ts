import type { PostalAddress } from "./index";

export type SubmissionMethod = "postal_mail" | "fax" | "portal" | "email" | "in_person";

export type Jurisdiction = {
  country: string;
  state?: string;
  county?: string;
  city?: string;
};

export type RecipientAuthoritySource = {
  authority: string;
  url: string;
  revision?: string;
  effectiveDate?: string;
  retrievedAt?: string;
};

export type RecipientDestination = {
  id: string;
  agency: string;
  office?: string;
  workflowIds: readonly string[];
  jurisdiction: Jurisdiction;
  methods: readonly SubmissionMethod[];
  postalAddress?: PostalAddress;
  source: RecipientAuthoritySource;
  effectiveFrom?: string;
  effectiveTo?: string;
};

export type RecipientResolutionInput = {
  workflowId: string;
  jurisdiction: Jurisdiction;
  method: SubmissionMethod;
  agency?: string;
  onDate?: string;
};

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function jurisdictionMatches(rule: Jurisdiction, actual: Jurisdiction): boolean {
  if (normalize(rule.country) !== normalize(actual.country)) return false;
  if (rule.state && normalize(rule.state) !== normalize(actual.state)) return false;
  if (rule.county && normalize(rule.county) !== normalize(actual.county)) return false;
  if (rule.city && normalize(rule.city) !== normalize(actual.city)) return false;
  return true;
}

function isEffective(destination: RecipientDestination, onDate: string): boolean {
  const date = new Date(onDate).getTime();
  if (!Number.isFinite(date)) throw new Error(`Invalid recipient resolution date: ${onDate}`);
  if (destination.effectiveFrom && date < new Date(destination.effectiveFrom).getTime()) return false;
  if (destination.effectiveTo && date > new Date(destination.effectiveTo).getTime()) return false;
  return true;
}

export function createRecipientDirectory<const Entries extends readonly RecipientDestination[]>(entries: Entries): Entries {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (!entry.id.trim() || !entry.agency.trim()) throw new Error("Recipient destinations require id and agency.");
    if (ids.has(entry.id)) throw new Error(`Duplicate recipient destination id: ${entry.id}`);
    ids.add(entry.id);
    if (!entry.workflowIds.length) throw new Error(`Recipient destination ${entry.id} must name at least one workflow.`);
    if (!entry.methods.length) throw new Error(`Recipient destination ${entry.id} must name at least one submission method.`);
    if (!entry.source.authority.trim() || !entry.source.url.trim()) {
      throw new Error(`Recipient destination ${entry.id} requires an authoritative source and URL.`);
    }
    if (entry.methods.includes("postal_mail") && !entry.postalAddress) {
      throw new Error(`Recipient destination ${entry.id} supports postal mail but has no postal address.`);
    }
  }
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry }))) as unknown as Entries;
}

export function resolveRecipientDestination(
  directory: readonly RecipientDestination[],
  input: RecipientResolutionInput,
): RecipientDestination {
  if (!input.workflowId.trim()) throw new Error("Recipient resolution requires workflowId.");
  const onDate = input.onDate ?? new Date().toISOString();
  const matches = directory.filter((entry) =>
    entry.workflowIds.includes(input.workflowId) &&
    entry.methods.includes(input.method) &&
    jurisdictionMatches(entry.jurisdiction, input.jurisdiction) &&
    (!input.agency || normalize(entry.agency) === normalize(input.agency)) &&
    isEffective(entry, onDate),
  );

  if (matches.length === 0) {
    throw new Error(`No authoritative recipient destination matched workflow ${input.workflowId}.`);
  }
  if (matches.length > 1) {
    throw new Error(`Recipient destination is ambiguous for workflow ${input.workflowId}; ${matches.length} authoritative rules matched.`);
  }
  return matches[0]!;
}
