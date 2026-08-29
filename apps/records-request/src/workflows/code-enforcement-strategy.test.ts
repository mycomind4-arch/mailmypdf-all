import { describe, expect, it } from 'vitest'
import { recommendCodeEnforcementFollowUps } from './code-enforcement-strategy'

describe('code enforcement follow-up strategy', () => {
  it('maps missing records to a targeted production request', () => {
    const result = recommendCodeEnforcementFollowUps([{
      id: 'f1',
      type: 'MISSING_REQUESTED_CATEGORY',
      severity: 'warning',
      description: 'No inspection report found.',
      recordIds: [],
    }])
    expect(result[0]).toMatchObject({ type: 'request_missing_records', findingId: 'f1' })
  })

  it('maps redactions to a basis request', () => {
    const result = recommendCodeEnforcementFollowUps([{
      id: 'f2',
      type: 'UNEXPLAINED_REDACTION',
      severity: 'warning',
      description: 'Redaction found.',
      recordIds: ['r1'],
    }])
    expect(result[0].type).toBe('ask_for_redaction_basis')
  })
})
