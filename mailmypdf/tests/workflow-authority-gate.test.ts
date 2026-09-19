import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTHORITY_GATE_MIN_SCORE,
  validateAuthorityCatalog,
  validateAuthorityRecord,
} from "../src/lib/workflow-authority-gate";
import type {
  WorkflowSeoAuthorityContent,
  WorkflowSeoCatalogEntry,
} from "../src/lib/workflow-seo-catalog";

const reviewedAt = "2026-09-01";

function detail(seed: string, subject: string, repetitions = 4): string {
  const sentences = Array.from({ length: repetitions }, (_, index) =>
    `${seed} ${subject} detail ${index + 1} identifies the controlling record, explains why the specific fact matters, connects that fact to the response decision, and tells the reader what should be verified before relying on it.`,
  );
  return sentences.join(" ");
}

function makeContent(seed: string): WorkflowSeoAuthorityContent {
  return {
    primaryKeyword: `${seed} response guide`,
    primaryIntent: detail(seed, "search intent", 2),
    secondaryKeywords: [
      `${seed} response documents`,
      `${seed} evidence checklist`,
      `${seed} response process`,
      `${seed} mailing proof`,
    ],
    seoTitle: `${seed} Response Guide: Documents, Evidence and Next Steps`,
    h1: `${seed} Response Guide for Documents, Evidence, and Next Steps`,
    metaDescription: `${seed} response guidance for identifying the controlling document, checking instructions and timing, organizing evidence, reviewing response paths, and preserving the final record.`,
    overview: detail(seed, "overview", 7),
    documentIdentification: [
      detail(seed, "document heading", 1),
      detail(seed, "reference number", 1),
      detail(seed, "issuer identity", 1),
      detail(seed, "response instruction block", 1),
    ],
    issuerContext: detail(seed, "issuer context", 3),
    whenToUse: [
      detail(seed, "use case one", 1),
      detail(seed, "use case two", 1),
      detail(seed, "use case three", 1),
    ],
    whenNotToUse: [
      detail(seed, "boundary one", 1),
      detail(seed, "boundary two", 1),
      detail(seed, "boundary three", 1),
    ],
    inspectOnDocument: [
      detail(seed, "stated reason", 1),
      detail(seed, "deadline field", 1),
      detail(seed, "recipient instruction", 1),
      detail(seed, "appeal or response method", 1),
      detail(seed, "attachment list", 1),
    ],
    timingGuidance: [
      detail(seed, "timing trigger", 1),
      detail(seed, "receipt versus postmark", 1),
      detail(seed, "conflicting date instruction", 1),
    ],
    informationChecklist: [
      detail(seed, "name and identifier", 1),
      detail(seed, "date and event", 1),
      detail(seed, "amount or disputed item", 1),
      detail(seed, "prior communication", 1),
      detail(seed, "recipient detail", 1),
      detail(seed, "requested action", 1),
    ],
    evidenceChecklist: [
      detail(seed, "source document evidence", 1),
      detail(seed, "transaction record evidence", 1),
      detail(seed, "correspondence evidence", 1),
      detail(seed, "supporting statement evidence", 1),
      detail(seed, "timeline evidence", 1),
      detail(seed, "proof of prior submission", 1),
    ],
    processSteps: [
      { title: `Identify the ${seed} record`, guidance: detail(seed, "process identify", 1) },
      { title: "Confirm controlling facts", guidance: detail(seed, "process facts", 1) },
      { title: "Map evidence to disputed points", guidance: detail(seed, "process evidence", 1) },
      { title: "Choose the supported response path", guidance: detail(seed, "process path", 1) },
      { title: "Review and preserve the final record", guidance: detail(seed, "process review", 1) },
    ],
    issuesChecked: [
      detail(seed, "identity consistency", 1),
      detail(seed, "instruction consistency", 1),
      detail(seed, "evidence gap", 1),
      detail(seed, "recipient accuracy", 1),
      detail(seed, "packet completeness", 1),
    ],
    commonMistakes: [
      detail(seed, "mistake one", 1),
      detail(seed, "mistake two", 1),
      detail(seed, "mistake three", 1),
      detail(seed, "mistake four", 1),
      detail(seed, "mistake five", 1),
      detail(seed, "mistake six", 1),
    ],
    scenarios: [
      {
        title: `${seed} facts agree with the source record`,
        situation: detail(seed, "scenario one situation", 1),
        responsePath: detail(seed, "scenario one path", 1),
      },
      {
        title: `${seed} source record contains a factual mismatch`,
        situation: detail(seed, "scenario two situation", 1),
        responsePath: detail(seed, "scenario two path", 1),
      },
      {
        title: `${seed} instructions are incomplete or conflicting`,
        situation: detail(seed, "scenario three situation", 1),
        responsePath: detail(seed, "scenario three path", 1),
      },
    ],
    responsePaths: [
      detail(seed, "agree and comply path", 1),
      detail(seed, "correct the record path", 1),
      detail(seed, "request review or clarification path", 1),
    ],
    packetContents: [
      detail(seed, "cover response", 1),
      detail(seed, "supporting exhibit", 1),
      detail(seed, "document index", 1),
      detail(seed, "approval copy", 1),
      detail(seed, "mailing proof", 1),
    ],
    submissionGuidance: [
      detail(seed, "submission method", 1),
      detail(seed, "recipient verification", 1),
      detail(seed, "tracking and proof", 1),
    ],
    practicalChecklist: [
      detail(seed, "final name check", 1),
      detail(seed, "final date check", 1),
      detail(seed, "final evidence check", 1),
      detail(seed, "final recipient check", 1),
      detail(seed, "final copy retention check", 1),
    ],
    templatesAndTools: [
      detail(seed, "document comparison worksheet", 1),
      detail(seed, "evidence index template", 1),
      detail(seed, "mailing record checklist", 1),
    ],
    faqs: Array.from({ length: 6 }, (_, index) => ({
      question: `How should I verify ${seed} issue ${index + 1} before responding?`,
      answer: detail(seed, `faq answer ${index + 1}`, 2),
    })),
    glossary: [
      { term: `${seed} source record`, definition: detail(seed, "glossary source record", 1) },
      { term: "Controlling instruction", definition: detail(seed, "glossary controlling instruction", 1) },
      { term: "Proof record", definition: detail(seed, "glossary proof record", 1) },
    ],
    sources: [
      {
        title: `${seed} Official Guidance`,
        publisher: "Example Government Agency",
        url: "https://example.gov/official-guidance",
        reviewedAt,
        kind: "official",
      },
      {
        title: `${seed} Primary Instructions`,
        publisher: "Example Government Agency",
        url: "https://example.gov/primary-instructions",
        reviewedAt,
        kind: "primary",
      },
    ],
    relatedWorkflowIds: [`${seed}/related-one`, `${seed}/related-two`, `${seed}/related-three`, `${seed}/related-four`],
    reviewedAt,
    disclaimer: `${seed} guidance is general document-preparation information and is not legal advice, representation, or a guarantee of outcome. The current controlling document, agency instructions, program rules, contract terms, court rules, and qualified professional advice control when they differ from this page.`,
  };
}

