import Link from 'next/link'
import { ECOSYSTEM_PRODUCTS, ECOSYSTEM_PAGE_URL, MAILMYPDF_HOME, type EcosystemProduct } from "@/app/lib/ecosystem"

export function EcosystemFooter() {
  return (
    <footer className="ecosystemFooter">
      <div className="ecosystemFooter__inner">
        <div className="ecosystemFooter__brand">
          <strong>MailMyPDF <span>/ Records Requests</span></strong>
          <p>Build precise public-records requests, track agency responses, and audit what you received — all in one evidence-first workspace.</p>
          <p className="ecosystemFooter__parent">A MailMyPDF product</p>
        </div>
        <div className="ecosystemFooter__links">
          <div className="ecosystemFooter__col">
            <h4>Workflows</h4>
            <ul>
              <li><Link href="/workflows/code-enforcement-records">Code Enforcement Records</Link></li>
              <li><Link href="/workflows/police-records">Police Records</Link></li>
              <li><Link href="/workflows/property-records">Property Records</Link></li>
              <li><Link href="/workflows/foia-request">FOIA Request</Link></li>
              <li><Link href="/workflows">Browse all workflows →</Link></li>
            </ul>
          </div>
          <div className="ecosystemFooter__col">
            <h4>Workspace</h4>
            <ul>
              <li><Link href="/dashboard">Dashboard</Link></li>
              <li><a href="/#how">How it works</a></li>
            </ul>
          </div>
          <div className="ecosystemFooter__col">
            <h4>MailMyPDF Ecosystem</h4>
            <ul>
              {ECOSYSTEM_PRODUCTS.map((p: EcosystemProduct) => (
                <li key={p.name}><a href={p.href}>{p.name}</a></li>
              ))}
              <li><a href={ECOSYSTEM_PAGE_URL} className="ecosystemFooter__all">Explore all products →</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="ecosystemFooter__legal">
        <span>© 2026 MailMyPDF.</span>
        <span>Records Requests is not a law firm and does not provide legal advice.</span>
      </div>
    </footer>
  )
}
