import { describe, expect, it } from 'vitest';
import {
  buildHumboldtSourceRequirements,
  buildRecordsInvestigationPlan,
  satisfySourceRequirement,
  verifySourceRequirement,
} from './source-requirements';
import type { HumboldtPropertyIntelligence } from './jurisdictions/humboldt-intelligence';

function intelligenceFixture(): HumboldtPropertyIntelligence {
  return {
    apn: '123-456-789',
    retrievedAt: '2026-09-07T22:00:00-07:00',
    parcels: [
      {
        record: {
          apn: '123456789',
          apn12: '123-456-789',
          address: '123 Example Rd',
          city: 'McKinleyville',
          zip: '95519',
          acres: 1,
          zoning: 'RS-5',
          generalPlan: null,
          communityPlan: null,
          lotSizeSqFt: null,
          buildingSqFt: null,
          yearBuilt: null,
          coastalZone: null,
          coastalJurisdiction: null,
          floodZone: null,
          stateFireResponsibility: null,
          supervisorDistrict: null,
          latitude: 40.95,
          longitude: -124.1,
          legalDescription: null,
          jurisdiction: 'Humboldt County',
          inspectorDistrict: null,
          raw: {},
        },
        sourceSnapshotId: 'snapshot-parcel',
        sourceEvidenceId: 'evidence-parcel',
      },
    ],
    historicalCodeEnforcementCases: [
      {
        record: {
          caseNumber: 'CE-2024-1',
          caseType: 'Building',
          dateOpened: '2024-01-01',
          apn: '123-456-789',
          dataAsOf: '2025-01-15',
          raw: {},
        },
        sourceSnapshotId: 'snapshot-ce',
        sourceEvidenceId: 'evidence-ce-history',
      },
    ],
    currentCodeEnforcementStatusAvailable: false,
    permitSearch: {
      automated: false,
      url: 'https://aca-prod.accela.com/humboldt/Default.aspx',
    },
    captureEvidenceIds: ['evidence-parcel', 'evidence-ce-history'],
    warnings: [],
  };
}

describe('FairProcess source requirements', () => {
  it('never treats historical Humboldt CE data as current case status', () => {
    const requirements = buildHumboldtSourceRequirements(intelligenceFixture());
    const currentStatus = requirements.find((item) => item.id === 'humboldt-current-ce-status');

    expect(currentStatus?.status).toBe('missing');
    expect(currentStatus?.priority).toBe('critical');
    expect(currentStatus?.freshness?.historicalDataAsOf).toBe('2025-01-15');
    expect(currentStatus?.satisfiedByEvidenceIds).toEqual([]);
    expect(currentStatus?.blocks).toContain('current_case_assessment');
  });

  it('recognizes current parcel evidence without allowing it to satisfy unrelated gaps', () => {
    const requirements = buildHumboldtSourceRequirements(intelligenceFixture());
    const property = requirements.find((item) => item.id === 'humboldt-property-identity');
    const permit = requirements.find((item) => item.id === 'humboldt-permit-history');

    expect(property?.status).toBe('verified');
    expect(property?.satisfiedByEvidenceIds).toEqual(['evidence-parcel']);
    expect(permit?.status).toBe('missing');
    expect(permit?.acquisitionOptions.some((option) => option.method === 'public_portal')).toBe(true);
  });

  it('builds a records-investigation plan that blocks handoff while critical evidence is absent', () => {
    const requirements = buildHumboldtSourceRequirements(intelligenceFixture());
    const plan = buildRecordsInvestigationPlan({
      caseId: 'case-1',
      generatedAt: '2026-09-07T22:00:00-07:00',
      requirements,
    });

    expect(plan.criticalMissingCount).toBeGreaterThan(0);
    expect(plan.highPriorityMissingCount).toBeGreaterThan(0);
    expect(plan.attorneyPacketBlocked).toBe(true);
    expect(plan.currentAssessmentBlocked).toBe(true);
  });

  it('requires evidence before a requirement can be marked verified', () => {
    const requirement = buildHumboldtSourceRequirements(intelligenceFixture()).find(
      (item) => item.id === 'humboldt-current-ce-status',
    )!;

    expect(() => verifySourceRequirement(requirement)).toThrow(/without evidence/i);

    const received = satisfySourceRequirement(requirement, ['evidence-current-notice']);
    const verified = verifySourceRequirement(received);

    expect(verified.status).toBe('verified');
    expect(verified.satisfiedByEvidenceIds).toEqual(['evidence-current-notice']);
  });
});
