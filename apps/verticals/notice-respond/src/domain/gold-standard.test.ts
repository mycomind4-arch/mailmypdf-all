import { describe, it, expect } from 'vitest'
import {
  analyzeNoticeWorkflowInput,
  canApproveNotice,
  canAuthorizeNoticeMail,
  canCompleteNoticeProof,
} from './gold-standard'
import { noticeRespondCatalog } from './workflow-catalog'

/* ─────────────────────────────────────────────────────────────
   Gold-Standard Gate Tests for all Notice Respond workflows.

   Every functional workflow in the catalog must pass through:
   1. Profile exists and is loadable
   2. Empty input blocks approval
   3. Complete input passes the approval gate
   4. Full send pipeline (analyze → approve → mail → proof) works
   ───────────────────────────────────────────────────────────── */

const SAMPLE_TEXT = `
  Internal Revenue Service
  PO Box 9019
  Holtsville, NY 11742

  RE: CP2000 Notice
  Tax Year: 2024
  Notice Date: March 15, 2025
  Response Deadline: April 30, 2025

  We are proposing changes to your tax return based on information we received from third parties.
`

function camelCaseKey(requirement: string): string {
  return requirement.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, char: string) => char.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '')
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const functionalWorkflows = noticeRespondCatalog.filter((w) => w.lifecycle === 'functional' || w.lifecycle === 'authority')

describe('Notice Respond gold-standard gates', () => {
  for (const workflow of functionalWorkflows) {
    describe(`${workflow.id}`, () => {
      it('has a loadable catalog entry with required fields', () => {
        expect(workflow.id).toBeTruthy()
        expect(workflow.title).toBeTruthy()
        expect(workflow.description).toBeTruthy()
        expect(workflow.engine).toBeTruthy()
        expect(workflow.capabilities.length).toBeGreaterThan(0)
      })

      it('blocks approval when required facts and evidence are missing', () => {
        const requiredFacts = workflow.requirements
          .filter((r) => r.type === 'response' || r.type === 'document')
          .map((r) => r.label)
        const evidenceRequirements = workflow.requirements
          .filter((r) => r.type === 'document' && !r.required)
          .map((r) => r.label)

        const analysis = analyzeNoticeWorkflowInput({
          documentId: 'test-doc',
          text: SAMPLE_TEXT,
          workflowId: workflow.id,
          requiredFacts: requiredFacts.length > 0 ? requiredFacts : ['Notice reference number'],
          evidenceRequirements: evidenceRequirements.length > 0 ? evidenceRequirements : ['Supporting documentation'],
          objectivePrompt: 'What outcome are you requesting?',
        })

        expect(analysis.blockingIssues.length).toBeGreaterThan(0)
        expect(canApproveNotice(analysis)).toBe(false)
      })

      it('passes the approval gate with complete input', () => {
        const requiredFacts = workflow.requirements
          .filter((r) => r.type === 'response' || r.type === 'document')
          .map((r) => r.label)
        const evidenceRequirements = workflow.requirements
          .filter((r) => r.type === 'document' && !r.required)
          .map((r) => r.label)

        const facts: Record<string, string> = {}
        for (const fact of requiredFacts.length > 0 ? requiredFacts : ['Notice reference number']) {
          facts[camelCaseKey(fact)] = `Value for ${fact}`
        }
        const evidenceStatuses: Record<string, string> = {}
        for (const req of evidenceRequirements.length > 0 ? evidenceRequirements : ['Supporting documentation']) {
          evidenceStatuses[`evidence-${slugify(req)}`] = 'provided'
        }

        const analysis = analyzeNoticeWorkflowInput({
          documentId: 'test-doc',
          text: SAMPLE_TEXT,
          workflowId: workflow.id,
          requiredFacts: requiredFacts.length > 0 ? requiredFacts : ['Notice reference number'],
          evidenceRequirements: evidenceRequirements.length > 0 ? evidenceRequirements : ['Supporting documentation'],
          objectivePrompt: 'What outcome are you requesting?',
          workflowFacts: facts,
          evidenceStatuses,
          objective: 'Resolve the notice by providing the requested information',
        })

        expect(analysis.blockingIssues).toHaveLength(0)
        expect(canApproveNotice(analysis)).toBe(true)
      })

      it('passes the full send pipeline gate', () => {
        const requiredFacts = workflow.requirements
          .filter((r) => r.type === 'response' || r.type === 'document')
          .map((r) => r.label)
        const evidenceRequirements = workflow.requirements
          .filter((r) => r.type === 'document' && !r.required)
          .map((r) => r.label)

        const facts: Record<string, string> = {}
        for (const fact of requiredFacts.length > 0 ? requiredFacts : ['Notice reference number']) {
          facts[camelCaseKey(fact)] = `Value for ${fact}`
        }
        const evidenceStatuses: Record<string, string> = {}
        for (const req of evidenceRequirements.length > 0 ? evidenceRequirements : ['Supporting documentation']) {
          evidenceStatuses[`evidence-${slugify(req)}`] = 'provided'
        }

        const analysis = analyzeNoticeWorkflowInput({
          documentId: 'test-doc',
          text: SAMPLE_TEXT,
          workflowId: workflow.id,
          requiredFacts: requiredFacts.length > 0 ? requiredFacts : ['Notice reference number'],
          evidenceRequirements: evidenceRequirements.length > 0 ? evidenceRequirements : ['Supporting documentation'],
          objectivePrompt: 'What outcome are you requesting?',
          workflowFacts: facts,
          evidenceStatuses,
          objective: 'Resolve the notice',
        })

        const authorized = canAuthorizeNoticeMail({
          analysis,
          draftValidated: true,
          humanApproved: true,
          recipientComplete: true,
          paymentComplete: true,
        })
        expect(authorized).toBe(true)

        const proofComplete = canCompleteNoticeProof({
          trackingNumber: 'TRK123456789',
          proofReady: true,
        })
        expect(proofComplete).toBe(true)
      })
    })
  }
})
