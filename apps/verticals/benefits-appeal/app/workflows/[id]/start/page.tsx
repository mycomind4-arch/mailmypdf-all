import Link from 'next/link'
import { notFound } from 'next/navigation'
import { workflowMap, type WorkflowId } from '@/domain/benefits-workflows'

export default async function WorkflowStartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workflow = workflowMap[id as WorkflowId]
  if (!workflow) notFound()

  return (
    <main className="container" style={{ maxWidth: 860, padding: '4rem 1.5rem 6rem' }}>
      <Link href={`/workflows/${id}`} style={{ color: '#64748b', fontSize: 14 }}>← Back to workflow</Link>
      <div style={{ marginTop: 28 }}>
        <div className="eyebrow">START WORKFLOW</div>
        <h1 style={{ fontSize: 'clamp(34px,6vw,56px)', lineHeight: 1.06, fontWeight: 800, margin: '14px 0 16px' }}>{workflow.name}</h1>
        <p style={{ color: '#94a3b8', fontSize: 18, lineHeight: 1.6, maxWidth: 720 }}>{workflow.description}</p>
      </div>

      <section className="card" style={{ marginTop: 32, padding: 28 }}>
        <div className="eyebrow">FIRST STEP</div>
        <h2 style={{ margin: '10px 0 8px', fontSize: 24, fontWeight: 700 }}>Gather the source decision and your supporting records.</h2>
        <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>Begin with the document that triggered this appeal. Keep the exact language, dates, reference numbers, and supporting evidence available for review.</p>
        <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
          {workflow.intake.slice(0, 8).map((item) => <div key={item} style={{ padding: '11px 14px', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10 }}>{item}</div>)}
        </div>
        <div style={{ marginTop: 26, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href={`/workflows/${id}?started=1`} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.85rem 1.35rem', borderRadius: '0.55rem', background: '#a78bfa', color: '#111827', fontWeight: 700, textDecoration: 'none' }}>Begin intake →</Link>
          <Link href={`/workflows/${id}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.85rem 1.35rem', borderRadius: '0.55rem', border: '1px solid rgba(255,255,255,.12)', color: '#e2e8f0', fontWeight: 600, textDecoration: 'none' }}>Review landing page</Link>
        </div>
      </section>
    </main>
  )
}
