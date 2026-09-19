import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site-chrome";

/**
 * Internal chrome for the admin control plane. Deliberately carries none of
 * the public marketing nav (Products, How It Works, Pricing, etc.) — admins
 * working the fulfillment queue or AI control plane shouldn't have to wade
 * through unauthenticated marketing copy to get to their tools.
 */
export function AdminHeader() {
  return (
    <header className="border-b border-rule/60 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-serif text-base">MailMyPDF</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Admin</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Admin">
            <Link to="/admin" className="rounded-md px-3 py-1.5 text-sm text-ink-soft transition-colors hover:text-foreground">Dashboard</Link>
            <Link to="/admin/analytics" className="rounded-md px-3 py-1.5 text-sm text-ink-soft transition-colors hover:text-foreground">Analytics</Link>
            <Link to="/admin/ai" className="rounded-md px-3 py-1.5 text-sm text-ink-soft transition-colors hover:text-foreground">AI Control Plane</Link>
          </nav>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
