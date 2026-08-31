import { describe, it, expect } from 'vitest'
import { analyzeDisputeWorkflowInput, canApproveDispute, canAuthorizeDisputeMail, canCompleteDisputeProof } from './gold-standard'
import { getWorkflowProfile } from './workflow-profiles'

/* ─────────────────────────────────────────────────────────────
   Gold-Standard Gate Tests for the 7 new dispute workflows.
   Each test verifies that:
   1. A workflow profile exists and is loadable
   2. Analysis with empty input produces blocking issues
   3. Analysis with complete input passes the approval gate
   4. The full send pipeline (analyze → approve → mail → proof) works
   ───────────────────────────────────────────────────────────── */

const NEW_WORKFLOW_IDS = [
  'transunion-dispute',
  'experian-dispute',
  'equifax-dispute',
  'lexisnexis-dispute',
  'fcra-dispute',
  'fdcpa-dispute',
  'debt-lawsuit-response',
] as const

const SAMPLE_TEXT = `
  TransUnion Consumer Dispute Department
  PO Box 2000
  Chester, PA 19022

  RE: Dispute of credit report item
  Account: 12345-ABC
  Report Date: January 15, 2025

  The consumer disputes the accuracy of the following item on their credit report.
`

function camelCaseKey(requirement: string): string {
  return requirement.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, char: string) => char.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '')
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function buildCompleteFacts(profile: ReturnType<typeof getWorkflowProfile>): Record<string, string> {
  const facts: Record<string, string> = {}
  for (const fact of profile.requiredFacts) {
    facts[camelCaseKey(fact)] = `Value for ${fact}`
  }
  return facts
}

function buildCompleteEvidence(profile: ReturnType<typeof getWorkflowProfile>): Record<string, string> {
  const statuses: Record<string, string> = {}
  for (const req of profile.evidenceRequirements) {
    statuses[`evidence-${slugify(req)}`] = 'provided'
  }
  return statuses
}

describe('New workflow gold-standard gates', () => {
  for (const workflowId of NEW_WORKFLOW_IDS) {
    describe(`${workflowId}`, () => {
      it('has a loadable workflow profile', () => {
        const profile = getWorkflowProfile(workflowId)
        expect(profile).toBeDefined()
        expect(profile.id).toBe(workflowId)
        expect(profile.draftSubject).toBeTruthy()
        expect(profile.recipientRole).toBeTruthy()
        expect(profile.outcome).toBeTruthy()
        expect(profile.deadlinePolicy).toBeTruthy()
        expect(profile.requiredFacts.length).toBeGreaterThan(0)
        expect(profile.evidenceRequirements.length).toBeGreaterThan(0)
      })

      it('blocks approval when required facts and evidence are missing', () => {
        const profile = getWorkflowProfile(workflowId)
        const analysis = analyzeDisputeWorkflowInput({
          documentId: 'test-doc',
          text: SAMPLE_TEXT,
          profile,
        })

        expect(analysis.blockingIssues.length).toBeGreaterThan(0)
        expect(canApproveDispute(analysis)).toBe(false)
      })

      it('passes the approval gate with complete input', () => {
        const profile = getWorkflowProfile(workflowId)
        const facts = buildCompleteFacts(profile)
        const evidenceStatuses = buildCompleteEvidence(profile)

        const analysis = analyzeDisputeWorkflowInput({
          documentId: 'test-doc',
          text: SAMPLE_TEXT,
          profile,
          workflowFacts: facts,
          evidenceStatuses,
          objective: 'Correct the disputed item and remove it from my credit report',
        })

        expect(analysis.blockingIssues).toHaveLength(0)
        expect(canApproveDispute(analysis)).toBe(true)
      })

      it('passes the full send pipeline gate', () => {
        const profile = getWorkflowProfile(workflowId)
        const facts = buildCompleteFacts(profile)
        const evidenceStatuses = buildCompleteEvidence(profile)

        const analysis = analyzeDisputeWorkflowInput({
          documentId: 'test-doc',
          text: SAMPLE_TEXT,
          profile,
          workflowFacts: facts,
          evidenceStatuses,
          objective: 'Correct the disputed item',
        })

        const authorized = canAuthorizeDisputeMail({
          analysis,
          draftValidated: true,
          humanApproved: true,
          recipientComplete: true,
          paymentComplete: true,
        })
        expect(authorized).toBe(true)

        const proofComplete = canCompleteDisputeProof({
          trackingNumber: 'TRK123456789',
          proofReady: true,
        })
        expect(proofComplete).toBe(true)
      })
    })
  }
})
