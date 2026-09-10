import { createFileRoute } from '@tanstack/react-router'
import type { ApprovedArtifact } from '../../approved-artifact'
import { getRecordsWorkflow } from '../../workflows'
import {
  RecordsAuthError,
  createApproval,
  requireAuthenticatedUser,
  type StructuredRecipient,
} from '../../lib/commerce.server'

export const Route = createFileRoute('/api/approve-mailing')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await requireAuthenticatedUser(request)
          const input = await request.json() as {
            confirmed?: boolean
            workflowId?: string
            artifact?: Partial<ApprovedArtifact>
            recipient?: Partial<StructuredRecipient>
            mailingClass?: ApprovedArtifact['mailingClass']
          }

          if (input.confirmed !== true) {
            return Response.json({ error: 'Explicit user approval is required before payment or mailing.' }, { status: 400 })
          }
          const workflowId = input.workflowId?.trim() || ''
          if (!workflowId || !getRecordsWorkflow(workflowId)) {
            return Response.json({ error: 'Unknown Records Request workflow.' }, { status: 400 })
          }
          if (!input.artifact || !input.recipient || !input.mailingClass) {
            return Response.json({ error: 'Approved artifact, recipient, and mailing class are required.' }, { status: 400 })
          }

          const approval = await createApproval(user.id, workflowId, input.artifact, input.recipient, input.mailingClass)
          return Response.json({
            ok: true,
            approvalId: approval.id,
            workflowId: approval.workflow_id,
            artifactHash: approval.artifact_hash,
            recipientHash: approval.recipient_hash,
            documentSha256: approval.document_sha256,
            approvedAt: approval.approved_at,
          }, { status: 201 })
        } catch (error) {
          if (error instanceof RecordsAuthError) {
            return Response.json({ error: error.message }, { status: error.status })
          }
          return Response.json({ error: error instanceof Error ? error.message : 'Unable to approve mailing.' }, { status: 400 })
        }
      },
    },
  },
})
