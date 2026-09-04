import { useState, useEffect, useRef } from 'react'

/* ── Ecosystem Product Registry (canonical) ───────────────────────────── */

export interface EcosystemProduct {
  name: string
  slug: string
  href: string
  description: string
  category: string
  status: 'live' | 'planned'
}

export const ECOSYSTEM_PRODUCTS: EcosystemProduct[] = [
  { name: 'MailMyPDF', slug: 'mailmypdf', href: 'https://mailmypdf.pages.dev', description: 'Core document and letter mailing workflows', category: 'Core', status: 'live' },
  { name: 'Notice Respond', slug: 'notice-respond', href: 'https://notice-respond.pages.dev', description: 'Official notices, agency actions, and formal responses', category: 'Government / Official', status: 'live' },
  { name: 'Immigration Mail', slug: 'immigration-mail', href: 'https://immigration-mail.pages.dev', description: 'Immigration notices, evidence packages, and explanation letters', category: 'Immigration', status: 'live' },
  { name: 'Appeal Mail', slug: 'appeal-mail', href: 'https://mycomind4-arch-appeal-mail.pages.dev', description: 'Appeals, reconsiderations, denials, and adverse decisions', category: 'Appeals / Claims', status: 'live' },
  { name: 'Dispute Mail', slug: 'dispute-mail', href: 'https://dispute-mail.pages.dev', description: 'Debt, credit, billing, collections, and consumer disputes', category: 'Disputes', status: 'live' },
  { name: 'Tenant Reply', slug: 'tenant-reply', href: 'https://tenant-reply.pages.dev', description: 'Tenant notices, repair correspondence, and housing responses', category: 'Housing', status: 'live' },
  { name: 'Benefits Appeal', slug: 'benefits-appeal', href: 'https://benefits-appeal.pages.dev', description: 'Benefits denials, reconsideration, and review preparation', category: 'Appeals / Claims', status: 'planned' },
  { name: 'Claim Proof', slug: 'claim-proof', href: 'https://claim-proof.pages.dev', description: 'Evidence-first claim documentation and proof packages', category: 'Appeals / Claims', status: 'live' },
  { name: 'Records Request', slug: 'records-request', href: 'https://records-requests.pages.dev', description: 'Records and public-information request workflows', category: 'Records / Information', status: 'live' },
  { name: 'Permit Reply', slug: 'permit-reply', href: 'https://permit-reply.pages.dev', description: 'Permit, licensing, and regulatory response workflows', category: 'Regulatory / Permit / Rights', status: 'live' },
  { name: 'Small Business Mail', slug: 'small-business-mail', href: 'https://mycomind4-arch-mailmypdf-smallbusiness.pages.dev', description: 'Business correspondence, reminders, demands, and compliance', category: 'Business', status: 'planned' },
  { name: 'Private Office', slug: 'private-office', href: 'https://mycomind4-arch-mailmypdf-private-office.pages.dev', description: 'Professional correspondence, provably delivered', category: 'Private Office', status: 'live' },
]

/* ── Ecosystem Nav (for standalone landing pages) ──────────────────────── */

export function EcosystemNav({ currentSlug, brand, anchorLinks }: { 
  currentSlug: string
  brand: string
  anchorLinks: { href: string; label: string }[]
}) {
  const [scrolled, setScrolled] = useState(false)
  const [productsOpen, setProductsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProductsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Group products by category
  const categories = Array.from(new Set(ECOSYSTEM_PRODUCTS.map(p => p.category)))

  return (
    <header className={`sticky top-0 z-50 border-b transition-colors ${scrolled ? 'border-rule/60 bg-paper/95 backdrop-blur-sm' : 'border-transparent bg-paper'}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        {/* Brand */}
        <a href="/" className="flex items-center gap-2.5">
          <span className="postmark">{brand}</span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-5 md:flex">
          {/* Products Dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setProductsOpen(!productsOpen)}
              className="flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-stamp"
            >
              Products
              <svg className={`h-3.5 w-3.5 transition-transform ${productsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {productsOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 rounded-lg border border-rule/60 bg-paper shadow-lg">
                <div className="p-2">
                  <div className="px-3 py-2 text-xs uppercase tracking-widest text-muted-foreground border-b border-rule/40 mb-1">
                    All MailMyPDF Products
                  </div>
                  {categories.map(cat => (
                    <div key={cat} className="mb-1">
                      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">{cat}</div>
                      {ECOSYSTEM_PRODUCTS.filter(p => p.category === cat).map(p => (
                        <a
                          key={p.slug}
                          href={p.href}
                          className={`flex items-start gap-2 rounded-md px-3 py-2 transition-colors hover:bg-rule/10 ${p.slug === currentSlug ? 'bg-rule/5' : ''}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-ink">{p.name}</span>
                              {p.slug === currentSlug && <span className="text-[9px] uppercase tracking-wider text-stamp">you are here</span>}
                              {p.status === 'planned' && <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50">soon</span>}
                            </div>
                            <div className="text-xs text-muted-foreground">{p.description}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Anchor links */}
          {anchorLinks.map(link => (
            <a key={link.href} href={link.href} className="text-sm text-ink-soft transition-colors hover:text-stamp">{link.label}</a>
          ))}

          {/* External links */}
          <a href="https://notice-respond.pages.dev/workflows" className="text-sm text-ink-soft transition-colors hover:text-stamp">Workflows</a>
          <a href="https://mailmypdf.pages.dev/pricing" className="text-sm text-ink-soft transition-colors hover:text-stamp">Pricing</a>
        </nav>

        {/* CTA */}
        <a href="#start" className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">
          Start a response
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
        </a>

        {/* Mobile toggle */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md border border-rule md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t border-rule/60 bg-paper px-4 py-4 md:hidden">
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Products</div>
            {ECOSYSTEM_PRODUCTS.map(p => (
              <a key={p.slug} href={p.href} className={`block text-sm ${p.slug === currentSlug ? 'font-medium text-stamp' : 'text-ink-soft'}`}>
                {p.name} {p.status === 'planned' && <span className="text-[10px] text-muted-foreground/50">soon</span>}
              </a>
            ))}
            <div className="border-t border-rule/40 pt-3">
              {anchorLinks.map(link => (
                <a key={link.href} href={link.href} className="block py-1 text-sm text-ink-soft">{link.label}</a>
              ))}
              <a href="https://notice-respond.pages.dev/workflows" className="block py-1 text-sm text-ink-soft">Workflows</a>
              <a href="https://mailmypdf.pages.dev/pricing" className="block py-1 text-sm text-ink-soft">Pricing</a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
