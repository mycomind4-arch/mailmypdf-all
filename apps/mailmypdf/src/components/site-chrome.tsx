/**
 * Site Chrome — re-exports from the canonical Ecosystem Shell.
 *
 * SiteHeader comes from the shared ecosystem shell.
 * SiteFooter remains here (it has mailmypdf-specific content).
 */
import { EcosystemShell } from "./ecosystem-shell";
import { useShellConfig } from "./ecosystem-shell-config";
import { Link } from "@tanstack/react-router";

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
        <div className="grid gap-8 sm:gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="font-serif text-lg">MailMyPDF</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
              Turn documents into documented action. Prepare, send, track, and prove important
              correspondence.
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
