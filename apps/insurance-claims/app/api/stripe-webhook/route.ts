import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 503 })
  }

  try {
    const body = await request.text()
    const event = JSON.parse(body)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const { workflowId, caseId, mailClass } = session.metadata || {}
        // Fulfillment: generate PDF, upload, create Lob letter, update claim, create proof
        console.log('Insurance Claims — checkout completed:', { workflowId, caseId, mailClass, sessionId: session.id })
        break
      }
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
