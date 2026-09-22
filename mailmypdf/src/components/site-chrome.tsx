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

const FOOTER_COLUMNS: { to: string; label: string }[][] = [
  [
    { to: "/products", label: "Products" },
    { to: "/ecosystem", label: "Workflows" },
    { to: "/how-it-works", label: "How It Works" },
  ],
  [
    { to: "/security", label: "Security" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ],
  [
    { to: "/terms", label: "Terms" },
    { to: "/privacy", label: "Privacy" },
    { to: "/retention", label: "Data Retention" },
    { to: "/how-it-works", label: "FAQ" },
  ],
];

export function SiteHeader() {
  const config = useShellConfig();
  return <EcosystemShell config={config} />;
}

export function SiteFooter() {
  return (
    <footer className="border-t border-rule/60 bg-card">
      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-7 sm:px-8 md:grid-cols-[1.6fr_repeat(3,0.8fr)_1.4fr] md:items-start">
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-sans text-[22px] font-bold leading-none tracking-[-0.03em] text-navy">
              mailmy<span className="text-brand">pdf</span>
            </span>
          </Link>
          <p className="mt-2.5 pl-[50px] text-[12px] text-ink-soft">Real Letters. Real Progress.</p>
        </div>
        {FOOTER_COLUMNS.map((column, index) => (
          <ul key={index} className="space-y-1.5 text-[11px]">
            {column.map((link) => (
              <li key={link.label}>
                <a href={link.to} className="text-ink-soft transition-colors hover:text-foreground">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ))}
        <p className="self-end text-[11px] text-ink-soft md:text-right">
          © {new Date().getFullYear()} MailMyPDF. All rights reserved.
        </p>
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
      className="relative inline-flex h-8 w-10 items-center justify-center overflow-hidden rounded-md bg-[#1681ff] shadow-sm"
    >
      <span className="absolute inset-x-1.5 bottom-1.5 h-4 rounded-sm bg-white/95" />
      <span className="absolute inset-x-1.5 top-1.5 h-5 bg-white/90" style={{ clipPath: "polygon(0 0, 100% 0, 50% 62%)" }} />
      <span className="absolute left-2.5 top-1 h-2.5 rounded-[1px] bg-[#e53232] px-0.5 font-sans text-[5px] font-bold leading-3 text-white">PDF</span>
    </span>
  );
}
