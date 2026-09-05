import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { callLLM, getAvailableProviders } from '@/platform/llm-service'
import { validateDraft } from '@/domain/draft-validator'
import { getBenefitsWorkflowConfig } from '@/domain/workflow-engine'

export const Route = createFileRoute('/api/workflows/$slug/draft')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = request.headers.get('Authorization'); const token = auth?.startsWith('Bearer ') ? auth.slice(7) : ''
        const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
        if (!token || !url || !anonKey) return new Response(JSON.stringify({ error: 'Authentication is required.' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
        const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }); const authResult = await supabase.auth.getUser(token)
        if (authResult.error || !authResult.data.user) return new Response(JSON.stringify({ error: 'Authentication is required.' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
        const config = getBenefitsWorkflowConfig(params.slug)
        if (!config) return new Response(JSON.stringify({ error: 'Unknown workflow.' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
        if (getAvailableProviders().length === 0) return new Response(JSON.stringify({ error: 'No LLM provider configured.' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
        const payload = await request.json() as { analysis?: Record<string, unknown>; extracted?: Record<string, unknown> }
        if (!payload.analysis) return new Response(JSON.stringify({ error: 'Analysis results are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
        const draftResponse = await callLLM([{ role: 'system', content: config.systemPrompt }, { role: 'user', content: JSON.stringify({ analysis: payload.analysis, extracted: payload.extracted }) }], { provider: 'gemini', temperature: 0.2 })
        const facts = { referenceNumber: String(payload.analysis.referenceNumber || payload.analysis.claimNumber || payload.analysis.accountNumber || ''), decisionDate: String(payload.analysis.decisionDate || ''), deadline: String(payload.analysis.deadline || ''), amount: String(payload.analysis.amount || payload.analysis.amountClaimed || ''), issuer: String(payload.analysis.issuer || payload.analysis.insurer || payload.analysis.collector || ''), denialReasons: Array.isArray(payload.analysis.denialReasons) ? payload.analysis.denialReasons as string[] : [], keyFacts: Array.isArray(payload.analysis.keyFacts) ? payload.analysis.keyFacts as string[] : [] }
        const validation = validateDraft(draftResponse.text, facts, { requiredSections: config.requiredSections, forbiddenPhrases: config.forbiddenPhrases })
        return new Response(JSON.stringify({ ok: true, draft: draftResponse.text, validation, provider: draftResponse.provider, model: draftResponse.model, workflow: params.slug, userId: authResult.data.user.id }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      },
    },
  },
})
