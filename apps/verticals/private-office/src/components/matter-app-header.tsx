import { Link } from "@tanstack/react-router";
import { Logo } from "./site-header";
import { useAuth } from "@/lib/use-auth";

/**
 * The minimal authenticated-app masthead for matter workflow pages
 * (/matters/$matterId/$step) — distinct from the marketing SiteHeader,
 * matching the design mockups. Studio already sets precedent in this app
 * for a tool page having its own bespoke masthead instead of the shared
 * marketing nav.
 */
export function MatterAppHeader() {
  const { user } = useAuth();
  const initials = (user?.fullName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();
  const displayName = user?.fullName ?? user?.email ?? "";

  return (
    <header className="flex items-center justify-between border-b border-rule bg-paper px-4 py-3 md:px-6">
      <Link to="/" className="flex items-center gap-2">
        <Logo theme="private-office" />
        <span>
          <span className="block text-base leading-tight text-charcoal" style={{ fontFamily: "var(--font-serif)" }}>
            Private Office
          </span>
          <span className="block text-[10px] uppercase tracking-widest text-stone-light">A MailMyPDF Product</span>
        </span>
      </Link>
      <nav className="flex items-center gap-5 text-sm text-stone">
        {/* No dedicated /matters list page exists yet — routes to the
            dashboard until one is built. */}
        <Link to="/dashboard" className="hover:text-charcoal">
          My Matters
        </Link>
        <a href="mailto:support@mailmypdf.com" className="hover:text-charcoal">
          Help
        </a>
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
