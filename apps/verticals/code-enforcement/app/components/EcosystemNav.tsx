'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const ECOSYSTEM_PRODUCTS = [
  { name: 'MailMyPDF', href: 'https://mailmypdf.pages.dev', description: 'Core document and letter mailing workflows', category: 'Core', status: 'live' as const },
  { name: 'Notice Respond', href: 'https://notice-respond.pages.dev', description: 'Official notices, agency actions, and formal responses', category: 'Government / Official', status: 'live' as const },
  { name: 'Immigration Mail', href: 'https://immigration-mail.pages.dev', description: 'Immigration notices, evidence packages, and explanation letters', category: 'Immigration', status: 'live' as const },
  { name: 'Appeal Mail', href: 'https://appeal-mail.pages.dev', description: 'Appeals, reconsiderations, denials, and adverse decisions', category: 'Appeals / Claims', status: 'live' as const },
  { name: 'Dispute Mail', href: 'https://dispute-mail.pages.dev', description: 'Debt, credit, billing, collections, and consumer disputes', category: 'Disputes', status: 'live' as const },
  { name: 'Private Office', href: 'https://mycomind4-arch-mailmypdf-private-office.pages.dev', description: 'Professional correspondence, provably delivered', category: 'Private Office', status: 'live' as const },
  { name: 'Code Enforcement', href: '/', description: 'Code enforcement notice analysis and response preparation', category: 'Regulatory / Permit', status: 'live' as const },
  { name: 'Records Requests', href: 'https://records-requests.pages.dev', description: 'Records and public-information request workflows', category: 'Records / Information', status: 'live' as const },
  { name: 'Insurance Claims', href: 'https://insurance-claims.pages.dev', description: 'Evidence-first insurance claim and denial workflows', category: 'Appeals / Claims', status: 'live' as const },
  { name: 'Small Business', href: 'https://mycomind4-arch-mailmypdf-smallbusiness.pages.dev', description: 'Business correspondence, reminders, demands, and compliance', category: 'Business', status: 'live' as const },
]

export const MAILMYPDF_HOME = 'https://mailmypdf.pages.dev'
export const ECOSYSTEM_PAGE_URL = `${MAILMYPDF_HOME}/products`

export default function EcosystemNav() {
  const pathname = usePathname()
  if (pathname.startsWith('/dashboard')) return null

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'color-mix(in srgb, var(--mmp-paper) 94%, transparent)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--mmp-border)' }}>
      <div className="mmp-container" style={{ minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'baseline', gap: 8, textDecoration: 'none', color: 'var(--mmp-ink)' }}>
          <span style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 24, fontWeight: 400 }}>Code Enforcement</span>
          <span style={{ color: 'var(--mmp-accent)', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>MailMyPDF</span>
        </Link>

        <nav aria-label="Main navigation" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 17, flexWrap: 'wrap' }}>
          <a href={`${MAILMYPDF_HOME}/start`} style={navLinkStyle}>Mail a PDF</a>
          <details style={{ position: 'relative' }}>
            <summary style={{ ...navLinkStyle, cursor: 'pointer', listStyle: 'none' }}>Products ▾</summary>
            <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 330, padding: 8, border: '1px solid var(--mmp-border)', borderRadius: 'var(--mmp-radius-lg)', background: 'var(--mmp-surface)', boxShadow: 'var(--mmp-shadow-lg)' }}>
              {ECOSYSTEM_PRODUCTS.map(product => (
                <a key={product.name} href={product.href} style={{ display: 'block', padding: '9px 11px', borderRadius: 8, textDecoration: 'none' }}>
                  <span style={{ display: 'block', color: 'var(--mmp-ink)', fontSize: 13, fontWeight: 650 }}>{product.name}{product.name === 'Code Enforcement' ? ' · current' : ''}</span>
                  <span style={{ display: 'block', marginTop: 2, color: 'var(--mmp-ink-muted)', fontSize: 11, lineHeight: 1.45 }}>{product.description}</span>
                </a>
              ))}
              <a href={ECOSYSTEM_PAGE_URL} style={{ display: 'block', marginTop: 4, padding: '10px 11px 6px', borderTop: '1px solid var(--mmp-border)', color: 'var(--mmp-accent)', fontSize: 12, fontWeight: 650, textDecoration: 'none' }}>Explore all products →</a>
            </div>
          </details>
          <Link href="/workflows" style={navLinkStyle}>Workflows</Link>
          <Link href="/how-it-works" style={navLinkStyle}>How It Works</Link>
          <Link href="/pricing" style={navLinkStyle}>Pricing</Link>
          <Link href="/dashboard" style={navLinkStyle}>Workspace</Link>
          <Link href="/start" className="mmp-button-primary" style={{ minHeight: 38, padding: '.5rem .8rem' }}>Start a Matter</Link>
        </nav>
      </div>
    </header>
  )
}

const navLinkStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 550,
  color: 'var(--mmp-ink-muted)',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}
