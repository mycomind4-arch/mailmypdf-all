import { Link } from "@tanstack/react-router";

/*
 * Enterprise chrome for the Proof-of-Service product surface.
 * Completely separate from MailMyPDF's consumer "warm postal" design.
 * Institutional: deep navy, clean sans-serif, data-forward.
 * No postmark badges, no envelope cards, no stamp accents.
 */

export function EnterpriseHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/proof-of-service" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <EnterpriseLogo />
          <span className="text-base font-semibold tracking-tight text-slate-900">
            Proof of Service
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
          <a href="/proof-of-service#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
          <a href="/proof-of-service#api" className="hover:text-slate-900 transition-colors">API Reference</a>
          <a href="/proof-of-service#verticals" className="hover:text-slate-900 transition-colors">Use Cases</a>
          <a href="/proof-of-service#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
          <Link to="/verify" className="hover:text-slate-900 transition-colors">Verify</Link>
          <Link to="/ecosystem" className="hover:text-slate-900 transition-colors">Ecosystem</Link>
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="mailto:hello@mailmypdf.com?subject=Proof-of-Service%20Enterprise%20Inquiry"
            className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 hover:-translate-y-0.5"
          >
            Contact Sales
          </a>
        </div>
      </div>
    </header>
  );
}

export function EnterpriseFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <EnterpriseLogo />
              <span className="text-sm font-semibold text-slate-900">Proof of Service</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-slate-500">
              Infrastructure for verifiable notice delivery. Document hashing, hash-chained
              custody events, USPS tracking, and public proof bundles — for organizations
              that need to prove compliance.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="/proof-of-service#how-it-works" className="text-slate-600 hover:text-slate-900 transition-colors">How It Works</a></li>
              <li><a href="/proof-of-service#api" className="text-slate-600 hover:text-slate-900 transition-colors">API Reference</a></li>
              <li><a href="/proof-of-service#verticals" className="text-slate-600 hover:text-slate-900 transition-colors">Use Cases</a></li>
              <li><a href="/proof-of-service#pricing" className="text-slate-600 hover:text-slate-900 transition-colors">Pricing</a></li>
              <li><Link to="/verify" className="text-slate-600 hover:text-slate-900 transition-colors">Verification Portal</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ecosystem</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/ecosystem" className="text-slate-600 hover:text-slate-900 transition-colors">Overview</Link></li>
              <li><Link to="/" className="text-slate-600 hover:text-slate-900 transition-colors">MailMyPDF</Link></li>
              <li><Link to="/verify" className="text-slate-600 hover:text-slate-900 transition-colors">Verification Portal</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Legal</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <span className="text-slate-500">
                  Proof-of-Service proves delivery. It does not verify that notice content
                  complies with any statute.
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-400">
          Proof of Service is a product of MailMyPDF, Inc. · Powered by Lob + USPS certified mail
        </div>
      </div>
    </footer>
  );
}

export function EnterpriseLogo() {
  return (
    <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-900">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    </span>
  );
}

/*
 * Prominent compliance disclaimer — used wherever FDCPA or specific
 * statutory requirements are mentioned. Cannot be missed.
 */
export function ComplianceDisclaimer({ vertical }: { vertical?: string }) {
  const label = vertical ? `${vertical} — ` : "";
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4">
      <div className="flex gap-3">
        <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
          <p className="text-sm font-medium text-amber-900">
            {label}Proof-of-Service proves delivery — not compliance.
          </p>
          <p className="mt-1 text-sm text-amber-800">
            This API generates and preserves cryptographic evidence that a notice was sent and
            delivered. It does not verify that your notice content, timing, or format complies
            with any federal or state statute. You are responsible for ensuring your notice
            meets all legal requirements. Consult qualified legal counsel.
          </p>
        </div>
      </div>
    </div>
  );
}
