import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-rule bg-card">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink">
                <ShieldAlert size={16} className="text-stamp" />
              </div>
              <span className="text-base font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>Dispute Mail</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-soft">Prepare and send dispute letters for credit errors, debt validation, and billing issues with confidence.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Product</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              <li><a href="/#how" className="hover:text-stamp">How it works</a></li>
              <li><a href="/#workflows" className="hover:text-stamp">What you can dispute</a></li>
              <li><Link to="/pricing" className="hover:text-stamp">Pricing</Link></li>
              <li><Link to="/dashboard" className="hover:text-stamp">My Mailings</Link></li>
              <li><Link to="/faq" className="hover:text-stamp">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Resources</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              <li><Link to="/resources" className="hover:text-stamp">Guides</Link></li>
              <li><Link to="/about" className="hover:text-stamp">About</Link></li>
              <li><Link to="/contact" className="hover:text-stamp">Contact</Link></li>
              <li><Link to="/privacy" className="hover:text-stamp">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-stamp">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Important</h3>
            <p className="mt-3 text-xs leading-5 text-ink-soft">
              Dispute Mail is not a law firm and does not provide legal advice. Dispute deadlines can be short — note yours immediately.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-rule pt-6 text-xs text-ink-soft md:flex-row md:items-center md:justify-between">
          <span>© 2026 Dispute Mail. Powered by MailMyPDF.</span>
          <span>Information is educational and product-related, not legal advice.</span>
        </div>
      </div>
    </footer>
  );
}
