import assert from 'node:assert/strict'
import test from 'node:test'
import { ecosystemThemes, getVerticalTheme, mailMyPdfTokens } from './index.js'

test('all family themes have an accent and shared neutral foundation', () => {
  for (const id of ['mailmypdf','immigration-mail','small-business','government'] as const) {
    const theme = getVerticalTheme(id)
    assert.ok(theme.accent)
    assert.ok(theme.accentSoft)
    assert.equal(theme.id, id)
  }
  assert.equal(Object.keys(ecosystemThemes).length, 4)
  assert.equal(mailMyPdfTokens.layout.sidebar, '256px')
})

test('vertical themes change identity without changing the shared token scale', () => {
  const immigration = getVerticalTheme('immigration-mail')
  const business = getVerticalTheme('small-business')
  assert.notEqual(immigration.accent, business.accent)
  assert.equal(mailMyPdfTokens.radius.md, '0.625rem')
  assert.equal(mailMyPdfTokens.spacing.md, '1rem')
})
