import assert from "node:assert/strict";
import test from "node:test";

import { noticeRespondCatalog, getWorkflowById, getWorkflowByPath } from "../src/domain/workflow-catalog.ts";
import { registryById } from "../src/domain/workflow-master-registry.ts";
import { WORKFLOW_PROMPTS, getWorkflowPrompt } from "../src/domain/workflow-prompts.ts";
import { getWorkflowSEO } from "../src/domain/workflow-seo.ts";

/* ═══════════════════════════════════════════════════════════════
   END-TO-END INTEGRATION TESTS FOR 7 NEW WORKFLOWS

   Tests the full pipeline for each new workflow:
   catalog definition → master registry → SEO/FAQ → LLM prompts →
   workflow shell availability → directory entry

   These workflows use the generic document-action engine with
   LLM-powered analysis and draft generation.
   ═══════════════════════════════════════════════════════════════ */

const NEW_WORKFLOW_IDS = [
  "tax-notice",
  "code-enforcement",
  "permit-correction",
  "dmv-notice",
  "ssa-notice",
  "uscis-notice",
  "benefits-notice",
];

for (const workflowId of NEW_WORKFLOW_IDS) {
  test(`E2E ${workflowId}: catalog entry exists with correct lifecycle`, () => {
    const def = getWorkflowById(workflowId);
    assert.ok(def, `Workflow ${workflowId} should exist in catalog`);
    assert.equal(def.lifecycle, "functional");
    assert.equal(def.engine, "document-action");
    assert.equal(def.vertical, "notice-respond");
    assert.ok(def.title, "Should have a title");
    assert.ok(def.description, "Should have a description");
    assert.ok(def.disclaimer, "Should have a disclaimer");
    assert.ok(def.documents.length > 0, "Should have document definitions");
    assert.ok(def.documents[0].extractionFields.length > 0, "Should have extraction fields");
  });

  test(`E2E ${workflowId}: canonical path resolves`, () => {
    const def = getWorkflowById(workflowId);
    assert.ok(def.searchIntent.canonicalPath, "Should have a canonical path");
    const byPath = getWorkflowByPath(def.searchIntent.canonicalPath);
    assert.equal(byPath?.id, workflowId, "getWorkflowByPath should return this workflow");
  });

  test(`E2E ${workflowId}: master registry entry exists with matching engine/lifecycle`, () => {
    const reg = registryById[workflowId];
    assert.ok(reg, `Workflow ${workflowId} should exist in master registry`);
    const def = getWorkflowById(workflowId);
    assert.equal(reg.engine, def.engine, "Engine should match between catalog and registry");
    assert.equal(reg.lifecycle, def.lifecycle, "Lifecycle should match");
    assert.equal(reg.vertical, "notice-respond");
    assert.equal(reg.repo, "notice-respond");
    assert.ok(reg.seoUrl, "Should have SEO URL");
    assert.equal(reg.seoUrl, def.searchIntent.canonicalPath, "SEO URL should match canonical path");
    assert.ok(reg.keywordCluster.length > 0, "Should have keyword cluster");
  });

  test(`E2E ${workflowId}: LLM prompts defined for analyze and draft`, () => {
    const prompt = getWorkflowPrompt(workflowId);
    assert.ok(prompt, `Should have a prompt for ${workflowId}`);
    assert.ok(prompt.analyze, "Should have an analyze prompt");
    assert.ok(prompt.draft, "Should have a draft prompt");
    assert.ok(prompt.analyze.length > 100, "Analyze prompt should be substantial");
    assert.ok(prompt.draft.length > 100, "Draft prompt should be substantial");
    // Verify it's not just the default fallback
    assert.ok(WORKFLOW_PROMPTS[workflowId], "Should have a specific (non-default) prompt entry");
  });

  test(`E2E ${workflowId}: SEO entry with FAQs`, () => {
    const seo = getWorkflowSEO(workflowId);
    assert.ok(seo, `Should have SEO entry for ${workflowId}`);
    assert.ok(seo.title, "Should have a title");
    assert.ok(seo.description, "Should have a description");
    assert.ok(seo.keywords.length >= 3, "Should have at least 3 keywords");
    assert.ok(seo.faq.length >= 4, `Should have at least 4 FAQs, got ${seo.faq.length}`);
    for (const item of seo.faq) {
      assert.ok(item.question, "Each FAQ should have a question");
      assert.ok(item.answer, "Each FAQ should have an answer");
      assert.ok(item.question.length > 10, "FAQ question should be substantive");
      assert.ok(item.answer.length > 30, "FAQ answer should be substantive");
    }
  });

  test(`E2E ${workflowId}: catalog SEO faq matches workflow-seo faq`, () => {
    const def = getWorkflowById(workflowId);
    const seo = getWorkflowSEO(workflowId);
    assert.ok(def.seo?.faq, "Catalog entry should have SEO faq");
    assert.equal(def.seo.faq.length, seo.faq.length, "FAQ count should match between catalog and workflow-seo");
  });

  test(`E2E ${workflowId}: directory entry with steps and documents`, () => {
    const def = getWorkflowById(workflowId);
    assert.ok(def.directory, "Should have directory metadata");
    assert.ok(def.directory.category, "Should have a category");
    assert.ok(def.directory.bestFor, "Should have bestFor");
    assert.ok(def.directory.steps.length >= 4, "Should have at least 4 directory steps");
    assert.ok(def.directory.documents.length >= 3, "Should have at least 3 directory documents");
    assert.ok(def.directory.seoRoute, "Should have an SEO route");
  });

  test(`E2E ${workflowId}: deadlines and requirements defined`, () => {
    const def = getWorkflowById(workflowId);
    assert.ok(def.deadlines.length > 0, "Should have at least one deadline");
    assert.ok(def.deadlines[0].label, "Deadline should have a label");
    assert.ok(def.deadlines[0].trigger, "Deadline should have a trigger");
    assert.ok(def.requirements.length > 0, "Should have at least one requirement");
    assert.ok(def.requirements[0].label, "Requirement should have a label");
    assert.ok(def.evidence.length > 0, "Should have evidence definition");
  });

  test(`E2E ${workflowId}: UX steps and review checks`, () => {
    const def = getWorkflowById(workflowId);
    assert.ok(def.ux, "Should have UX metadata");
    assert.ok(def.ux.steps.length >= 10, "Should have at least 10 UX steps");
    assert.ok(def.ux.reviewChecks.length >= 3, "Should have at least 3 review checks");
    assert.ok(def.ux.disclaimerText, "Should have disclaimer text");
    assert.ok(def.ux.mailOptions.length >= 3, "Should have at least 3 mail options");
  });

  test(`E2E ${workflowId}: analysis and drafting configuration`, () => {
    const def = getWorkflowById(workflowId);
    assert.ok(def.analysis, "Should have analysis config");
    assert.ok(def.analysis.capabilities.length > 0, "Should have capabilities");
    assert.ok(def.analysis.orderedChecks.length > 0, "Should have ordered checks");
    assert.ok(def.analysis.outputSections.length > 0, "Should have output sections");
    assert.ok(def.drafting, "Should have drafting config");
    assert.ok(def.drafting.requiredSections.length > 0, "Should have required sections");
    assert.ok(def.drafting.forbiddenBehavior.length > 0, "Should have forbidden behaviors");
    assert.ok(def.drafting.validationChecks.length > 0, "Should have validation checks");
  });

  test(`E2E ${workflowId}: submission and quality gate`, () => {
    const def = getWorkflowById(workflowId);
    assert.ok(def.submission, "Should have submission config");
    assert.ok(def.submission.methods.length > 0, "Should have submission methods");
    assert.ok(def.submission.recipientRules.length > 0, "Should have recipient rules");
    assert.ok(def.submission.proofRequirements.length > 0, "Should have proof requirements");
    assert.ok(def.qualityGate, "Should have quality gate");
    assert.equal(def.qualityGate.factGrounding, true, "Quality gate should enforce fact grounding");
    assert.equal(def.qualityGate.deadlineVerification, true, "Quality gate should enforce deadline verification");
    assert.equal(def.qualityGate.draftValidation, true, "Quality gate should enforce draft validation");
  });
}

