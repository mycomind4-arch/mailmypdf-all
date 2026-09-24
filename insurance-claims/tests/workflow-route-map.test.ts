import { describe, expect, it } from "vitest"

import {
  INSURANCE_WORKFLOWS,
  INSURANCE_WORKFLOW_ROUTE_TO_ID,
  resolveInsuranceWorkflowId,
  routeSlugForInsuranceWorkflow,
} from "../src/index.js"

describe("Insurance Claims workflow identity", () => {
  it("maps exactly one public route to every canonical domain workflow", () => {
    const mappedIds = Object.values(INSURANCE_WORKFLOW_ROUTE_TO_ID).sort()
    const domainIds = INSURANCE_WORKFLOWS.map((workflow) => workflow.id).sort()

    expect(mappedIds).toEqual(domainIds)
    expect(mappedIds).toHaveLength(30)
    expect(new Set(mappedIds).size).toBe(30)
  })

  it("preserves intentional SEO route aliases", () => {
    expect(resolveInsuranceWorkflowId("prepare-insurance-claim")).toBe("new-claim")
    expect(resolveInsuranceWorkflowId("denied-insurance-claim")).toBe("denied-claim")
    expect(resolveInsuranceWorkflowId("auto-insurance-claim")).toBe("auto-claim")
    expect(resolveInsuranceWorkflowId("medical-insurance-denial")).toBe("health-medical-denial")
  })

  it("provides a public route for every canonical workflow id", () => {
    for (const workflow of INSURANCE_WORKFLOWS) {
      expect(routeSlugForInsuranceWorkflow(workflow.id)).toBeTruthy()
    }
  })

  it("does not silently promote unmatched scaffold-only concepts", () => {
    const scaffoldOnly = [
      "claim-documentation-package",
      "disability-insurance-claim",
      "health-insurance-claim",
      "insurance-claim-evidence-package",
      "insurance-claim-follow-up",
      "life-insurance-claim",
      "long-term-disability-claim",
      "short-term-disability-claim",
      "storm-damage-insurance-claim",
    ]

    for (const slug of scaffoldOnly) {
      expect(resolveInsuranceWorkflowId(slug)).toBeUndefined()
    }
  })
})
