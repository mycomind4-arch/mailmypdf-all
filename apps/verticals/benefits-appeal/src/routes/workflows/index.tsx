import { createFileRoute, Link } from '@tanstack/react-router'
import { WORKFLOWS } from '@/domain/benefits-workflows'

export const Route = createFileRoute('/workflows/')({ component: WorkflowHub })

function WorkflowHub() {
  const families = [...new Set(WORKFLOWS.map(w => w.family))]
  return <main className='container section'><div className='eyebrow'>Workflow Hub</div><h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 64, lineHeight: 1.05, margin: '10px 0 14px' }}>Choose your benefits workflow.</h1><p className='muted' style={{ maxWidth: 760, fontSize: 18, lineHeight: 1.7 }}>Every card leads to a public workflow landing page. Starting the actual workflow requires a MailMyPDF account.</p>{families.map(family => <section key={family} className='section-tight'><h2 style={{ fontSize: 24 }}>{family}</h2><div className='grid-workflows' style={{ marginTop: 16 }}>{WORKFLOWS.filter(w => w.family === family).map(w => <Link key={w.id} to={`/workflows/${w.id}`} className='card' style={{ padding: 20 }}><span className={`badge badge-${w.risk.toLowerCase()}`}>{w.risk} risk</span><h3 style={{ margin: '12px 0 8px' }}>{w.name}</h3><p className='muted' style={{ lineHeight: 1.6, fontSize: 14 }}>{w.description}</p><div style={{ marginTop: 12, color: '#a78bfa', fontWeight: 700 }}>View landing page →</div></Link>)}</div></section>)}</main>
}
