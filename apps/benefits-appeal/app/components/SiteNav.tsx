import Link from 'next/link'
import { ECOSYSTEM_PRODUCTS } from '@/app/lib/ecosystem'

const THIS_PRODUCT = 'Benefits Appeal'

export function SiteNav() {
  const otherProducts = ECOSYSTEM_PRODUCTS.filter(p => p.product !== THIS_PRODUCT)
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(6,16,24,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div className="container" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56,
      }}>
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontWeight: 700, fontSize: 15, color: '#f8fafc',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 7,
            background: '#a78bfa', color: '#0a0f1a',
            fontSize: 13, fontWeight: 800, flexShrink: 0,
          }}>B</span>
          <span>Benefits Appeal</span>
          <span style={{fontSize: 10, fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase'}}>MailMyPDF</span>
        </Link>
        <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
          <Link href="/start" style={navLinkStyle}>Start</Link>
          <Link href="/workflows" style={navLinkStyle}>Workflows</Link>
          <Link href="/how-it-works" style={navLinkStyle}>How It Works</Link>
          <Link href="/pricing" style={navLinkStyle}>Pricing</Link>
          <Link href="/dashboard" style={navLinkStyle}>Dashboard</Link>
          <div style={{position: 'relative'}} className="ecosystem-dropdown">
            <span style={{fontSize: 14, color: '#94a3b8', fontWeight: 500, cursor: 'pointer'}}>Ecosystem ▾</span>
            <div className="ecosystem-menu" style={{
              position: 'absolute', top: '100%', right: 0,
              background: 'rgba(15,23,42,0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: 8, minWidth: 280,
              display: 'none',
            }}>
              {otherProducts.map(p => (
                <a key={p.product} href={p.href} style={{
                  display: 'block', padding: '8px 12px', borderRadius: 8,
                  fontSize: 13, color: '#94a3b8', textDecoration: 'none',
                }}>
                  <span style={{fontWeight: 600, color: '#f8fafc'}}>{p.product}</span>
                  <span style={{display: 'block', fontSize: 11, color: '#64748b'}}>{p.description}</span>
                </a>
              ))}
              <a href="https://mailmypdf-etc.pages.dev/products" style={{
                display: 'block', padding: '8px 12px', borderRadius: 8,
                fontSize: 13, color: '#a78bfa', fontWeight: 600,
              }}>Explore all products →</a>
            </div>
          </div>
          <Link href="/start" style={{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: '0.5rem',
            background: '#a78bfa',
            color: '#0a0f1a',
            padding: '0.375rem 0.875rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}>
            Start an Appeal
          </Link>
        </div>
      </div>
    </nav>
  )
}

const navLinkStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#94a3b8',
  fontWeight: 500,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}
