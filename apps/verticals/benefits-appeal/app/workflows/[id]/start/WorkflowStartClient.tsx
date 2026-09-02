'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { WorkflowId } from '@/domain/benefits-workflows'

export default function WorkflowStartClient({ id, workflow }: { id: string; workflow: { name: string; family: string; description: string } }) {
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null)

  async function analyze() {
    if (!file) { setError('Choose the decision or notice document first.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('document', file)
      const response = await fetch(`/api/workflows/${encodeURIComponent(id)}/analyze`, { method: 'POST', body: form })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || 'Workflow analysis failed.')
      setAnalysis(data.analysis ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Workflow analysis failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="container" style={{ maxWidth: 860, padding: '4rem 1.5rem 6rem' }}>
      <Link href={`/workflows/${id}`} style={{ color: '#64748b', fontSize: 14 }}>← Back to workflow</Link>
      <div style={{ marginTop: 28 }}>
        <div className="eyebrow">START WORKFLOW · {workflow.family}</div>
        <h1 style={{ fontSize: 'clamp(34px,6vw,56px)', lineHeight: 1.06, fontWeight: 800, margin: '14px 0 16px' }}>{workflow.name}</h1>
        <p style={{ color: '#94a3b8', fontSize: 18, lineHeight: 1.6, maxWidth: 720 }}>{workflow.description}</p>
      </div>

      <section className="card" style={{ marginTop: 32, padding: 28 }}>
        <div className="eyebrow">STEP 1 · SOURCE DOCUMENT</div>
        <h2 style={{ margin: '10px 0 8px', fontSize: 24, fontWeight: 700 }}>Upload the decision or notice that triggered this workflow.</h2>
        <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>The selected workflow remains bound to this intake as the source document is analyzed.</p>
        <div style={{ marginTop: 20, padding: 18, border: '1px dashed rgba(255,255,255,.15)', borderRadius: 12 }}>
          <input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <p style={{ marginTop: 10, fontSize: 13, color: '#64748b' }}>{file ? `${file.name} selected` : 'PDF, PNG, or JPEG · up to 20 MB'}</p>
        </div>
        {error && <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: 'rgba(248,113,113,.08)', color: '#fca5a5' }}>{error}</div>}
        <button onClick={analyze} disabled={submitting || !file} style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', padding: '0.85rem 1.35rem', borderRadius: '0.55rem', background: '#a78bfa', color: '#111827', fontWeight: 700, border: 0, cursor: submitting || !file ? 'not-allowed' : 'pointer', opacity: submitting || !file ? .55 : 1 }}>{submitting ? 'Analyzing…' : 'Analyze this document →'}</button>
      </section>

      {analysis && <section className="card" style={{ marginTop: 18, padding: 28 }}>
        <div className="eyebrow">STEP 2 · WORKFLOW ANALYSIS</div>
        <h2 style={{ margin: '10px 0 16px', fontSize: 24, fontWeight: 700 }}>Analysis complete.</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {(['summary','decisionType','issuer','referenceNumber','decisionDate','deadline','confidence'] as const).map((key) => <div key={key} style={{ padding: 12, border: '1px solid rgba(255,255,255,.08)', borderRadius: 10 }}><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: '#64748b' }}>{key}</div><div style={{ marginTop: 4, color: '#e2e8f0' }}>{String(analysis[key] ?? '—')}</div></div>)}
        </div>
        <p style={{ marginTop: 16, fontSize: 13, color: '#94a3b8' }}>Next, use this same workflow ID for evidence review and drafting.</p>
      </section>}

      <div style={{ marginTop: 20 }}>
        <Link href={`/workflows/${id}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.8rem 1.15rem', borderRadius: '0.55rem', border: '1px solid rgba(255,255,255,.12)', color: '#e2e8f0', fontWeight: 600, textDecoration: 'none' }}>Back to workflow</Link>
      </div>
    </main>
  )
}
