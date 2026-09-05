'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ECOSYSTEM_PAGE_URL, ECOSYSTEM_PRODUCTS, MAILMYPDF_HOME } from '../lib/ecosystem'

export default function EcosystemNav() {
  const pathname = usePathname()
  if (pathname.startsWith('/dashboard')) return null

  return (
    <header className="ecosystemNav">
      <div className="ecosystemNav__inner">
        <Link href="/" className="ecosystemNav__brand" aria-label="Records Requests home">
          <span className="ecosystemNav__mark" aria-hidden="true"><span /></span>
          <span className="ecosystemNav__wordmark">Records Requests</span>
        </Link>

        <nav className="ecosystemNav__links" aria-label="Main navigation">
          <a href={MAILMYPDF_HOME} className="ecosystemNav__link">Mail a PDF</a>
          <details className="ecosystemNav__products">
            <summary className="ecosystemNav__link">Products <span aria-hidden="true">⌄</span></summary>
            <div className="ecosystemNav__menu">
              {ECOSYSTEM_PRODUCTS.map((product) => (
                <a key={product.name} href={product.href} className="ecosystemNav__menuItem">
                  <span>{product.name}</span>
                  <small>{product.description}</small>
                </a>
              ))}
              <a href={ECOSYSTEM_PAGE_URL} className="ecosystemNav__menuAll">Explore all products →</a>
            </div>
          </details>
          <Link href="/workflows" className="ecosystemNav__link">Workflows</Link>
          <Link href="/#how" className="ecosystemNav__link">How It Works</Link>
          <a href="https://mailmypdf-etc.pages.dev/pricing" className="ecosystemNav__link">Pricing</a>
          <Link href="/dashboard" className="ecosystemNav__link">Sign In</Link>
          <Link href="/dashboard" className="ecosystemNav__cta">Start Now</Link>
        </nav>
      </div>
    </header>
  )
}