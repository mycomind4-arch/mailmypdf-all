import { Link } from "@tanstack/react-router";
import { Logo } from "./site-header";
import { useAuth } from "@/lib/auth";

/**
 * The minimal authenticated-app masthead for matter workflow pages
 * (/matters/$matterId/$step) — distinct from the marketing SiteHeader,
 * following Private Office's precedent
 * (src/components/matter-app-header.tsx) for a tool page having its own
 * bespoke masthead instead of the shared marketing nav.
 */
export function MatterAppHeader() {
  const { user } = useAuth();
  const initials = (user?.fullName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();
  const displayName = user?.fullName ?? user?.email ?? "";

  return (
    <header className="flex items-center justify-between border-b border-rule bg-paper px-4 py-3 md:px-6">
      <Link to="/" className="flex items-center gap-2">
        <Logo />
        <span>
          <span className="block text-base leading-tight text-charcoal" style={{ fontFamily: "var(--font-serif)" }}>
            Appeal Mail
          </span>
          <span className="block text-[10px] uppercase tracking-widest text-stone-light">A MailMyPDF Product</span>
        </span>
      </Link>
      <nav className="flex items-center gap-5 text-sm text-stone">
        {/* No dedicated /matters list page exists yet — routes to the
            dashboard until one is built. */}
        <Link to="/dashboard" className="hover:text-charcoal">
          My Appeals
        </Link>
        <Link to="/contact" className="hover:text-charcoal">
          Help
        </Link>
        {user && (
          <span className="flex items-center gap-2 border-l border-rule pl-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-xs font-semibold text-paper">
              {initials}
            </span>
            <span className="text-charcoal">{displayName}</span>
          </span>
        )}
      </nav>
    </header>
  );
}
