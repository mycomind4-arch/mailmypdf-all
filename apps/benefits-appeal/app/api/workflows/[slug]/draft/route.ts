import { NextRequest, NextResponse } from 'next/server'
import { callLLM, getAvailableProviders } from '@/src/platform/llm-service'
import { validateDraft } from '@/src/domain/draft-validator'
import { getBenefitsWorkflowConfig } from '@/src/domain/workflow-engine'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const config = getBenefitsWorkflowConfig(slug)
    if (!config) return NextResponse.json({ error: `Unknown workflow: ${slug}` }, { status: 404 })

    const providers = getAvailableProviders()
    if (providers.length === 0) return NextResponse.json({ error: 'No LLM provider configured.' }, { status: 503 })

    const payload = await req.json() as { analysis?: Record<string, unknown>; extracted?: Record<string, unknown> }
    if (!payload.analysis) return NextResponse.json({ error: 'Analysis results are required.' }, { status: 400 })

    // Draft with Gemini (default)
    const draftResponse = await callLLM(
      [
        { role: 'system', content: config.systemPrompt },
        { role: 'user', content: JSON.stringify({ analysis: payload.analysis, extracted: payload.extracted }) },
      ],
      { provider: 'gemini', temperature: 0.2 },
    )

    // Validate with independent pass (also Gemini by default, but can route to Claude for review)
    const facts = {
      referenceNumber: String(payload.analysis?.referenceNumber || payload.analysis?.claimNumber || payload.analysis?.accountNumber || ''),
      decisionDate: String(payload.analysis?.decisionDate || ''),
      deadline: String(payload.analysis?.deadline || ''),
      amount: String(payload.analysis?.amount || payload.analysis?.amountClaimed || ''),
      issuer: String(payload.analysis?.issuer || payload.analysis?.insurer || payload.analysis?.collector || ''),
      denialReasons: Array.isArray(payload.analysis?.denialReasons) ? payload.analysis.denialReasons as string[] : [],
      keyFacts: Array.isArray(payload.analysis?.keyFacts) ? payload.analysis.keyFacts as string[] : [],
    }

    const validation = validateDraft(draftResponse.text, facts, {
      requiredSections: config.requiredSections,
      forbiddenPhrases: config.forbiddenPhrases,
    })

    return NextResponse.json({
      ok: true,
      draft: draftResponse.text,
      validation,
      provider: draftResponse.provider,
      model: draftResponse.model,
      workflow: slug,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Draft generation failed.'
    return NextResponse.json({ error: message }, { status: message.includes('not configured') ? 503 : 500 })
  }
}
