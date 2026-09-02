import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { WORKFLOWS, type WorkflowId } from '@/domain/benefits-workflows'
import { useAuth } from '@/lib/use-auth'

export const Route = createFileRoute('/workflows/$workflowId/start')({ component: WorkflowStart })

function WorkflowStart() {
  const { workflowId } = Route.useParams()
  const workflow = WORKFLOWS.find(w => w.id === workflowId as WorkflowId)
  const { user, accessToken, loading } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!workflow) return <main className='container section'><h1>Workflow not found</h1><Link to='/workflows'>Back to workflows</Link></main>
  if (loading) return <main className='container section'><div className='card' style={{ padding: 28 }}>Checking your MailMyPDF account…</div></main>
  if (!user) return <main className='container section'><div className='card' style={{ padding: 32 }}><div className='eyebrow'>Account required</div><h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 54 }}>Sign in to start {workflow.name}.</h1><p className='muted' style={{ lineHeight: 1.7 }}>The workflow itself is private. Your source documents and case information will be associated with your account.</p><Link className='btn btn-primary' style={{ marginTop: 18 }} to='/auth' search={{ returnTo: `/workflows/${workflow.id}/start` }}>Sign in or create an account →</Link></div></main>

  async function analyze() {
    if (!file || !accessToken) return
    setSubmitting(true); setError(null)
    try {
      const form = new FormData(); form.append('document', file)
      const response = await fetch(`/api/workflows/${encodeURIComponent(workflow.id)}/analyze`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || 'Workflow analysis failed.')
      setAnalysis(data.analysis ?? null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Workflow analysis failed.') } finally { setSubmitting(false) }
  }

  return <main className='container section'><div className='eyebrow'>START WORKFLOW · {workflow.family}</div><h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 58 }}>{workflow.name}</h1><p className='muted' style={{ maxWidth: 760, fontSize: 18, lineHeight: 1.7 }}>You are signed in. Start with the source decision or notice that triggered this workflow.</p><section className='card' style={{ padding: 28, marginTop: 24 }}><h2>Step 1 · Source document</h2><input type='file' accept='application/pdf,image/png,image/jpeg' onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ display: 'block', marginTop: 16 }} /><p className='muted' style={{ fontSize: 13 }}>{file ? `${file.name} selected` : 'PDF, PNG, or JPEG · up to 20 MB'}</p>{error && <div style={{ marginTop: 14, color: '#fca5a5' }}>{error}</div>}<button className='btn btn-primary' onClick={analyze} disabled={submitting || !file} style={{ marginTop: 16 }}>{submitting ? 'Analyzing…' : 'Analyze this document →'}</button></section>{analysis && <section className='card' style={{ padding: 28, marginTop: 16 }}><h2>Analysis complete</h2><div style={{ display: 'grid', gap: 10, marginTop: 16 }}>{(['summary','decisionType','issuer','referenceNumber','decisionDate','deadline','confidence'] as const).map(key => <div key={key} className='stat-card'><div className='eyebrow'>{key}</div><div style={{ marginTop: 6 }}>{String(analysis[key] ?? '—')}</div></div>)}</div><p className='muted' style={{ marginTop: 16, lineHeight: 1.6 }}>The next stage remains attached to <strong>{workflow.id}</strong>; it will not return you to the generic workflow hub.</p></section>}<div style={{ marginTop: 20 }}><Link to='/workflows/$workflowId' params={{ workflowId }}>← Return to workflow landing page</Link></div></main>
}
