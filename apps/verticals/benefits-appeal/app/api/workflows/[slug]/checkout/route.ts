import { NextRequest, NextResponse } from 'next/server'
import {
  calculateQuote,
  getWorkflowPricingProfile,
  serializeQuote,
  PRICES,
  LABELS,
  isValidPricingKey,
  type MailClass,
} from '@mailmypdf/pricing'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params

    // ── Canonical pricing — server-authoritative quote ─────────
    const profile = getWorkflowPricingProfile(slug)
    if (!profile) return NextResponse.json({ error: `Unknown workflow: ${slug}` }, { status: 404 })
    if (profile.commercialStatus !== 'production') return NextResponse.json({ error: `Workflow ${slug} is not available for purchase.` }, { status: 403 })

    const payload = await req.json() as {
      actualPages?: number;
      supportingPages?: number;
      mailingMethod?: string;
    }

    const actualPages = Math.max(1, Math.floor(payload.actualPages ?? 3))
    const methodRaw = payload.mailingMethod ?? 'standard'
    if (!isValidPricingKey(methodRaw)) return NextResponse.json({ error: 'Invalid mailing method.' }, { status: 400 })

    const mailClass = methodRaw as MailClass
    const quote = calculateQuote({
      workflowId: slug,
      verticalId: profile.verticalId,
      actualPages,
      supportingPages: payload.supportingPages,
      mailClass,
    })

    if (quote.totalCents <= 0) return NextResponse.json({ error: 'Pricing calculation failed.' }, { status: 500 })

    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 })

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' })
    const appUrl = process.env.APP_URL || 'https://benefits-appeal.pages.dev'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${profile.band} — ${LABELS[methodRaw as keyof typeof LABELS]}`,
            description: `Workflow preparation ($${(quote.basePriceCents / 100).toFixed(2)}) + ${LABELS[methodRaw as keyof typeof LABELS]}${quote.extraPageCost > 0 ? ` + extra pages` : ''}`,
          },
          unit_amount: quote.totalCents,
        },
        quantity: 1,
      }],
      metadata: {
        workflow_id: slug,
        mailing_method: methodRaw,
        quote_total_cents: String(quote.totalCents),
        pricing_source: 'canonical',
        quote_snapshot: serializeQuote(quote),
      },
      success_url: `${appUrl}/workflows/${slug}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/workflows/${slug}?checkout=cancelled`,
    })

    return NextResponse.json({ ok: true, sessionId: session.id, url: session.url, totalCents: quote.totalCents })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create checkout session.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
