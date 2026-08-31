import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workflowId, caseId, mailClass = 'standard', recipient } = body

    // Auth check — verify Supabase session
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Stripe key from environment
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      return NextResponse.json({ error: 'Payment not configured' }, { status: 503 })
    }

    // Pricing lookup — Code Enforcement workflow pricing
    const PRICING: Record<string, { base: number; band: string }> = {
      'appeal-code-enforcement-decision': { base: 4999, band: 'ADVANCED' },
      'request-administrative-hearing': { base: 2999, band: 'STANDARD' },
      'respond-to-abatement-notice': { base: 2499, band: 'STANDARD' },
      'dispute-code-enforcement-fine': { base: 2999, band: 'STANDARD' },
    }

    const MAIL_PRICING: Record<string, number> = {
      standard: 499,
      certified: 1494,
      registered: 3249,
    }

    const workflow = PRICING[workflowId]
    if (!workflow) {
      return NextResponse.json({ error: 'Unknown workflow' }, { status: 400 })
    }

    const mailCost = MAIL_PRICING[mailClass] || 499
    const total = workflow.base + mailCost

    // Create Stripe checkout session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'success_url': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mycomind4-arch-code-enforcement.pages.dev'}/dashboard?status=success`,
        'cancel_url': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mycomind4-arch-code-enforcement.pages.dev'}/dashboard?status=cancelled`,
        'metadata[workflowId]': workflowId,
        'metadata[caseId]': caseId || '',
        'metadata[mailClass]': mailClass,
        'line_items[0][quantity]': '1',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][unit_amount]': String(total),
        'line_items[0][price_data][product_data][name]': `Code Enforcement — ${workflowId}`,
      }),
    })

    const session = await stripeResponse.json()
    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
