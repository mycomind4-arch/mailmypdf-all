import { describe, expect, it } from 'vitest'
import { codeEnforcementRecordCategorySchema, defaultCodeEnforcementCategories, isCodeEnforcementCategory } from './code-enforcement-records-schema'

describe('Code Enforcement record category schema', () => {
  it('includes the core categories needed for a complete case search', () => {
    const ids = codeEnforcementRecordCategorySchema.map(category => category.id)
    expect(ids).toContain('case-file')
    expect(ids).toContain('complaints')
    expect(ids).toContain('inspections')
    expect(ids).toContain('photographs-and-video')
    expect(ids).toContain('referenced-and-attached-records')
  })

  it('defaults to the required categories without optional permit records', () => {
    expect(defaultCodeEnforcementCategories()).not.toContain('permits-and-related-records')
    expect(defaultCodeEnforcementCategories()).toContain('case-file')
  })

  it('rejects unknown category identifiers', () => {
    expect(isCodeEnforcementCategory('unknown')).toBe(false)
    expect(isCodeEnforcementCategory('case-file')).toBe(true)
  })
})
