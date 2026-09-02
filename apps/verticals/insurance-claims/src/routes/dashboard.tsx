import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '@/src/lib/auth'
export const Route=createFileRoute('/dashboard')({component:Dash})
function Dash(){const{user,signOut}=useAuth();return <main className="container section"><div className="eyebrow">Private Dashboard</div><h1>Your insurance work.</h1><p className="muted">{user?.email}</p><Link className="btn" to="/workflows/">Start a workflow →</Link><button className="text-btn" onClick={()=>void signOut()}>Sign out</button></main>}
