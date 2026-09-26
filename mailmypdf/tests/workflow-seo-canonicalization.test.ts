import assert from "node:assert/strict"
import test from "node:test"
import { workflowAuthorityCount, workflowAuthorityForPath } from "../src/lib/workflow-authority-registry"
import { WORKFLOW_REGISTRY } from "../src/lib/workflow-registry"
import { SEO_WORKFLOW_CATALOG } from "../src/lib/workflow-seo-catalog"

test("SEO catalog is a one-to-one projection of the canonical workflow registry", () => {
  assert.equal(SEO_WORKFLOW_CATALOG.length, WORKFLOW_REGISTRY.length)

  const registryById = new Map(WORKFLOW_REGISTRY.map((workflow) => [workflow.id, workflow]))
  for (const entry of SEO_WORKFLOW_CATALOG) {
    const workflow = registryById.get(entry.id)
    assert.ok(workflow, `Missing canonical workflow for ${entry.id}`)
    assert.equal(entry.vertical, workflow.sectionId)
    assert.equal(entry.route, workflow.publicHref)
  }
})

test("authority registry exposes the full canonical workflow topology", () => {
  assert.equal(workflowAuthorityCount(), WORKFLOW_REGISTRY.length)
})

test("reviewed legacy workflow URLs resolve to canonical authority pages", () => {
  const ssdi = workflowAuthorityForPath("/appeal/ssdi-denial")
  assert.equal(ssdi?.id, "appeal-mail/appeal-ssdi-denial")
  assert.equal(ssdi?.path, "/appeal-mail/workflows/appeal-ssdi-denial")

  const legalDefense = workflowAuthorityForPath("/legal-defense/wrongful-stolen-vehicle-arrest")
  assert.equal(legalDefense?.id, "legal-defense/stolen-vehicle-arrest-defense")
  assert.equal(legalDefense?.path, "/legal-defense/workflows/stolen-vehicle-arrest-defense")

  const irs = workflowAuthorityForPath("/notice/irs-notice")
  assert.equal(irs?.id, "notice-respond/irs-notice-response")
  assert.equal(irs?.path, "/notice-respond/workflows/irs-notice-response")
})

test("authored authority records are attached to canonical identities", () => {
  const ids = new Set(
    SEO_WORKFLOW_CATALOG
      .filter((entry) => entry.reviewStatus === "AUTHORITY_REVIEWED")
      .map((entry) => entry.id),
  )

  assert.ok(ids.has("appeal-mail/appeal-ssdi-denial"))
  assert.ok(ids.has("legal-defense/stolen-vehicle-arrest-defense"))
  assert.ok(ids.has("notice-respond/cp2000-response"))
  assert.ok(ids.has("notice-respond/irs-notice-response"))
})
