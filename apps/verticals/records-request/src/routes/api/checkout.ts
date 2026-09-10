import { createFileRoute } from '@tanstack/react-router'
import {
  RecordsAuthError,
  createCheckoutSession,
  loadApprovalForOwner,
  requireAuthenticatedUser,
} from '../../lib/commerce.server'

export const Route = createFileRoute('/api/checkout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await requireAuthenticatedUser(request)
          const input = await request.json() as { approvalId?: string }
          const approvalId = input.approvalId?.trim() || ''
          if (!approvalId) return Response.json({ error: 'Approval ID is required.' }, { status: 400 })

          const approval = await loadApprovalForOwner(approvalId, user.id)
          if (!approval) {
            return Response.json({ error: 'Active approval not found or not owned by the authenticated user.' }, { status: 404 })
          }

          const configuredOrigin = process.env.APP_URL?.replace(/\/$/, '')
          const origin = configuredOrigin || new URL(request.url).origin
          const checkout = await createCheckoutSession(user.id, approval, origin)
          return Response.json({ ok: true, ...checkout })
        } catch (error) {
          if (error instanceof RecordsAuthError) return Response.json({ error: error.message }, { status: error.status })
          return Response.json({ error: error instanceof Error ? error.message : 'Unable to create checkout session.' }, { status: 502 })
        }
      },
    },
  },
})
