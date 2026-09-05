import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { callGeminiWithDocument, getAvailableProviders } from '@/platform/llm-service'
import { getBenefitsWorkflowConfig } from '@/domain/workflow-engine'

export const Route = createFileRoute('/api/workflows/$slug/analyze')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = request.headers.get('Authorization')
        const token = auth?.startsWith('Bearer ') ? auth.slice(7) : ''
        const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
        const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
        if (!token || !url || !anonKey) return new Response(JSON.stringify({ error: 'Authentication is required.' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
        const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
        const authResult = await supabase.auth.getUser(token)
        if (authResult.error || !authResult.data.user) return new Response(JSON.stringify({ error: 'Authentication is required.' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
        const config = getBenefitsWorkflowConfig(params.slug)
        if (!config) return new Response(JSON.stringify({ error: 'Unknown workflow.' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
        if (getAvailableProviders().length === 0) return new Response(JSON.stringify({ error: 'No LLM provider configured.' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
        const form = await request.formData(); const file = form.get('document')
        if (!(file instanceof File) || file.size === 0) return new Response(JSON.stringify({ error: 'A source document is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
        if (file.size > 20 * 1024 * 1024) return new Response(JSON.stringify({ error: 'Source documents must be 20 MB or smaller.' }), { status: 413, headers: { 'Content-Type': 'application/json' } })
        const mediaType = file.type === 'application/pdf' ? 'application/pdf' : file.type === 'image/png' ? 'image/png' : file.type === 'image/jpeg' ? 'image/jpeg' : null
        if (!mediaType) return new Response(JSON.stringify({ error: 'Accepts PDF, PNG, and JPEG source documents.' }), { status: 415, headers: { 'Content-Type': 'application/json' } })
        const bytes = Buffer.from(await file.arrayBuffer()).toString('base64')
        const prompt = [`You are the document-intelligence analyst for a ${config.workflowName} workflow.`, 'Analyze the supplied document and return strict JSON only.', 'Extract only information supported by the document. Never invent facts, dates, amounts, deadlines, or outcomes.', '{"summary":"","decisionType":"","issuer":"","referenceNumber":"","decisionDate":"","deadline":"","denialReasons":[],"keyFacts":[],"issues":[{"issue":"","whyItMatters":"","evidenceNeeded":[]}],"evidenceMentioned":[],"uncertainties":[],"confidence":"high|medium|low"}'].join('\n')
        const text = await callGeminiWithDocument(prompt, bytes, mediaType)
        if (!text) return new Response(JSON.stringify({ error: 'AI analysis returned no content.' }), { status: 502, headers: { 'Content-Type': 'application/json' } })
        return new Response(JSON.stringify({ ok: true, analysis: JSON.parse(text), workflow: params.slug, userId: authResult.data.user.id }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      },
    },
  },
})
