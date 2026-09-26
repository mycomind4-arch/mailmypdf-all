import assert from "node:assert/strict"
import test from "node:test"
import {
  LEGACY_WORKFLOW_ID_ALIASES,
  canonicalWorkflowIdForLegacyId,
  canonicalWorkflowPathForLegacyPath,
} from "../src/lib/workflow-legacy-aliases"
import { workflowById } from "../src/lib/workflow-registry"

test("explicit legacy aliases always point to canonical registry identities", () => {
  for (const canonicalId of Object.values(LEGACY_WORKFLOW_ID_ALIASES)) {
    assert.ok(workflowById(canonicalId), `Missing canonical target for ${canonicalId}`)
  }
})

test("exact legacy section prefixes resolve only when the canonical slug exists", () => {
  assert.equal(canonicalWorkflowIdForLegacyId("notice/cp2000-response"), "notice-respond/cp2000-response")
  assert.equal(canonicalWorkflowIdForLegacyId("records/public-records-request"), "records-request/public-records-request")
  assert.equal(canonicalWorkflowIdForLegacyId("appeal/not-a-real-workflow"), null)
})

test("reviewed renamed legacy identities resolve explicitly", () => {
  assert.equal(canonicalWorkflowIdForLegacyId("appeal/ssdi-denial"), "appeal-mail/appeal-ssdi-denial")
  assert.equal(canonicalWorkflowIdForLegacyId("legal-defense/wrongful-stolen-vehicle-arrest"), "legal-defense/stolen-vehicle-arrest-defense")
  assert.equal(canonicalWorkflowPathForLegacyPath("/notice/irs-notice"), "/notice-respond/workflows/irs-notice-response")
  assert.equal(canonicalWorkflowPathForLegacyPath("/legal-defense/workflows/wrongful-stolen-vehicle-arrest"), "/legal-defense/workflows/stolen-vehicle-arrest-defense")
  assert.equal(canonicalWorkflowPathForLegacyPath("/notice-respond/workflows/cp14-response/start"), null)
})
