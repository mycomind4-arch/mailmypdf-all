import { Link } from "@tanstack/react-router";
import { Stamp, Mail } from "lucide-react";
import { workflows } from "@/domain/workflows";
import { ECOSYSTEM_PRODUCTS, ECOSYSTEM_PAGE_URL } from "./ecosystem-nav";

/* ═══════════════════════════════════════════════════════════
   MailMyPDF Ecosystem Footer
   ═══════════════════════════════════════════════════════════

   Reinforces the MailMyPDF parent brand and ecosystem.
   Links to all live product verticals at their production URLs.
   ═══════════════════════════════════════════════════════════ */

export function SiteFooter() {
  const workflowCount = Object.keys(workflows).length;

  // Filter out Benefits Appeal (this product) for the "other products" list
  const otherProducts = ECOSYSTEM_PRODUCTS.filter(p => p.product !== "Benefits Appeal");

  return (
    <footer className="border-t border-rule bg-card">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand column */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--ink)" }}>
                <Stamp size={16} className="text-stamp" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold text-ink" style={{ fontFamily: "var(--font-serif)" }}>Benefits Appeal</span>
                <span className="inline-flex items-center gap-1 mt-0.5">
                  <Mail size={11} className="text-muted-foreground" strokeWidth={2.5} />
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">MailMyPDF</span>
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Understand adverse decisions, organize evidence, build supported appeals, and send with proof of delivery.
            </p>
          </div>

          {/* Products column */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">MailMyPDF Products</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><span className="font-medium text-foreground">Benefits Appeal</span> <span className="text-muted-foreground/60">(this product)</span></li>
              {otherProducts.map((p) => (
                <li key={p.product}>
                  <a href={p.href} className="hover:text-stamp transition-colors">{p.product}</a>
                </li>
              ))}
              <li><a href={ECOSYSTEM_PAGE_URL} className="font-medium text-stamp hover:text-stamp/80 transition-colors">Explore all workflows →</a></li>
            </ul>
          </div>

          {/* Account column */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Account</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/dashboard" className="hover:text-stamp transition-colors">Dashboard</Link></li>
              <li><Link to="/dashboard" className="hover:text-stamp transition-colors">My Cases</Link></li>
              <li><Link to="/dashboard" className="hover:text-stamp transition-colors">Mailings</Link></li>
              <li><Link to="/account" className="hover:text-stamp transition-colors">Settings</Link></li>
              <li><Link to="/auth" className="hover:text-stamp transition-colors">Sign in / Create account</Link></li>
            </ul>
          </div>

          {/* Company column */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Company</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/workflows" className="hover:text-stamp transition-colors">All Appeal Types ({workflowCount})</Link></li>
              <li><Link to="/about" className="hover:text-stamp transition-colors">About</Link></li>
              <li><Link to="/contact" className="hover:text-stamp transition-colors">Contact</Link></li>
              <li><Link to="/privacy" className="hover:text-stamp transition-colors">Privacy</Link></li>
              <li><Link to="/terms" className="hover:text-stamp transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>

        {/* Legal disclaimer */}
        <div className="mt-10 border-t border-rule pt-6">
          <p className="text-xs text-muted-foreground">
            Benefits Appeal is not a law firm and does not provide legal advice. You remain in control of the facts and final document.
            Mailing fulfillment provided by{" "}
            <span className="font-medium text-foreground">MailMyPDF</span>.
          </p>
          <p className="mt-2 text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} MailMyPDF, Inc. Benefits Appeal is a MailMyPDF product.
          </p>
        </div>
      </div>
    </footer>
  );
}
