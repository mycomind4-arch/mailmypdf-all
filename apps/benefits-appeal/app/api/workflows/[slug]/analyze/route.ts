import { NextRequest, NextResponse } from 'next/server'
import { callGeminiWithDocument, getAvailableProviders } from '@/src/platform/llm-service'
import { getBenefitsWorkflowConfig } from '@/src/domain/workflow-engine'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const config = getBenefitsWorkflowConfig(slug)
    if (!config) return NextResponse.json({ error: `Unknown workflow: ${slug}` }, { status: 404 })

    const providers = getAvailableProviders()
    if (providers.length === 0) return NextResponse.json({ error: 'No LLM provider configured. Set GEMINI_API_KEY.' }, { status: 503 })

    const formData = await req.formData()
    const file = formData.get('document')
    if (!(file instanceof File)) return NextResponse.json({ error: 'A source document is required.' }, { status: 400 })
    if (file.size === 0) return NextResponse.json({ error: 'The source document is empty.' }, { status: 400 })
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'Source documents must be 20 MB or smaller.' }, { status: 413 })

    const mediaType = file.type === 'application/pdf' ? 'application/pdf' : file.type === 'image/png' ? 'image/png' : file.type === 'image/jpeg' ? 'image/jpeg' : null
    if (!mediaType) return NextResponse.json({ error: 'Accepts PDF, PNG, and JPEG source documents.' }, { status: 415 })

    const bytes = Buffer.from(await file.arrayBuffer()).toString('base64')
    const analysisPrompt = [
      `You are the document-intelligence analyst for a ${config.workflowName} workflow.`,
      'Analyze the supplied document and return strict JSON only.',
      'Extract only information supported by the document. Never invent facts, dates, amounts, deadlines, or outcomes.',
      'Return this shape:',
      '{"summary":"","decisionType":"","issuer":"","referenceNumber":"","decisionDate":"","deadline":"","denialReasons":[],"keyFacts":[],"issues":[{"issue":"","whyItMatters":"","evidenceNeeded":[]}],"evidenceMentioned":[],"uncertainties":[],"confidence":"high|medium|low"}',
      'Use empty strings or arrays when the document does not provide a value.',
    ].join('\n')

    const text = await callGeminiWithDocument(analysisPrompt, bytes, mediaType)
    if (!text) return NextResponse.json({ error: 'AI analysis returned no content.' }, { status: 502 })

    const analysis = JSON.parse(text)
    return NextResponse.json({ ok: true, analysis, provider: 'gemini', workflow: slug })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed.'
    return NextResponse.json({ error: message }, { status: message.includes('not configured') ? 503 : 500 })
  }
}
