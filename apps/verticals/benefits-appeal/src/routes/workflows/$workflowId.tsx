import { createFileRoute, Link } from '@tanstack/react-router'
import { APPEAL_CATALOG } from '@/domain/appeal-catalog'

export const Route = createFileRoute('/workflows/$workflowId')({ component: WorkflowLanding })

function WorkflowLanding() {
  const { workflowId } = Route.useParams()
  const workflow = APPEAL_CATALOG.find(item => item.slug === workflowId)
  if (!workflow) return <main className='container section'><h1>Workflow not found</h1><Link to='/workflows'>Back to workflows</Link></main>

  return <main className='container section'><div className='eyebrow'>{workflow.category} · {workflow.executable ? 'Available' : 'Coming soon'}</div><h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 'clamp(48px,7vw,76px)', lineHeight: 1.02 }}>{workflow.title}</h1><p className='muted' style={{ maxWidth: 780, fontSize: 19, lineHeight: 1.7 }}>{workflow.longDescription}</p><div className='card' style={{ padding: 28, marginTop: 28 }}><h2 style={{ marginTop: 0 }}>This workflow can address</h2><ul>{workflow.whatAppealAddresses.map(item => <li key={item} style={{ margin: '10px 0', color: '#cbd5e1' }}>{item}</li>)}</ul><p className='muted' style={{ marginTop: 22, lineHeight: 1.6 }}>The landing page is public. Your intake, source documents, analysis, draft, and mailing record are private.</p>{workflow.executable ? <Link className='btn btn-primary' style={{ marginTop: 10 }} to='/workflows/$workflowId/start' params={{ workflowId }}>Start this workflow →</Link> : <div className='muted' style={{ marginTop: 16 }}>This workflow is listed in the catalog but is not yet executable.</div>}</div><div className='section-tight'><Link to='/workflows'>← Back to Workflow Hub</Link></div></main>
}
