'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ECOSYSTEM_PRODUCTS } from '@/app/lib/ecosystem'

const THIS_PRODUCT = 'Insurance Claims'
const MAIL_A_PDF = 'https://mailmypdf.pages.dev/start'

export function SiteNav() {
  const pathname = usePathname()
  const otherProducts = ECOSYSTEM_PRODUCTS.filter(p => p.product !== THIS_PRODUCT)
  if (pathname.startsWith('/dashboard')) return null

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'color-mix(in srgb, var(--mmp-paper) 94%, transparent)',
      backdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--mmp-border)',
    }}>
      <div className="mmp-container" style={{
        minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'baseline', gap: 8, color: 'var(--mmp-ink)', textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 24, fontWeight: 400 }}>Insurance Claims</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--mmp-accent)', letterSpacing: '.12em', textTransform: 'uppercase' }}>MailMyPDF</span>
        </Link>

        <nav aria-label="Main navigation" style={{ display: 'flex', alignItems: 'center', gap: 17, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <a href={MAIL_A_PDF} style={navLinkStyle}>Mail a PDF</a>
          <details style={{ position: 'relative' }}>
            <summary style={{ ...navLinkStyle, cursor: 'pointer', listStyle: 'none' }}>Products ▾</summary>
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 320,
              background: 'var(--mmp-surface)', border: '1px solid var(--mmp-border)', borderRadius: 'var(--mmp-radius-lg)',
              boxShadow: 'var(--mmp-shadow-lg)', padding: 8,
            }}>
              {otherProducts.map(p => (
                <a key={p.product} href={p.href} style={{ display: 'block', padding: '9px 11px', borderRadius: 8, textDecoration: 'none' }}>
                  <span style={{ display: 'block', fontWeight: 650, color: 'var(--mmp-ink)', fontSize: 13 }}>{p.product}</span>
                  <span style={{ display: 'block', color: 'var(--mmp-ink-muted)', fontSize: 11, lineHeight: 1.45, marginTop: 2 }}>{p.description}</span>
                </a>
              ))}
              <a href="https://mailmypdf-etc.pages.dev/products" style={{ display: 'block', borderTop: '1px solid var(--mmp-border)', marginTop: 4, padding: '10px 11px 6px', color: 'var(--mmp-accent)', fontSize: 12, fontWeight: 650, textDecoration: 'none' }}>Explore all products →</a>
            </div>
          </details>
          <Link href="/workflows" style={navLinkStyle}>Workflows</Link>
          <Link href="/how-it-works" style={navLinkStyle}>How It Works</Link>
          <Link href="/pricing" style={navLinkStyle}>Pricing</Link>
          <Link href="/dashboard" style={navLinkStyle}>Dashboard</Link>
          <Link href="/start" className="mmp-button-primary" style={{ minHeight: 38, padding: '.5rem .8rem' }}>Start a Claim</Link>
        </nav>
      </div>
    </header>
  )
}

const navLinkStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--mmp-ink-muted)',
  fontWeight: 550,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}