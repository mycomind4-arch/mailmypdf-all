import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'

export const Route = createFileRoute('/dashboard')({ component: Dashboard })
function Dashboard() {
  const { user, signOut } = useAuth()
  return <main className='container section'><div className='eyebrow'>Private Dashboard</div><h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 62 }}>Your Benefits Appeal work.</h1><p className='muted'>{user?.email}</p><div className='card' style={{ padding: 24, marginTop: 24 }}><h2>Start another workflow</h2><p className='muted'>Choose a workflow from the public hub, then start it after authentication.</p><Link className='btn btn-primary' style={{ marginTop: 14 }} to='/workflows'>Open Workflow Hub →</Link></div><button style={{ marginTop: 20 }} onClick={() => void signOut()}>Sign out</button></main>
}
