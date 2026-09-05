/**
 * Site Chrome — re-exports from the canonical Ecosystem Shell.
 *
 * SiteHeader comes from the shared ecosystem shell.
 * SiteFooter remains here (it has mailmypdf-specific content).
 */
import { EcosystemShell } from "./ecosystem-shell";
import { useShellConfig } from "./ecosystem-shell-config";
import { Link } from "@tanstack/react-router";
import { FileCheck2, LockKeyhole, ShieldCheck } from "lucide-react";

const POPULAR_PAGES: { to: string; label: string }[] = [
  { to: "/mail-a-pdf", label: "Mail a PDF" },
  { to: "/send-letter-online", label: "Send a letter online" },
  { to: "/write", label: "Write a letter online" },
  { to: "/templates", label: "Letter templates" },
  { to: "/future-self", label: "Letter to future self" },
  { to: "/send-a-letter-without-a-printer", label: "Send a letter without a printer" },
  { to: "/print-and-mail-pdf-online", label: "Print and mail PDF online" },
  { to: "/send-documents-by-mail-online", label: "Send documents by mail online" },
  { to: "/orders", label: "Find your order" },
];

export function SiteHeader() {
  const config = useShellConfig();
  return <EcosystemShell config={config} />;
}

export function SiteFooter() {
  return (
    <footer className="border-t border-rule/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <SecurityTrustBand />
        <div className="grid gap-8 sm:gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="font-serif text-lg">MailMyPDF</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
              Prepare, send, track, and prove important correspondence with clear controls around
              document access, review, retention, and mailing.
            </p>
          </div>

          {/* Popular */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Popular</div>
            <ul className="mt-3 space-y-2 text-sm">
              {POPULAR_PAGES.map((page) => (
                <li key={page.to}>
                  <Link to={page.to} className="text-ink-soft transition-colors hover:text-foreground">
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Products</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/products" className="text-ink-soft transition-colors hover:text-foreground">All Products</Link></li>
              <li><Link to="/ecosystem" className="text-ink-soft transition-colors hover:text-foreground">Ecosystem</Link></li>
              <li><Link to="/appeal-reply" className="text-ink-soft transition-colors hover:text-foreground">Appeal Mail</Link></li>
              <li><Link to="/notice-response" className="text-ink-soft transition-colors hover:text-foreground">Notice Respond</Link></li>
              <li><Link to="/dispute-mail" className="text-ink-soft transition-colors hover:text-foreground">Dispute Mail</Link></li>
              <li><Link to="/immigration" className="text-ink-soft transition-colors hover:text-foreground">Immigration Mail</Link></li>
              <li><Link to="/private-office" className="text-ink-soft transition-colors hover:text-foreground">Private Office</Link></li>
            </ul>
          </div>

          {/* Mailing */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mailing</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/certified-mail-guide" className="text-ink-soft transition-colors hover:text-foreground">Certified Mail</Link></li>
              <li><Link to="/pro" className="text-ink-soft transition-colors hover:text-foreground">Pricing</Link></li>
              <li><Link to="/how-it-works" className="text-ink-soft transition-colors hover:text-foreground">How It Works</Link></li>
              <li><Link to="/privacy" className="text-ink-soft transition-colors hover:text-foreground">Privacy</Link></li>
              <li><Link to="/retention" className="text-ink-soft transition-colors hover:text-foreground">Data Retention</Link></li>
              <li><Link to="/terms" className="text-ink-soft transition-colors hover:text-foreground">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-rule/40 pt-6 flex flex-col sm:flex-row justify-between gap-4">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} MailMyPDF. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">A MailMyPDF product.</p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Shared trust copy for every public surface. It describes the controls that
 * are enforced by protected workflow runtimes without promising that a
 * legacy or standard mailing has the same case-level analysis path.
 */
export function SecurityTrustBand() {
  return (
    <section className="mb-10 rounded-2xl border border-rule bg-paper-deep/35 p-5 sm:p-6" aria-label="Security commitments">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cobalt/20 bg-card text-cobalt">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Security-first document handling</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Protected workflows keep files owner-scoped, quarantine uploads until scanning clears
              them, record server-side disclosures, and hold mailing until you approve the exact
              packet.
            </p>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-cobalt" aria-hidden="true" /> Owner scoped</div>
          <div className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-cobalt" aria-hidden="true" /> Scan gated</div>
          <div className="flex items-center gap-1.5"><FileCheck2 className="h-3.5 w-3.5 text-cobalt" aria-hidden="true" /> Approval held</div>
        </div>
      </div>
    </section>
  );
}

export function Logo() {
  return (
    <span
      aria-hidden
      className="relative inline-flex h-7 w-9 items-center justify-center overflow-hidden rounded"
    >
      <span className="absolute inset-0 rounded border border-ink/80" />
      <span className="absolute inset-x-1 top-1 h-[6px] border-b border-ink/70" />
      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-[1px] bg-cobalt" />
      <span className="absolute bottom-1.5 left-1 right-1 h-px bg-ink/15" />
      <span className="absolute bottom-1 left-1 h-1 w-1 rounded-[1px] bg-brass/60" />
    </span>
  );
}
