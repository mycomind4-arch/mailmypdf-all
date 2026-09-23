import assert from "node:assert/strict"
import { test } from "node:test"
import { workflowDetailGuide } from "../src/lib/workflow-detail-guides"
import { WORKFLOW_NAV_SECTIONS } from "../src/lib/workflow-navigation"

const firstSection = WORKFLOW_NAV_SECTIONS[0]
const firstThree = firstSection.workflows.slice(0, 3)

test("research starts with the first three authenticated workflows in catalog order", () => {
  assert.equal(firstSection.id, "appeal-mail")
  assert.deepEqual(firstThree.map((item) => item.slug), [
    "appeal-car-insurance-claim",
    "appeal-denied-claim",
    "appeal-dental-insurance-denial",
  ])
  for (const workflow of firstThree) {
    const guide = workflowDetailGuide(firstSection.id, workflow.slug)
    assert.ok(guide, `missing guide for ${workflow.slug}`)
    assert.ok(guide.overview.length > 100)
    assert.ok(guide.steps?.length)
    assert.ok(guide.documentsAndFacts?.length)
    assert.ok(guide.timing?.length)
    assert.ok(guide.deliveryAndProof?.length)
    assert.ok(guide.sources?.length)
    for (const source of guide.sources ?? []) {
      assert.equal(new URL(source.url).protocol, "https:")
    }
  }
})

test("unresearched workflows do not receive a fabricated generic guide", () => {
  assert.equal(workflowDetailGuide("appeal-mail", "appeal-edd-disqualification"), undefined)
  assert.equal(workflowDetailGuide("unknown", "appeal-denied-claim"), undefined)
})