function makeEntry(seed: string, state: WorkflowSeoCatalogEntry["state"] = "SEO_READY"): WorkflowSeoCatalogEntry {
  return {
    id: `${seed}/main`,
    vertical: "notice",
    route: `/${seed}/main`,
    state,
    content: makeContent(seed),
  };
}

test("DRAFT can remain incomplete without becoming indexable or build-blocking", () => {
  const result = validateAuthorityRecord({ id: "draft/example", vertical: "notice", route: "/draft/example", state: "DRAFT" });
  assert.equal(result.eligibleForIndexing, false);
  assert.equal(result.buildBlocking, false);
});

test("substantive SEO_READY authority content can pass the gate", () => {
  const entry = makeEntry("alpha");
  const known = new Set([entry.id, ...entry.content!.relatedWorkflowIds]);
  const report = validateAuthorityCatalog([entry], known);
  const result = report.results[0]!;
  assert.equal(result.buildBlocking, false, JSON.stringify(result.issues, null, 2));
  assert.equal(result.eligibleForIndexing, true);
  assert.ok(result.score >= AUTHORITY_GATE_MIN_SCORE);
  assert.ok(result.substantiveWordCount >= 1200);
});

test("thin SEO_READY content is rejected instead of silently indexed", () => {
  const entry = makeEntry("thin");
  entry.content = {
    ...entry.content!,
    overview: "Short generic overview.",
    evidenceChecklist: ["Gather supporting evidence."],
    processSteps: [{ title: "Respond", guidance: "Respond carefully." }],
    faqs: [],
  };
  const result = validateAuthorityRecord(entry);
  assert.equal(result.eligibleForIndexing, false);
  assert.equal(result.buildBlocking, true);
  assert.ok(result.issues.some((item) => item.code === "OVERVIEW_THIN"));
  assert.ok(result.issues.some((item) => item.code === "EVIDENCE_GUIDANCE_THIN"));
  assert.ok(result.issues.some((item) => item.code === "FAQ_THIN"));
});

test("EXECUTABLE requires a separately verified execution entry point", () => {
  const entry = makeEntry("execute", "EXECUTABLE");
  const result = validateAuthorityRecord(entry);
  assert.equal(result.eligibleForIndexing, false);
  assert.equal(result.buildBlocking, true);
  assert.ok(result.issues.some((item) => item.code === "EXECUTION_NOT_VERIFIED"));
});

test("duplicate metadata and substantially duplicated copy block publication", () => {
  const first = makeEntry("duplicate");
  const second: WorkflowSeoCatalogEntry = {
    ...first,
    id: "duplicate/second",
    route: "/duplicate/second",
    content: { ...first.content! },
  };
  const known = new Set([
    first.id,
    second.id,
    ...first.content!.relatedWorkflowIds,
  ]);
  const report = validateAuthorityCatalog([first, second], known);
  assert.equal(report.counts.blocked, 2);
  for (const result of report.results) {
    assert.equal(result.eligibleForIndexing, false);
    assert.ok(result.issues.some((item) => item.code === "DUPLICATE_METADATA"));
    assert.ok(result.issues.some((item) => item.code === "CONTENT_TOO_SIMILAR"));
  }
});
