import { createFileRoute } from '@tanstack/react-router'
import {
  RecordsAuthError,
  fulfillRecordsIntent,
  loadIntent,
  requireAuthenticatedUser,
  retrieveStripeSession,
} from '../../../lib/commerce.server'

export const Route = createFileRoute('/api/mail/finalize')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await requireAuthenticatedUser(request)
          const input = await request.json() as { sessionId?: string }
          const sessionId = input.sessionId?.trim() || ''
          if (!sessionId) return Response.json({ error: 'Stripe session ID is required.' }, { status: 400 })

          const session = await retrieveStripeSession(sessionId)
          if (session.payment_status !== 'paid') {
            return Response.json({ error: 'Stripe session is not paid.' }, { status: 409 })
          }
          const metadata = session.metadata || {}
          if (metadata.owner_user_id !== user.id) {
            return Response.json({ error: 'Stripe session does not belong to the authenticated user.' }, { status: 403 })
          }
          const intentId = String(metadata.mailing_intent_id || '')
          if (!intentId) return Response.json({ error: 'Stripe session is missing its mailing intent.' }, { status: 409 })

          const intent = await loadIntent(intentId)
          if (!intent || intent.owner_id !== user.id) {
            return Response.json({ error: 'Mailing intent not found.' }, { status: 404 })
          }
          if (intent.stripe_session_id !== sessionId) {
            return Response.json({ error: 'Stripe session does not match the stored mailing intent.' }, { status: 409 })
          }
          if (Number(session.amount_total) !== intent.stripe_price_cents) {
            return Response.json({ error: 'Paid amount does not match the server-authoritative mailing price.' }, { status: 409 })
          }

          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ? String(session.payment_intent.id) : null
          const result = await fulfillRecordsIntent(intentId, sessionId, paymentIntentId)
          return Response.json(result, { status: result.success ? 200 : 502 })
        } catch (error) {
          if (error instanceof RecordsAuthError) return Response.json({ error: error.message }, { status: error.status })
          return Response.json({ error: error instanceof Error ? error.message : 'Unable to finalize mailing.' }, { status: 502 })
        }
      },
    },
  },
})
