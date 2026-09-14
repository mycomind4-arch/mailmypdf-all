import { describe, expect, it } from 'vitest'
import {
  PROPERTY_PERMIT_RECORD_CATEGORIES,
  buildPropertyPermitRecordsRequest,
  propertyPermitRecordsWorkflow,
} from './property-permit-records'

function validated(input: Record<string, unknown>) {
  const request = buildPropertyPermitRecordsRequest(input)
  return {
    ...request,
    normalizedTitle: request.title.replace(/\s+/g, ' '),
    normalizedAgency: request.agency.replace(/\s+/g, ' '),
  }
}

describe('property and permit records workflow', () => {
  const base = {
    agency: 'Example Building Department',
    jurisdiction: 'California / Example County',
    permitNumber: 'BP-2026-00123',
    address: '100 Main St',
    parcelNumber: 'APN-123',
    dateStart: '2024-01-01',
    dateEnd: '2026-01-31',
    projectDescription: 'two-story addition',
  }

  it('preserves the canonical executable v2 contract', () => {
    expect(propertyPermitRecordsWorkflow.contractVersion).toBe(2)
    expect(propertyPermitRecordsWorkflow.id).toBe('property-permit-records')
    expect(propertyPermitRecordsWorkflow.manifest.id).toBe('property-permit-records')
    expect(propertyPermitRecordsWorkflow.manifest.version).toBe('2.0.0')
    expect(propertyPermitRecordsWorkflow.seo.canonicalPath).toBe('/workflows/property-permit-records')
    expect(propertyPermitRecordsWorkflow.request.categories).toEqual(PROPERTY_PERMIT_RECORD_CATEGORIES)
    expect(propertyPermitRecordsWorkflow.manifest.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
    expect(propertyPermitRecordsWorkflow.intake).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'jurisdiction', required: true }),
      expect.objectContaining({ id: 'requesterAccessContext' }),
      expect.objectContaining({ id: 'preferredFormat' }),
      expect.objectContaining({ id: 'narrowingNotes' }),
      expect.objectContaining({ id: 'exclusions' }),
      expect.objectContaining({ id: 'releaseStatus' }),
    ]))
  })

  it('builds an auditable, identifier-rich, date-bounded request scope', () => {
    const request = buildPropertyPermitRecordsRequest({
      ...base,
      requesterAccessContext: 'property owner',
      preferredFormat: 'searchable PDF and native plan files',
      narrowingNotes: 'limit plans to approved and superseded versions for this permit',
      exclusions: 'exclude unrelated properties and access-control details',
      priorRequestDate: '2026-02-01',
      agencyRequestNumber: 'PRA-26-44',
      agencyResponseDate: '2026-02-12',
      releaseStatus: 'partial production',
      categories: ['building-permits', 'inspection-records', 'approved-plans', 'permit-history'],
    })

    const scope = JSON.parse(request.scope) as Record<string, unknown>
    expect(request.title).toContain('BP-2026-00123')
    expect(request.jurisdiction).toBe('California / Example County')
    expect(request.items).toHaveLength(4)
    expect(scope).toMatchObject({
      workflow: 'property-permit-records',
      intakeVersion: '2.0.0',
      address: '100 Main St',
      parcelNumber: 'APN-123',
      permitNumber: 'BP-2026-00123',
      jurisdiction: 'California / Example County',
      requesterAccessContext: 'property owner',
      agencyRequestNumber: 'PRA-26-44',
      releaseStatus: 'partial production',
    })
    expect(request.items[0].description).toContain('permit number BP-2026-00123')
    expect(request.items[0].description).toContain('Narrowing instructions:')
    expect(request.items[0].description).toContain('Exclude or segregate unrelated/sensitive material')
    expect(request.items[2].format).toBe('searchable PDF and native plan files')
    expect(request.items[3].systemHint).toContain('permit / project tracking system')
  })

  it('preserves permit, application, and inspection status instead of turning records into legal conclusions', () => {
    const request = buildPropertyPermitRecordsRequest({
      ...base,
      categories: ['building-permits', 'permit-applications', 'inspection-records'],
    })

    const permit = request.items.find((item) => item.category === 'building-permits')!
    const application = request.items.find((item) => item.category === 'permit-applications')!
    const inspection = request.items.find((item) => item.category === 'inspection-records')!

    expect(permit.description).toContain('does not by itself prove that all work was performed')
    expect(application.description).toContain('is not proof that a permit was issued')
    expect(inspection.description).toContain('Preserve requested, scheduled, attempted, completed, passed, failed')
    expect(inspection.description).toContain('do not infer lawful entry, consent, warrant authority')
  })

  it('preserves plan-version, correction-notice, and occupancy status boundaries', () => {
    const request = buildPropertyPermitRecordsRequest({
      ...base,
      categories: ['approved-plans', 'site-plans', 'plan-review-comments', 'correction-notices', 'certificate-of-occupancy'],
    })

    const plans = request.items.find((item) => item.category === 'approved-plans')!
    const site = request.items.find((item) => item.category === 'site-plans')!
    const review = request.items.find((item) => item.category === 'plan-review-comments')!
    const correction = request.items.find((item) => item.category === 'correction-notices')!
    const occupancy = request.items.find((item) => item.category === 'certificate-of-occupancy')!

    expect(plans.description).toContain('exact plan version approved or accepted')
    expect(plans.description).toContain('Do not assume security-sensitive, copyrighted, confidential')
    expect(site.description).toContain('Do not seek alarm layouts, access-control secrets')
    expect(review.description).toContain('does not by itself establish an adjudicated code violation')
    expect(correction.description).toContain('Do not infer valid service, final enforceability, waiver, default')
    expect(occupancy.description).toContain('Preserve temporary, conditional, partial, final, revoked, expired')
  })

  it('declares explicit policy safeguards for consequential property and permit inference', () => {
    const rules = propertyPermitRecordsWorkflow.policies?.[0]?.rules ?? {}
    expect(rules).toMatchObject({
      doNotTreatApplicationFeePaymentOrApplicationNumberAsPermitApproval: true,
      doNotTreatPermitIssuanceAsProofWorkOccurredOrIsFullyCompliantOrLawful: true,
      doNotInferConsentLawfulEntryWarrantAuthorityComplianceNegligenceOrLiabilityFromInspectionRecord: true,
      preservePlanVersionRevisionApprovalAndSupersessionProvenance: true,
      doNotAssumeSecuritySensitiveCopyrightedConfidentialOrRestrictedPlansArePublic: true,
      doNotInferValidServiceFinalityWaiverDefaultDeadlineOrUnlawfulWorkFromNoticeDateAlone: true,
      doNotInferPermitAbsenceOrIllegalityFromMissingIndexEntry: true,
      neverRequestPasswordsOtpsTokensPrivateKeysRecoveryCodesAccessControlSecretsOrSystemCredentials: true,
    })
  })

  it('requires jurisdiction and a usable property or permit identifier', () => {
    const missing = validated({
      agency: 'Example',
      dateStart: '2026-01-01',
      dateEnd: '2026-01-31',
      projectDescription: 'addition',
    })
    const issues = propertyPermitRecordsWorkflow.validateRequest(missing)
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'identifiers' }),
      expect.objectContaining({ field: 'jurisdiction' }),
    ]))
  })

  it('ignores unknown categories without broadening the request', () => {
    const request = buildPropertyPermitRecordsRequest({
      ...base,
      categories: ['building-permits', '<script>', 'unknown'],
    })
    expect(request.items.map((item) => item.category)).toEqual(['building-permits'])
  })
})
