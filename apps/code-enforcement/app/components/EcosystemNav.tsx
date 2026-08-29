import Link from 'next/link'

export const ECOSYSTEM_PRODUCTS = [
  { name: 'MailMyPDF', href: 'https://mailmypdf-etc.pages.dev', description: 'Core document and letter mailing workflows', category: 'Core', status: 'live' as const },
  { name: 'Notice Respond', href: 'https://notice-respond.pages.dev', description: 'Official notices, agency actions, and formal responses', category: 'Government / Official', status: 'live' as const },
  { name: 'Immigration Mail', href: 'https://immigration-mail.pages.dev', description: 'Immigration notices, evidence packages, and explanation letters', category: 'Immigration', status: 'live' as const },
  { name: 'Appeal Mail', href: 'https://appeal-mail.pages.dev', description: 'Appeals, reconsiderations, denials, and adverse decisions', category: 'Appeals / Claims', status: 'live' as const },
  { name: 'Dispute Mail', href: 'https://dispute-mail.pages.dev', description: 'Debt, credit, billing, collections, and consumer disputes', category: 'Disputes', status: 'live' as const },
  { name: 'Private Office', href: 'https://mycomind4-arch-mailmypdf-private-office.pages.dev', description: 'Professional correspondence, provably delivered', category: 'Private Office', status: 'live' as const },
  { name: 'Code Enforcement', href: 'https://mycomind4-arch-code-enforcement.pages.dev', description: 'Code enforcement notice analysis and response preparation', category: 'Regulatory / Permit', status: 'live' as const },
  { name: 'Benefits Appeal', href: 'https://benefits-appeal.pages.dev', description: 'Benefits denials, reconsideration, and review preparation', category: 'Appeals / Claims', status: 'planned' as const },
  { name: 'Records Request', href: 'https://mailmypdf-etc.pages.dev/records-request', description: 'Records and public-information request workflows', category: 'Records / Information', status: 'planned' as const },
  { name: 'Small Business Mail', href: 'https://mycomind4-arch-mailmypdf-smallbusiness.pages.dev', description: 'Business correspondence, reminders, demands, and compliance', category: 'Business', status: 'planned' as const },
]

export const MAILMYPDF_HOME = 'https://mailmypdf-etc.pages.dev'
export const ECOSYSTEM_PAGE_URL = 'https://mailmypdf-etc.pages.dev/products'

export default function EcosystemNav() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(250, 248, 245, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--rule, #e4e7ec)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
          padding: '0 1.5rem',
        }}
      >
        {/* Brand */}
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 7,
              background: 'oklch(0.45 0.14 255)',
              color: 'white',
              fontSize: 13,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            C
          </span>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'oklch(0.26 0.035 255)' }}>
            Code Enforcement
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 500,
              color: 'oklch(0.44 0.03 255)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            MailMyPDF
          </span>
        </Link>

        {/* Nav */}
        <nav
          style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}
          aria-label="Main navigation"
        >
          <a href={MAILMYPDF_HOME} style={navLinkStyle}>Mail a PDF</a>

          {/* Products dropdown — CSS-only, no event handlers */}
          <details style={{ position: 'relative' }}>
            <summary style={{ ...navLinkStyle, cursor: 'pointer', listStyle: 'none' }}>
              Products <span aria-hidden>▾</span>
            </summary>
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                minWidth: 320,
                background: 'white',
                border: '1px solid var(--rule, #e4e7ec)',
                borderRadius: '0.625rem',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                padding: '0.5rem',
                marginTop: '0.5rem',
                zIndex: 100,
              }}
            >
              {ECOSYSTEM_PRODUCTS.map((p) => (
                <a
                  key={p.name}
                  href={p.href}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {p.name}
                    {p.name === 'Code Enforcement' && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.625rem', color: 'oklch(0.45 0.14 255)', fontWeight: 500 }}>
                        (current)
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'oklch(0.44 0.03 255)' }}>
                    {p.description}
                  </span>
                </a>
              ))}
              <a
                href={ECOSYSTEM_PAGE_URL}
                style={{
                  display: 'block',
                  padding: '0.5rem 0.75rem',
                  marginTop: '0.25rem',
                  borderTop: '1px solid var(--rule, #e4e7ec)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: 'oklch(0.45 0.14 255)',
                  textDecoration: 'none',
                }}
              >
                Explore all products →
              </a>
            </div>
          </details>

          <Link href="/workflows" style={navLinkStyle}>Workflows</Link>
          <Link href="/how-it-works" style={navLinkStyle}>How It Works</Link>
          <Link href="/pricing" style={navLinkStyle}>Pricing</Link>
          <Link href="/dashboard" style={navLinkStyle}>Dashboard</Link>
          <Link
            href="/start"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '0.5rem',
              background: 'oklch(0.26 0.035 255)',
              color: 'oklch(0.975 0.008 85)',
              padding: '0.375rem 0.875rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Start Now
          </Link>
        </nav>
      </div>
    </header>
  )
}

const navLinkStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 500,
  color: 'oklch(0.44 0.03 255)',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}
