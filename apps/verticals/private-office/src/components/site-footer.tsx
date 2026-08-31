import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-rule bg-paper-deep">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 sm:gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr] py-14">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-baseline gap-2">
              <span className="font-display text-xl text-charcoal">Private Office</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">MailMyPDF</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-stone">
              High-stakes correspondence, professionally prepared, provably delivered, and permanently documented. Part of the MailMyPDF ecosystem.
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-stone-light">
              <ShieldCheck size={14} className="text-brass" />
              <span className="font-mono tracking-wide">Private by design</span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-stone">Navigate</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/workflows" className="text-charcoal-soft transition-colors hover:text-navy">Workflows</Link></li>
              <li><Link to="/how-it-works" className="text-charcoal-soft transition-colors hover:text-navy">How It Works</Link></li>
              <li><Link to="/pricing" className="text-charcoal-soft transition-colors hover:text-navy">Pricing</Link></li>
              <li><Link to="/products" className="text-charcoal-soft transition-colors hover:text-navy">All Products</Link></li>
            </ul>
          </div>

          {/* Security */}
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-stone">Trust</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><span className="text-charcoal-soft">Evidence-first</span></li>
              <li><span className="text-charcoal-soft">Human approval</span></li>
              <li><span className="text-charcoal-soft">Proof of delivery</span></li>
              <li><span className="text-charcoal-soft">Owner-scoped matters</span></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-stone">Legal</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href="https://mailmypdf-etc.pages.dev/privacy" className="text-charcoal-soft transition-colors hover:text-navy">Privacy</a></li>
              <li><a href="https://mailmypdf-etc.pages.dev/terms" className="text-charcoal-soft transition-colors hover:text-navy">Terms</a></li>
              <li><a href="https://mailmypdf-etc.pages.dev" className="text-charcoal-soft transition-colors hover:text-navy">MailMyPDF</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-rule/60 py-6">
          <p className="text-xs leading-5 text-stone">
            Private Office is a correspondence and evidence documentation service. It is not a law firm and does not provide legal advice or representation. AI assistance is advisory only — consequential decisions remain under human control. © 2026 MailMyPDF.
          </p>
        </div>
      </div>
    </footer>
  );
}