// ═══ Cross-workflow consistency tests ═══

test("All 7 new workflows are in the catalog", () => {
  for (const id of NEW_WORKFLOW_IDS) {
    const def = getWorkflowById(id);
    assert.ok(def, `${id} should be in catalog`);
  }
  assert.equal(
    NEW_WORKFLOW_IDS.every(id => noticeRespondCatalog.some(w => w.id === id)),
    true,
    "All 7 new IDs should be found in noticeRespondCatalog",
  );
});

test("All 7 new workflows have unique canonical paths", () => {
  const paths = NEW_WORKFLOW_IDS.map(id => getWorkflowById(id).searchIntent.canonicalPath);
  const unique = new Set(paths);
  assert.equal(unique.size, paths.length, "All canonical paths should be unique");
});

test("All 7 new workflows have unique SEO URLs in registry", () => {
  const urls = NEW_WORKFLOW_IDS.map(id => registryById[id].seoUrl);
  const unique = new Set(urls);
  assert.equal(unique.size, urls.length, "All SEO URLs should be unique");
});

test("All 7 new workflows have non-overlapping keyword clusters", () => {
  const allKeywords = NEW_WORKFLOW_IDS.flatMap(id => registryById[id].keywordCluster);
  // Each keyword should be unique across workflows
  const unique = new Set(allKeywords);
  assert.equal(unique.size, allKeywords.length, "Keyword clusters should not overlap");
});

test("Total workflow count is at least 18", () => {
  const totalCount = noticeRespondCatalog.length;
  assert.ok(totalCount >= 18, `Should have at least 18 workflows, got ${totalCount}`);
});
