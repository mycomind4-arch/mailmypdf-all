import type {
  WorkflowPublicationState,
  WorkflowSeoAuthorityContent,
  WorkflowSeoCatalogEntry,
} from "./workflow-seo-catalog";

export const AUTHORITY_GATE_MIN_SCORE = 85;
export const AUTHORITY_GATE_SIMILARITY_LIMIT = 0.72;

export type AuthorityScoreDimension =
  | "searchIntent"
  | "workflowSpecificity"
  | "sourceGrounding"
  | "evidenceGuidance"
  | "processUsefulness"
  | "faqCoverage"
  | "internalLinks"
  | "contentUniqueness"
  | "safetyTruthfulness"
  | "conversionUsefulness";

export type AuthorityGateIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
};

export type AuthorityGateResult = {
  id: string;
  state: WorkflowPublicationState;
  score: number;
  minimumScore: number;
  dimensions: Record<AuthorityScoreDimension, number>;
  issues: AuthorityGateIssue[];
  eligibleForIndexing: boolean;
  buildBlocking: boolean;
  substantiveWordCount: number;
};

export type AuthorityCatalogReport = {
  results: AuthorityGateResult[];
  counts: {
    total: number;
    draft: number;
    seoReady: number;
    executable: number;
    indexable: number;
    blocked: number;
  };
};

const AUTHORITATIVE_SOURCE_KINDS = new Set(["official", "primary", "regulator"]);

const GENERIC_PHRASES = [
  "gather relevant documents",
  "gather supporting evidence",
  "provide supporting documentation",
  "review your documents carefully",
  "follow the instructions provided",
  "respond in a timely manner",
  "submit the required information",
  "keep copies for your records",
  "consult a professional if needed",
];

const PROHIBITED_CLAIMS = [
  /\bbank[- ]grade\b/i,
  /\bbank[- ]level\b/i,
  /\bguaranteed (?:approval|success|outcome|result|win)\b/i,
  /\bwe guarantee\b/i,
  /\bwill (?:definitely |certainly )?(?:win|succeed|be approved)\b/i,
  /\b100% success\b/i,
];

function clampScore(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value)));
}

function words(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function wordCount(value: string): number {
  return words(value).length;
}

function contentText(content: WorkflowSeoAuthorityContent): string {
  return [
    content.primaryIntent,
    content.overview,
    content.issuerContext,
    ...content.documentIdentification,
    ...content.whenToUse,
    ...content.whenNotToUse,
    ...content.inspectOnDocument,
    ...content.timingGuidance,
    ...content.informationChecklist,
    ...content.evidenceChecklist,
    ...content.processSteps.flatMap((step) => [step.title, step.guidance]),
    ...content.issuesChecked,
    ...content.commonMistakes,
    ...content.scenarios.flatMap((scenario) => [scenario.title, scenario.situation, scenario.responsePath]),
    ...content.responsePaths,
    ...content.packetContents,
    ...content.submissionGuidance,
    ...content.practicalChecklist,
    ...content.templatesAndTools,
    ...content.faqs.flatMap((faq) => [faq.question, faq.answer]),
    ...content.glossary.flatMap((item) => [item.term, item.definition]),
  ].join(" ");
}

function hasValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime());
}

function daysSince(value: string): number | null {
  if (!hasValidIsoDate(value)) return null;
  const then = new Date(`${value}T00:00:00Z`).getTime();
  return Math.floor((Date.now() - then) / 86_400_000);
}

function avgWords(items: readonly string[]): number {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + wordCount(item), 0) / items.length;
}

function uniqueNormalized(items: readonly string[]): boolean {
  const normalized = items.map((item) => item.toLowerCase().replace(/\s+/g, " ").trim());
  return new Set(normalized).size === normalized.length;
}

function countGenericPhrases(text: string): number {
  const normalized = text.toLowerCase();
  return GENERIC_PHRASES.filter((phrase) => normalized.includes(phrase)).length;
}

