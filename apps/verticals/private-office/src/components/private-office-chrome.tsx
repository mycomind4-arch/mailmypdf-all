import { Link } from "@tanstack/react-router";
import { BriefcaseBusiness, ChevronDown, Plus } from "lucide-react";

export function PrivateOfficeChrome() {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link to="/dashboard" className="flex items-baseline gap-2" aria-label="Private Office dashboard">
          <span className="font-display text-lg text-charcoal">Private Office</span>
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-stone sm:block">
            MailMyPDF
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Private Office">
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-navy bg-navy-bg">
            <BriefcaseBusiness size={15} /> Matters
          </Link>
          <Link to="/workflows" className="rounded-md px-3 py-2 text-sm text-charcoal-soft transition-colors hover:text-navy">
            Workflows
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/workflows"
            className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3.5 py-2 text-xs font-medium text-paper transition-colors hover:bg-navy-deep"
          >
            <Plus size={14} /> New Matter
          </Link>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full border border-rule bg-paper-deep text-xs font-medium text-stone transition-colors hover:bg-muted"
            type="button"
            aria-label="Account menu"
          >
            PO
            <ChevronDown size={12} className="ml-0.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
