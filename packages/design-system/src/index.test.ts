import assert from 'node:assert/strict'
import test from 'node:test'
import { ecosystemThemes, getVerticalTheme, mailMyPdfTokens, publicPagePrimitives } from './index.js'

const themeIds = [
  'mailmypdf',
  'appeal-mail',
  'benefits-appeal',
  'claim-proof',
  'code-enforcement',
  'dispute-mail',
  'immigration-mail',
  'insurance-claims',
  'notice-respond',
  'permit-reply',
  'private-office',
  'records-request',
  'small-business',
  'tenant-reply',
] as const

test('every ecosystem product has a theme on the shared MailMyPDF foundation', () => {
  for (const id of themeIds) {
    const theme = getVerticalTheme(id)
    assert.ok(theme.accent)
    assert.ok(theme.accentSoft)
    assert.ok(theme.displayName)
    assert.equal(theme.id, id)
  }

  assert.equal(Object.keys(ecosystemThemes).length, themeIds.length)
  assert.equal(mailMyPdfTokens.layout.sidebar, '256px')
})

test('vertical themes change identity without changing the shared token scale', () => {
  const immigration = getVerticalTheme('immigration-mail')
  const business = getVerticalTheme('small-business')
  const privateOffice = getVerticalTheme('private-office')

  assert.notEqual(immigration.accent, business.accent)
  assert.notEqual(business.accent, privateOffice.accent)
  assert.equal(mailMyPdfTokens.radius.md, '0.625rem')
  assert.equal(mailMyPdfTokens.spacing.md, '1rem')
})

test('canonical public primitives include the shared vertical hero and trust strip', () => {
  assert.ok(publicPagePrimitives.includes('VerticalHero'))
  assert.ok(publicPagePrimitives.includes('TrustStrip'))
})