function prohibitedClaims(text: string): string[] {
  return PROHIBITED_CLAIMS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

function baseDimensions(content: WorkflowSeoAuthorityContent, state: WorkflowPublicationState): Record<AuthorityScoreDimension, number> {
  const searchChecks = [
    wordCount(content.primaryKeyword) >= 2,
    wordCount(content.primaryIntent) >= 16,
    content.secondaryKeywords.length >= 3,
    content.seoTitle.length >= 35 && content.seoTitle.length <= 72,
    content.h1.length >= 24 && content.h1.length <= 100,
    content.metaDescription.length >= 120 && content.metaDescription.length <= 180,
  ];

  const specificityChecks = [
    wordCount(content.overview) >= 75,
    wordCount(content.issuerContext) >= 35,
    content.documentIdentification.length >= 3,
    content.inspectOnDocument.length >= 4,
    content.issuesChecked.length >= 4,
    content.commonMistakes.length >= 5,
    content.scenarios.length >= 3,
  ];

  const authoritativeSources = content.sources.filter((source) => AUTHORITATIVE_SOURCE_KINDS.has(source.kind));
  const sourceChecks = [
    content.sources.length >= 2,
    authoritativeSources.length >= 1,
    content.sources.every((source) => /^https:\/\//.test(source.url)),
    content.sources.every((source) => hasValidIsoDate(source.reviewedAt)),
    hasValidIsoDate(content.reviewedAt),
  ];

  const evidenceChecks = [
    content.informationChecklist.length >= 5,
    content.evidenceChecklist.length >= 5,
    content.practicalChecklist.length >= 5,
    avgWords(content.evidenceChecklist) >= 7,
    avgWords(content.inspectOnDocument) >= 7,
  ];

  const processChecks = [
    content.processSteps.length >= 5,
    content.processSteps.every((step) => wordCount(step.guidance) >= 14),
    content.timingGuidance.length >= 2 && avgWords(content.timingGuidance) >= 14,
    content.responsePaths.length >= 3,
    content.packetContents.length >= 4,
    content.submissionGuidance.length >= 2 && avgWords(content.submissionGuidance) >= 12,
  ];

  const faqChecks = [
    content.faqs.length >= 5,
    content.faqs.every((faq) => faq.question.trim().endsWith("?")),
    content.faqs.every((faq) => wordCount(faq.answer) >= 18),
    uniqueNormalized(content.faqs.map((faq) => faq.question)),
  ];

  const safetyText = `${contentText(content)} ${content.disclaimer}`;
  const safetyChecks = [
    prohibitedClaims(safetyText).length === 0,
    wordCount(content.disclaimer) >= 20,
    !/\bguarantee(?:s|d)?\b/i.test(content.overview),
    content.whenNotToUse.length >= 3,
  ];

  const conversionChecks = [
    content.packetContents.length >= 4,
    content.submissionGuidance.length >= 2,
    content.templatesAndTools.length >= 2,
    state !== "EXECUTABLE" || content.responsePaths.length >= 3,
  ];

  const ratio = (checks: readonly boolean[]) => clampScore((checks.filter(Boolean).length / checks.length) * 10);

  return {
    searchIntent: ratio(searchChecks),
    workflowSpecificity: ratio(specificityChecks),
    sourceGrounding: ratio(sourceChecks),
    evidenceGuidance: ratio(evidenceChecks),
    processUsefulness: ratio(processChecks),
    faqCoverage: ratio(faqChecks),
    internalLinks: clampScore((Math.min(content.relatedWorkflowIds.length, 4) / 4) * 10),
    contentUniqueness: 10,
    safetyTruthfulness: ratio(safetyChecks),
    conversionUsefulness: ratio(conversionChecks),
  };
}

function issue(issues: AuthorityGateIssue[], code: string, message: string, severity: "error" | "warning" = "error") {
  issues.push({ code, message, severity });
}

function validateRequiredContent(entry: WorkflowSeoCatalogEntry, issues: AuthorityGateIssue[]): WorkflowSeoAuthorityContent | null {
  if (!entry.content) {
    if (entry.state !== "DRAFT") {
      issue(issues, "CONTENT_REQUIRED", `${entry.state} requires the complete workflow authority content contract.`);
    }
    return null;
  }

  const content = entry.content;
  if (wordCount(content.overview) < 75) issue(issues, "OVERVIEW_THIN", "Overview must contain workflow-specific explanatory substance, not a short introduction.");
  if (wordCount(content.issuerContext) < 35) issue(issues, "ISSUER_CONTEXT_THIN", "Issuer/agency/context explanation is too thin.");
  if (content.documentIdentification.length < 3) issue(issues, "DOCUMENT_IDENTIFICATION_THIN", "Identify at least three document/form/notice markers or variants where applicable.");
  if (content.whenToUse.length < 3 || content.whenNotToUse.length < 3) issue(issues, "USE_BOUNDARY_THIN", "Both use and do-not-use boundaries need at least three workflow-specific items.");
  if (content.inspectOnDocument.length < 4) issue(issues, "INSPECTION_GUIDANCE_THIN", "Explain at least four workflow-specific things to inspect on the controlling document.");
  if (content.informationChecklist.length < 5) issue(issues, "INFORMATION_CHECKLIST_THIN", "Information checklist needs at least five specific items.");
  if (content.evidenceChecklist.length < 5 || avgWords(content.evidenceChecklist) < 7) issue(issues, "EVIDENCE_GUIDANCE_THIN", "Evidence guidance must identify specific evidence and explain what matters.");
  if (content.processSteps.length < 5 || content.processSteps.some((step) => wordCount(step.guidance) < 14)) issue(issues, "PROCESS_THIN", "Provide at least five substantive, workflow-specific process steps.");
  if (content.commonMistakes.length < 5) issue(issues, "MISTAKES_THIN", "Provide at least five workflow-specific mistakes or failure modes.");
  if (content.scenarios.length < 3 || content.scenarios.some((scenario) => wordCount(`${scenario.situation} ${scenario.responsePath}`) < 28)) issue(issues, "SCENARIOS_THIN", "Provide at least three realistic scenarios with meaningful situation and response-path detail.");
  if (content.responsePaths.length < 3) issue(issues, "RESPONSE_PATHS_THIN", "Explain at least three possible response paths or outcomes.");
  if (content.packetContents.length < 4) issue(issues, "PACKET_CONTENTS_THIN", "Explain what a complete output/packet generally contains.");
  if (content.submissionGuidance.length < 2 || avgWords(content.submissionGuidance) < 12) issue(issues, "SUBMISSION_GUIDANCE_THIN", "Mailing/filing/submission guidance needs workflow-specific substance.");
  if (content.faqs.length < 5 || content.faqs.some((faq) => wordCount(faq.answer) < 18)) issue(issues, "FAQ_THIN", "SEO-ready pages require at least five substantial question-and-answer pairs.");
  if (content.sources.length < 2) issue(issues, "SOURCES_THIN", "SEO-ready pages require at least two authoritative or high-quality sources.");
  if (!content.sources.some((source) => AUTHORITATIVE_SOURCE_KINDS.has(source.kind))) issue(issues, "OFFICIAL_SOURCE_REQUIRED", "At least one source must be official, primary, or a regulator source.");
  if (!content.sources.every((source) => /^https:\/\//.test(source.url))) issue(issues, "SOURCE_URL_INVALID", "Every authority source must use an HTTPS URL.");
  if (!content.sources.every((source) => hasValidIsoDate(source.reviewedAt)) || !hasValidIsoDate(content.reviewedAt)) issue(issues, "SOURCE_REVIEW_DATE_INVALID", "Sources and page review metadata require ISO YYYY-MM-DD review dates.");
  const pageAge = daysSince(content.reviewedAt);
  if (pageAge !== null && pageAge > 400) issue(issues, "SOURCE_REVIEW_STALE", "Authority content has not been reviewed in the last 400 days.");
  if (content.relatedWorkflowIds.length < 3) issue(issues, "RELATED_WORKFLOWS_THIN", "SEO-ready pages require at least three meaningful upstream/downstream related workflows.");

  const substantiveWords = wordCount(contentText(content));
  if (substantiveWords < 1200) issue(issues, "SUBSTANTIVE_CONTENT_THIN", `Only ${substantiveWords} substantive words were found across authority sections; the minimum floor is 1200.`);

  const genericHits = countGenericPhrases(contentText(content));
  if (genericHits >= 3) issue(issues, "GENERIC_CONTENT", "Multiple generic filler phrases were detected. Replace them with workflow-specific guidance.");
  else if (genericHits > 0) issue(issues, "GENERIC_CONTENT_WARNING", "Generic filler language was detected; verify that the surrounding guidance is workflow-specific.", "warning");

  const prohibited = prohibitedClaims(`${contentText(content)} ${content.disclaimer}`);
  if (prohibited.length) issue(issues, "PROHIBITED_CLAIM", "Unsupported guarantee/security/success language is not allowed on authority pages.");

  if (entry.state === "EXECUTABLE" && (!entry.execution?.verified || !entry.execution.href)) {
    issue(issues, "EXECUTION_NOT_VERIFIED", "EXECUTABLE requires an explicitly verified execution entry point.");
  }

  return content;
}

export function validateAuthorityRecord(entry: WorkflowSeoCatalogEntry): AuthorityGateResult {
  const issues: AuthorityGateIssue[] = [];
  const content = validateRequiredContent(entry, issues);
  const dimensions: Record<AuthorityScoreDimension, number> = content
    ? baseDimensions(content, entry.state)
    : {
        searchIntent: 0,
        workflowSpecificity: 0,
        sourceGrounding: 0,
        evidenceGuidance: 0,
        processUsefulness: 0,
        faqCoverage: 0,
        internalLinks: 0,
        contentUniqueness: 0,
        safetyTruthfulness: 0,
        conversionUsefulness: 0,
      };
  const score = Object.values(dimensions).reduce((sum, value) => sum + value, 0);
  const substantiveWordCount = content ? wordCount(contentText(content)) : 0;
  const errors = issues.filter((item) => item.severity === "error");
  const qualityPassed = Boolean(content) && score >= AUTHORITY_GATE_MIN_SCORE && errors.length === 0;

  return {
    id: entry.id,
    state: entry.state,
    score,
    minimumScore: AUTHORITY_GATE_MIN_SCORE,
    dimensions,
    issues,
    eligibleForIndexing: entry.state !== "DRAFT" && qualityPassed,
    buildBlocking: entry.state !== "DRAFT" && !qualityPassed,
    substantiveWordCount,
  };
}

function shingles(text: string, size = 5): Set<string> {
  const tokens = words(text);
  const result = new Set<string>();
  for (let index = 0; index <= tokens.length - size; index += 1) {
    result.add(tokens.slice(index, index + size).join(" "));
  }
  return result;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union ? intersection / union : 0;
}

function addCatalogIssue(result: AuthorityGateResult, code: string, message: string) {
  if (!result.issues.some((item) => item.code === code && item.message === message)) {
    result.issues.push({ code, message, severity: "error" });
  }
  result.dimensions.contentUniqueness = 0;
  result.score = Object.values(result.dimensions).reduce((sum, value) => sum + value, 0);
  if (result.state !== "DRAFT") {
    result.eligibleForIndexing = false;
    result.buildBlocking = true;
  }
}

export function validateAuthorityCatalog(
  entries: readonly WorkflowSeoCatalogEntry[],
  knownWorkflowIds: ReadonlySet<string> = new Set(entries.map((entry) => entry.id)),
): AuthorityCatalogReport {
  const results = entries.map((entry) => validateAuthorityRecord(entry));
  const byId = new Map(results.map((result) => [result.id, result]));
  const publishableEntries = entries.filter((entry) => entry.state !== "DRAFT" && entry.content);

  const uniqueFields: Array<[keyof Pick<WorkflowSeoAuthorityContent, "primaryKeyword" | "seoTitle" | "h1" | "metaDescription">, string]> = [
    ["primaryKeyword", "primary keyword"],
    ["seoTitle", "SEO title"],
    ["h1", "H1"],
    ["metaDescription", "meta description"],
  ];

  for (const [field, label] of uniqueFields) {
    const seen = new Map<string, string>();
    for (const entry of publishableEntries) {
      const value = entry.content?.[field].toLowerCase().replace(/\s+/g, " ").trim();
      if (!value) continue;
      const previous = seen.get(value);
      if (previous) {
        addCatalogIssue(byId.get(entry.id)!, "DUPLICATE_METADATA", `${label} duplicates ${previous}.`);
        addCatalogIssue(byId.get(previous)!, "DUPLICATE_METADATA", `${label} duplicates ${entry.id}.`);
      } else {
        seen.set(value, entry.id);
      }
    }
  }

  for (const entry of publishableEntries) {
    const result = byId.get(entry.id)!;
    for (const relatedId of entry.content?.relatedWorkflowIds ?? []) {
      if (!knownWorkflowIds.has(relatedId)) {
        addCatalogIssue(result, "UNKNOWN_RELATED_WORKFLOW", `Related workflow ${relatedId} is not present in the known SEO/spec catalog.`);
      }
    }
  }

  const shingleMap = new Map(
    publishableEntries.map((entry) => [entry.id, shingles(contentText(entry.content!))] as const),
  );
  for (let left = 0; left < publishableEntries.length; left += 1) {
    for (let right = left + 1; right < publishableEntries.length; right += 1) {
      const a = publishableEntries[left]!;
      const b = publishableEntries[right]!;
      const similarity = jaccard(shingleMap.get(a.id)!, shingleMap.get(b.id)!);
      if (similarity > AUTHORITY_GATE_SIMILARITY_LIMIT) {
        const percent = Math.round(similarity * 100);
        addCatalogIssue(byId.get(a.id)!, "CONTENT_TOO_SIMILAR", `Substantive content is ${percent}% similar to ${b.id}; shared layout is fine, shared domain prose is not.`);
        addCatalogIssue(byId.get(b.id)!, "CONTENT_TOO_SIMILAR", `Substantive content is ${percent}% similar to ${a.id}; shared layout is fine, shared domain prose is not.`);
      }
    }
  }

  for (const result of results) {
    if (result.state !== "DRAFT" && result.score < AUTHORITY_GATE_MIN_SCORE && !result.issues.some((item) => item.code === "QUALITY_SCORE")) {
      result.issues.push({
        code: "QUALITY_SCORE",
        message: `Authority score ${result.score}/100 is below the required ${AUTHORITY_GATE_MIN_SCORE}/100.`,
        severity: "error",
      });
      result.eligibleForIndexing = false;
      result.buildBlocking = true;
    }
  }

  return {
    results,
    counts: {
      total: results.length,
      draft: results.filter((result) => result.state === "DRAFT").length,
      seoReady: results.filter((result) => result.state === "SEO_READY").length,
      executable: results.filter((result) => result.state === "EXECUTABLE").length,
      indexable: results.filter((result) => result.eligibleForIndexing).length,
      blocked: results.filter((result) => result.buildBlocking).length,
    },
  };
}
