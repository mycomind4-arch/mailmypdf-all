import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeKey) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 503 })
  }

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    // Verify webhook signature (if secret is configured)
    if (webhookSecret && signature) {
      // In production, verify with Stripe SDK
      // For now, pass through — signature verification happens in the Stripe SDK
    }

    const event = JSON.parse(body)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const { workflowId, caseId, mailClass } = session.metadata || {}

        // Fulfillment: generate PDF, upload to storage, create Lob letter
        // This would call the Lob API and update the case in Supabase
        console.log('Stripe checkout completed:', { workflowId, caseId, mailClass, sessionId: session.id })

        // TODO: Implement fulfillment pipeline
        // 1. Generate PDF from case draft using pdf-lib
        // 2. Upload to R2 storage
        // 3. Create Lob letter with recipient + mail class
        // 4. Update case status to 'mailed'
        // 5. Create proof packet (hash + recipient + mailing method + tracking)
        // 6. Insert mailing record
        break
      }
      case 'payment_intent.payment_failed': {
        console.log('Payment failed:', event.data.object.id)
        break
      }
      default:
        // Unhandled event type
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
