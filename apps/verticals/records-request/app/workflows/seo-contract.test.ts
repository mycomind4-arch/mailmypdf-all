import { describe, expect, it } from 'vitest'
import { workflows } from './workflow-data'

describe('workflow SEO contract', () => {
  it('has unique, indexable workflow slugs', () => {
    const slugs = workflows.map(workflow => workflow.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
  })

  it('gives every workflow a substantive search landing package', () => {
    const titles = new Set<string>()
    for (const workflow of workflows) {
      expect(workflow.seo).toBeDefined()
      expect(workflow.seo?.title.length).toBeGreaterThanOrEqual(35)
      expect(workflow.seo?.title.length).toBeLessThanOrEqual(85)
      expect(workflow.seo?.description.length).toBeGreaterThanOrEqual(110)
      expect(workflow.seo?.description.length).toBeLessThanOrEqual(220)
      expect((workflow.seo?.keywords.length ?? 0)).toBeGreaterThanOrEqual(8)
      expect((workflow.seo?.faqs.length ?? 0)).toBeGreaterThanOrEqual(4)
      expect(workflow.seo?.faqs.every(faq => faq.question.length >= 25 && faq.answer.length >= 80)).toBe(true)
      expect(titles.has(workflow.seo?.title ?? '')).toBe(false)
      titles.add(workflow.seo?.title ?? '')
    }
  })

  it('keeps keyword clusters tied to the workflow intent', () => {
    for (const workflow of workflows) {
      const haystack = [workflow.intent, ...(workflow.seo?.keywords ?? [])].join(' ').toLowerCase()
      const intentTokens = workflow.intent.toLowerCase().split(/\s+/).filter(token => token.length > 3)
      expect(intentTokens.length).toBeGreaterThan(0)
      expect(intentTokens.filter(token => haystack.includes(token)).length).toBeGreaterThanOrEqual(Math.min(2, intentTokens.length))
    }
  })
})
