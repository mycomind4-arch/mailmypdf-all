import assert from "node:assert/strict"
import test from "node:test"
import { SECTION_IDS } from "../src/lib/section-registry"
import {
  WORKFLOW_REGISTRY,
  WORKFLOW_REGISTRY_COUNT,
  canonicalWorkflowId,
  workflowById,
  workflowByPublicPath,
  workflowByWorkspacePath,
  workflowsForSection,
} from "../src/lib/workflow-registry"

test("canonical workflow registry includes all original identities and recovered bureau intakes", () => {
  // Guard the established catalog floor while allowing new authored workflows.
  assert.ok(WORKFLOW_REGISTRY_COUNT >= 449)
  assert.equal(WORKFLOW_REGISTRY.length, WORKFLOW_REGISTRY_COUNT)
  for (const slug of [
    "probate-estate-administration", "probate-executor-document-request",
    "probate-creditor-notice", "probate-beneficiary-update",
    "family-trust-asset-inventory", "family-trust-distribution-request",
    "family-trust-beneficiary-communication", "family-trust-successor-trustee-transition",
  ]) {
    assert.ok(workflowById(`private-office/${slug}`), `Missing registry workflow: private-office/${slug}`)
  }
  for (const slug of ["equifax-dispute", "experian-dispute", "transunion-dispute"]) {
    assert.equal(workflowById(`dispute-mail/${slug}`)?.maturity, "domain-ready")
  }
})

test("workflow ids and canonical paths are unique", () => {
  assert.equal(new Set(WORKFLOW_REGISTRY.map((workflow) => workflow.id)).size, WORKFLOW_REGISTRY.length)
  assert.equal(new Set(WORKFLOW_REGISTRY.map((workflow) => workflow.publicHref)).size, WORKFLOW_REGISTRY.length)
  assert.equal(new Set(WORKFLOW_REGISTRY.map((workflow) => workflow.workspaceHref)).size, WORKFLOW_REGISTRY.length)
})

test("every canonical section owns at least one workflow", () => {
  for (const sectionId of SECTION_IDS) {
    assert.ok(workflowsForSection(sectionId).length > 0, `Expected workflows for ${sectionId}`)
  }
})

test("canonical identity deterministically owns public and workspace paths", () => {
  const id = canonicalWorkflowId("secured-transactions", "name-capacity-resolution")
  const workflow = workflowById(id)
  assert.ok(workflow)
  assert.equal(workflow.publicHref, "/secured-transactions/workflows/name-capacity-resolution")
  assert.equal(workflow.workspaceHref, "/dashboard/workflows/secured-transactions/name-capacity-resolution")
  assert.equal(workflowByPublicPath(workflow.publicHref)?.id, id)
  assert.equal(workflowByWorkspacePath(workflow.workspaceHref + "/review")?.id, id)
})
