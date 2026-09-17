export type AuthorityRuleType =
  | "deadline"
  | "required_form"
  | "recipient"
  | "procedure"
  | "document_requirement"
  | "submission_method"
  | "other";

export type AuthorityJurisdiction = {
  country: string;
  state?: string;
  county?: string;
  city?: string;
};

export type AuthoritySource = {
  id: string;
  title: string;
  issuer: string;
  url: string;
  revision?: string;
  retrievedAt: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  sha256?: string;
};

export type AuthoritativeRule<Value = unknown> = {
  id: string;
  type: AuthorityRuleType;
  workflowIds: readonly string[];
  jurisdiction: AuthorityJurisdiction;
  source: AuthoritySource;
  value: Value;
  notes?: readonly string[];
};

export type AuthorityRuleQuery = {
  workflowId: string;
  type?: AuthorityRuleType;
  jurisdiction: AuthorityJurisdiction;
  onDate?: string;
};

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function jurisdictionMatches(rule: AuthorityJurisdiction, actual: AuthorityJurisdiction): boolean {
  if (normalize(rule.country) !== normalize(actual.country)) return false;
  if (rule.state && normalize(rule.state) !== normalize(actual.state)) return false;
  if (rule.county && normalize(rule.county) !== normalize(actual.county)) return false;
  if (rule.city && normalize(rule.city) !== normalize(actual.city)) return false;
  return true;
}

function effective(source: AuthoritySource, dateIso: string): boolean {
  const date = new Date(dateIso).getTime();
  if (!Number.isFinite(date)) throw new Error(`Invalid authority query date: ${dateIso}`);
  if (source.effectiveFrom && date < new Date(source.effectiveFrom).getTime()) return false;
  if (source.effectiveTo && date > new Date(source.effectiveTo).getTime()) return false;
  return true;
}

export function createAuthorityRegistry<const Rules extends readonly AuthoritativeRule[]>(rules: Rules): Rules {
  const ids = new Set<string>();
  for (const rule of rules) {
    if (!rule.id.trim()) throw new Error("Authority rules require a stable id.");
    if (ids.has(rule.id)) throw new Error(`Duplicate authority rule id: ${rule.id}`);
    ids.add(rule.id);
    if (!rule.workflowIds.length) throw new Error(`Authority rule ${rule.id} must name at least one workflow.`);
    const source = rule.source;
    if (!source.id.trim() || !source.title.trim() || !source.issuer.trim() || !source.url.trim() || !source.retrievedAt.trim()) {
      throw new Error(`Authority rule ${rule.id} requires complete source metadata.`);
    }
    if (source.sha256 && !/^[a-f0-9]{64}$/i.test(source.sha256)) {
      throw new Error(`Authority source ${source.id} has an invalid SHA-256 value.`);
    }
  }
  return Object.freeze(rules.map((rule) => Object.freeze({ ...rule }))) as unknown as Rules;
}

export function resolveAuthorityRules<Value = unknown>(
  registry: readonly AuthoritativeRule<Value>[],
  query: AuthorityRuleQuery,
): AuthoritativeRule<Value>[] {
  if (!query.workflowId.trim()) throw new Error("Authority rule resolution requires workflowId.");
  const onDate = query.onDate ?? new Date().toISOString();
  return registry.filter((rule) =>
    rule.workflowIds.includes(query.workflowId) &&
    (!query.type || rule.type === query.type) &&
    jurisdictionMatches(rule.jurisdiction, query.jurisdiction) &&
    effective(rule.source, onDate),
  );
}

export function requireSingleAuthorityRule<Value = unknown>(
  registry: readonly AuthoritativeRule<Value>[],
  query: AuthorityRuleQuery,
): AuthoritativeRule<Value> {
  const matches = resolveAuthorityRules(registry, query);
  if (matches.length === 0) throw new Error(`No current authority rule matched workflow ${query.workflowId}.`);
  if (matches.length > 1) throw new Error(`Authority rule is ambiguous for workflow ${query.workflowId}; ${matches.length} rules matched.`);
  return matches[0]!;
}
