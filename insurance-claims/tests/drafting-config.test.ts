import { describe, expect, it } from "vitest"

import {
  INSURANCE_WORKFLOW_CONFIGS,
  INSURANCE_WORKFLOWS,
  getInsuranceWorkflowConfig,
} from "../src/index.js"

describe("Insurance Claims drafting profiles", () => {
  it("preserves a drafting profile for every canonical insurance workflow", () => {
    const catalogIds = INSURANCE_WORKFLOWS.map((workflow) => workflow.id).sort()
    const profileIds = Object.keys(INSURANCE_WORKFLOW_CONFIGS).sort()

    expect(profileIds).toEqual(catalogIds)
    expect(profileIds).toHaveLength(30)
  })

  it("preserves source-grounded drafting and validation constraints", () => {
    for (const workflow of INSURANCE_WORKFLOWS) {
      const profile = getInsuranceWorkflowConfig(workflow.id)

      expect(profile).toBeDefined()
      expect(profile?.workflowId).toBe(workflow.id)
      expect(profile?.systemPrompt).toContain("Never invent")
      expect(profile?.validationPrompt.length).toBeGreaterThan(50)
      expect(profile?.requiredSections).toContain("Re:")
      expect(profile?.forbiddenPhrases.length).toBeGreaterThan(0)
    }
  })

  it("fails closed for an unknown workflow id", () => {
    expect(getInsuranceWorkflowConfig("not-a-real-insurance-workflow")).toBeUndefined()
  })

  it("contains no vertical-local pricing contract", () => {
    for (const profile of Object.values(INSURANCE_WORKFLOW_CONFIGS)) {
      expect("pricing" in profile).toBe(false)
    }
  })
})
