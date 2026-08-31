import { describe, it, expect } from 'vitest'
import { validateDraft } from '../draft-validator'

describe('validateDraft', () => {
  it('passes a well-formed draft with matching facts', () => {
    const draft = `Dear Sir/Madam,

Re: Claim #CLM-12345

I am writing to appeal the denial decision dated 2026-01-15. The deadline for appeal is 2026-03-15.

The denial was issued incorrectly. The amount of $5,000 should be covered under my policy.

The policy clearly covers this type of damage. I have provided all necessary documentation including the original claim filing, supporting photographs, and the estimate from a licensed contractor. I request that you reconsider this denial and process the claim in accordance with the terms of my policy. I have maintained continuous coverage with your company for over five years without any prior claims. The damage occurred on the date specified and was reported within the required timeframe. All requested documentation has been submitted. I believe the denial overlooks key provisions of my policy that should apply to this situation.

Sincerely,
John Doe`

    const result = validateDraft(draft, {
      referenceNumber: 'CLM-12345',
      decisionDate: '2026-01-15',
      deadline: '2026-03-15',
      amount: '\$5,000',
      issuer: 'Test Insurance',
    })
    expect(result.passed).toBe(true)
    expect(result.errors).toBe(0)
    expect(result.blocks).toBe(0)
  })

  it('fails when required sections are missing', () => {
    const draft = 'Just a plain text without proper sections.'
    const result = validateDraft(draft, {})
    expect(result.passed).toBe(false)
    expect(result.errors).toBeGreaterThan(0)
  })

  it('detects unresolved placeholders', () => {
    const draft = 'Dear Sir/Madam, Re: Claim, [your name here], Sincerely, [insert name]'
    const result = validateDraft(draft, {})
    expect(result.findings.some(f => f.check === 'unresolved_placeholders' && !f.passed)).toBe(true)
  })

  it('blocks forbidden phrases', () => {
    const draft = 'Dear Sir/Madam, Re: Test, I promise you will get a guaranteed outcome. Sincerely, Test'
    const result = validateDraft(draft, {}, {
      requiredSections: ['Dear', 'Sincerely', 'Re:'],
      forbiddenPhrases: ['guaranteed outcome', 'I promise'],
    })
    expect(result.blocks).toBe(2)
    expect(result.passed).toBe(false)
  })

  it('warns on missing reference number', () => {
    const draft = 'Dear Sir/Madam, Re: Test claim, This is a sufficiently long draft with more than one hundred words to pass the minimum length check. ' + 'word '.repeat(80) + 'Sincerely, Test'
    const result = validateDraft(draft, { referenceNumber: 'REF-999' })
    expect(result.findings.some(f => f.check === 'reference_number_consistency' && !f.passed && f.severity === 'warning')).toBe(true)
  })

  it('fails on drafts shorter than 100 words', () => {
    const draft = 'Dear Sir/Madam, Re: Test, Short. Sincerely, Test'
    const result = validateDraft(draft, {})
    expect(result.findings.some(f => f.check === 'minimum_length' && !f.passed)).toBe(true)
  })
})
