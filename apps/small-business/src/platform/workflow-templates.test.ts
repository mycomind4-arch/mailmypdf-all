import { describe, it, expect } from 'vitest'
import { smallBusinessWorkflowTemplates } from './workflow-templates'

describe('Workflow Templates', () => {
  it('all flagship templates have evidence-oriented required facts and mailing class', () => {
    expect(smallBusinessWorkflowTemplates.length).toBe(5)
    for (const template of smallBusinessWorkflowTemplates) {
      expect(template.requiredFacts.length >= 2).toBe(true)
      expect(['FIRST_CLASS', 'CERTIFIED', 'REGISTERED'].includes(template.mailClass)).toBe(true)
    }
  })
})
