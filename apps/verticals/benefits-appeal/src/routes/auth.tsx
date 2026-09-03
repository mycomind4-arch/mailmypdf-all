import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '@/lib/use-auth'

export const Route = createFileRoute('/auth')({ component: AuthPage })

function AuthPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/auth' }) as { returnTo?: string }
  const { signIn, signUp, resetPassword, isConfigured } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setInfo(null); setLoading(true)
    try {
      const result = mode === 'signin' ? await signIn(email, password) : mode === 'signup' ? await signUp(email, password) : await resetPassword(email)
      if (result.error) { setError(result.error); return }
      if (mode === 'reset') { setInfo('Password reset instructions sent.'); return }
      if (mode === 'signup' && result.needsConfirmation) { setInfo('Check your email to confirm your account, then return to sign in.'); return }
      navigate({ to: (search?.returnTo || '/dashboard') as never })
    } finally { setLoading(false) }
  }

  return <main className='container section'><div className='card' style={{ maxWidth: 520, margin: '0 auto', padding: 32 }}><div className='eyebrow'>MailMyPDF Account</div><h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 52 }}>{mode === 'signin' ? 'Welcome back.' : mode === 'signup' ? 'Create your account.' : 'Reset your password.'}</h1>{!isConfigured && <p style={{ color: '#fbbf24' }}>Authentication is not configured for this deployment.</p>}{error && <p style={{ color: '#fca5a5' }}>{error}</p>}{info && <p style={{ color: '#86efac' }}>{info}</p>}<form onSubmit={submit}><label>Email</label><input className='input' type='email' required value={email} onChange={e => setEmail(e.target.value)} />{mode !== 'reset' && <><label style={{ marginTop: 14 }}>Password</label><input className='input' type='password' required value={password} onChange={e => setPassword(e.target.value)} /></>}<button className='btn btn-primary' style={{ marginTop: 18, width: '100%', justifyContent: 'center' }} disabled={loading}>{loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}</button></form><div style={{ marginTop: 20, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 14 }}>{mode !== 'signin' && <button onClick={() => setMode('signin')}>Sign in</button>}{mode !== 'signup' && <button onClick={() => setMode('signup')}>Create account</button>}{mode !== 'reset' && <button onClick={() => setMode('reset')}>Forgot password?</button>}</div><Link style={{ display: 'inline-block', marginTop: 20 }} to='/workflows'>← Back to workflows</Link></div></main>
}
