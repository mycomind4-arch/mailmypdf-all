import { Link } from "@tanstack/react-router";
import { Logo } from "./site-header";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-rule/60 sm:mt-24">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 sm:gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="font-serif text-lg">Immigration Mail</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Prepare, review, and mail important immigration correspondence with confidence.
              Guided workflows with physical mail, tracking, and proof of delivery.
            </p>
            <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">A MailMyPDF product</p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Product</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/workflows" className="text-ink-soft hover:text-brass transition-colors">Workflows</Link></li>
              <li><Link to="/workflows/respond-to-notice" className="text-ink-soft hover:text-brass transition-colors">Respond to a Notice</Link></li>
              <li><Link to="/workflows/supporting-documents" className="text-ink-soft hover:text-brass transition-colors">Supporting Documents</Link></li>
              <li><Link to="/workflows/case-inquiry" className="text-ink-soft hover:text-brass transition-colors">Case Inquiry</Link></li>
              <li><Link to="/pricing" className="text-ink-soft hover:text-brass transition-colors">Pricing</Link></li>
              <li><Link to="/dashboard" className="text-ink-soft hover:text-brass transition-colors">My Mailings</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Company</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/about" className="text-ink-soft hover:text-brass transition-colors">About</Link></li>
              <li><Link to="/faq" className="text-ink-soft hover:text-brass transition-colors">FAQ</Link></li>
              <li><Link to="/contact" className="text-ink-soft hover:text-brass transition-colors">Contact</Link></li>
              <li><Link to="/privacy" className="text-ink-soft hover:text-brass transition-colors">Privacy</Link></li>
              <li><Link to="/terms" className="text-ink-soft hover:text-brass transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="hairline mt-6 pt-6 text-xs text-muted-foreground sm:mt-8">
          Immigration Mail provides document preparation and mailing tools. We do not provide legal advice
          or representation. Users are responsible for reviewing their documents, addresses, deadlines, and
          mailing requirements before submitting an order. Mailing fulfillment provided by MailMyPDF.
        </div>
      </div>
    </footer>
  );
}
