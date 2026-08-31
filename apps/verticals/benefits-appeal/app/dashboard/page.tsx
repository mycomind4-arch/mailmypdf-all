import Link from 'next/link'

export const metadata = {
  title: 'Dashboard — Benefits Appeal',
  description: 'View your appeal cases and their status.',
}

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '2rem', fontWeight: 400 }}>
          Your Appeal Cases
        </h1>
        <Link href="/start" style={{
          display: 'inline-flex', alignItems: 'center', padding: '0.5rem 1.25rem',
          background: '#a78bfa', color: '#0a0f1a', borderRadius: '0.5rem',
          fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none',
        }}>Start New Appeal</Link>
      </div>

      <div style={{
        padding: '2rem', textAlign: 'center',
        background: 'rgba(15,23,42,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '0.625rem',
      }}>
        <p style={{ color: '#64748b', fontSize: '1rem' }}>No appeal cases yet.</p>
        <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          Start by uploading a denial decision.
        </p>
        <Link href="/start" style={{
          display: 'inline-flex', alignItems: 'center', marginTop: '1rem',
          padding: '0.625rem 1.5rem',
          background: '#a78bfa', color: '#0a0f1a',
          borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.9rem',
          textDecoration: 'none',
        }}>Start Your First Appeal</Link>
      </div>
    </div>
  )
}
