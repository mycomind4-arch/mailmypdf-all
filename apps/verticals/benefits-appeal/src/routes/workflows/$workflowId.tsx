import { createFileRoute, Link } from '@tanstack/react-router'
import { WORKFLOWS, type WorkflowId } from '@/domain/benefits-workflows'

export const Route = createFileRoute('/workflows/$workflowId')({ component: WorkflowLanding })

function WorkflowLanding() {
  const { workflowId } = Route.useParams()
  const workflow = WORKFLOWS.find(w => w.id === workflowId as WorkflowId)
  if (!workflow) return <main className='container section'><h1>Workflow not found</h1><Link to='/workflows'>Back to workflows</Link></main>

  return <main className='container section'><div className='eyebrow'>{workflow.family} · {workflow.risk} risk</div><h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 'clamp(48px,7vw,76px)', lineHeight: 1.02 }}>{workflow.name}</h1><p className='muted' style={{ maxWidth: 780, fontSize: 19, lineHeight: 1.7 }}>{workflow.description}</p><div className='card' style={{ padding: 28, marginTop: 28 }}><h2 style={{ marginTop: 0 }}>This workflow produces</h2><ul>{workflow.outputs.map(item => <li key={item} style={{ margin: '10px 0', color: '#cbd5e1' }}>{item}</li>)}</ul><p className='muted' style={{ marginTop: 22, lineHeight: 1.6 }}>The landing page is public. Your intake, source documents, analysis, draft, and mailing record are private.</p><Link className='btn btn-primary' style={{ marginTop: 10 }} to='/workflows/$workflowId/start' params={{ workflowId }}>Start this workflow →</Link></div><div className='section-tight'><Link to='/workflows'>← Back to Workflow Hub</Link></div></main>
}
