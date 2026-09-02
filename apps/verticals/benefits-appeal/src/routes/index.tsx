import { createFileRoute, Link } from '@tanstack/react-router'
import { WORKFLOWS } from '@/domain/benefits-workflows'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const featured = WORKFLOWS.slice(0, 6)
  return <main className='container section'><div className='hero-gradient card' style={{ padding: '64px 40px' }}><div className='eyebrow'>Benefits Appeal</div><h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 'clamp(48px,8vw,84px)', lineHeight: 1 }}>{'Appeal the decision.\nBuild the record.'}</h1><p className='muted' style={{ maxWidth: 720, fontSize: 19, lineHeight: 1.7, whiteSpace: 'pre-line' }}>Find the right workflow for a denied benefit, organize your evidence, generate a supported response, review it, and mail it with proof of delivery.</p><Link className='btn btn-primary' style={{ marginTop: 28 }} to='/workflows'>Explore workflows →</Link></div><section className='section-tight'><div className='eyebrow'>Featured workflows</div><div className='grid-workflows' style={{ marginTop: 18 }}>{featured.map(w => <Link key={w.id} className='card' style={{ padding: 22 }} to={`/workflows/${w.id}`}><div className='badge badge-family'>{w.family}</div><h2 style={{ margin: '14px 0 8px', fontSize: 22 }}>{w.name}</h2><p className='muted' style={{ lineHeight: 1.6 }}>{w.description}</p><span style={{ display: 'inline-block', marginTop: 12, color: '#a78bfa', fontWeight: 700 }}>View workflow →</span></Link>)}</div></section></main>
}
