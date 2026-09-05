/**
 * MailMyPDF Ecosystem Shell — Canonical Navigation Component
 *
 * This is the SINGLE shared navigation architecture for all MailMyPDF verticals.
 * Each vertical imports this component and passes its config.
 *
 * Public header:    [BRAND] Mail a PDF | Products ▾ | Workflows | How It Works | Pricing | Sign In | Start Now
 * Auth header:      [BRAND] Mail a PDF | Products ▾ | Workflows | Recent ▾ | Dashboard | Start Now | Avatar ▾
 *
 * DO NOT create competing navigation components.
 * DO NOT add vertical-specific global nav labels.
 */

import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, User, FileText, Mail, FolderOpen, LogOut, Clock, ArrowRight } from "lucide-react";


/* ── NavLink: handles both internal and external URLs ───────────────────── */

function isExternal(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function NavLink({ to, className, children, onClick }: { to: string; className?: string; children: ReactNode; onClick?: () => void }) {
  if (isExternal(to)) {
    return <a href={to} className={className} onClick={onClick}>{children}</a>;
  }
  return <Link to={to} className={className} onClick={onClick}>{children}</Link>;
}

/* ── Ecosystem Product Registry ─────────────────────────────────────────── */

export interface EcosystemProduct {
  name: string;
  slug: string;
  href: string;
  description: string;
  category: string;
  status: "live" | "planned";
}

export const ECOSYSTEM_PRODUCTS: EcosystemProduct[] = [
  { name: "MailMyPDF", slug: "mailmypdf", href: "/", description: "Core document and letter mailing workflows", category: "Core", status: "live" },
  { name: "Notice Respond", slug: "notice-respond", href: "/notice-respond", description: "Official notices, agency actions, and formal responses", category: "Government / Official", status: "live" },
  { name: "Code Enforcement", slug: "code-enforcement", href: "/code-enforcement", description: "Notices, inspections, evidence, compliance, hearings, and case records", category: "Government / Official", status: "planned" },
  { name: "Immigration Mail", slug: "immigration-mail", href: "/immigration-mail", description: "Immigration notices, evidence packages, records requests, and explanation letters", category: "Immigration", status: "live" },
  { name: "Appeal Mail", slug: "appeal-mail", href: "/appeal-mail", description: "Appeals, reconsiderations, denials, and adverse decisions", category: "Appeals / Claims", status: "live" },
  { name: "Benefits Appeal", slug: "benefits-appeal", href: "/benefits-appeal", description: "Benefits denials, reconsideration, documentation, and review preparation", category: "Appeals / Claims", status: "planned" },
  { name: "Claim Proof", slug: "claim-proof", href: "/claim-proof", description: "Evidence-first claim documentation and proof packages", category: "Appeals / Claims", status: "planned" },
  { name: "Insurance Claims", slug: "insurance-claims", href: "/insurance-claims", description: "Claims, denials, underpayments, evidence, supplements, and appeals", category: "Appeals / Claims", status: "planned" },
  { name: "Dispute Mail", slug: "dispute-mail", href: "/dispute-mail", description: "Debt, credit, billing, collections, and consumer disputes", category: "Disputes", status: "live" },
  { name: "Tenant Reply", slug: "tenant-reply", href: "/tenant-reply", description: "Tenant notices, repair correspondence, deposits, and housing responses", category: "Housing", status: "planned" },
  { name: "Records Requests", slug: "records-request", href: "/records-request", description: "FOIA, public-records, and agency-record request workflows", category: "Records / Information", status: "planned" },
  { name: "Permit Reply", slug: "permit-reply", href: "/permit-reply", description: "Permit, licensing, inspection, and regulatory response workflows", category: "Regulatory / Permit / Rights", status: "planned" },
  { name: "Small Business", slug: "small-business", href: "/small-business", description: "Business correspondence, reminders, demands, renewals, and compliance", category: "Business", status: "planned" },
  { name: "Private Office", slug: "private-office", href: "/private-office", description: "Controlled high-stakes correspondence and document records", category: "Private Office", status: "live" },
];

export const ECOSYSTEM_PAGE_URL = "/products";

/* ── Shell Config ───────────────────────────────────────────────────────── */

export interface EcosystemShellConfig {
  brand: string;
  brandTagline: string;
  /** URL for "Mail a PDF" link — the core universal function */
  mailPdfUrl: string;
  /** Local routes */
  workflowsUrl: string;
  howItWorksUrl: string;
  pricingUrl: string;
  authUrl: string;
  startUrl: string;
  dashboardUrl: string;
  /** Products page (local catalog) */
  productsUrl: string;
  /** The slug of THIS vertical in ECOSYSTEM_PRODUCTS (to highlight/dim in dropdown) */
  currentProductSlug: string;
  /** "Cases" or "Matters" — Private Office uses "Matters" */
  caseTerm: "Cases" | "Matters";
  /** Optional: custom CTA label. Defaults to "Start Now" */
  ctaLabel?: string;
  /** Optional: visual theme */
  theme?: "default" | "private-office";
  /** Optional: transparent header (for hero pages) */
  transparent?: boolean;
  /** Auth hook — passed from the vertical's own auth implementation */
  auth: {
    user: { email: string; fullName?: string; role?: string } | null;
    loading: boolean;
    signOut: () => void | Promise<void>;
  };
}

/* ── Shell Component ─────────────────────────────────────────────────────── */

export function EcosystemShell({
  config,
  children,
}: {
  config: EcosystemShellConfig;
  children?: ReactNode;
}) {
  return (
    <>
      <EcosystemHeader config={config} />
      {children}
    </>
  );
}

/* ── Header ─────────────────────────────────────────────────────────────── */

function EcosystemHeader({ config }: { config: EcosystemShellConfig }) {
  const { auth } = config;
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuth = !auth.loading && !!auth.user;

  return (
    <header className="sticky top-0 z-50 border-b border-rule/60 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <ShellLogo theme={config.theme} />
          <span className="flex flex-col leading-none">
            <span className="font-serif text-lg transition-colors group-hover:text-cobalt">
              {config.brand}
            </span>
            <span className="mt-1 hidden text-[9px] uppercase tracking-[0.2em] text-muted-foreground sm:block">
              {config.brandTagline}
            </span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          <NavLink to={config.mailPdfUrl} className="px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-foreground">
            Mail a PDF
          </NavLink>
          <ProductsDropdown config={config} />
          <NavLink to={config.workflowsUrl} className="px-3 py-2 text-sm text-ink-soft transition-colors hover:text-foreground">
            Workflows
          </NavLink>
          <NavLink to={config.howItWorksUrl} className="px-3 py-2 text-sm text-ink-soft transition-colors hover:text-foreground">
            How It Works
          </NavLink>
          <NavLink to={config.pricingUrl} className="px-3 py-2 text-sm text-ink-soft transition-colors hover:text-foreground">
            Pricing
          </NavLink>

          {isAuth ? (
            <>
              <RecentDropdown config={config} />
              <NavLink to={config.dashboardUrl} className="px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-foreground">
                Dashboard
              </NavLink>
              <NavLink to={config.startUrl} className="ml-2 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5">
                {config.ctaLabel ?? "Start Now"}
              </NavLink>
              <AvatarMenu config={config} />
            </>
          ) : (
            <>
              <NavLink to={config.authUrl} className="px-3 py-2 text-sm text-ink-soft transition-colors hover:text-foreground">
                Sign In
              </NavLink>
              <NavLink to={config.startUrl} className="ml-2 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5">
                {config.ctaLabel ?? "Start Now"}
              </NavLink>
            </>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md border border-rule md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <MobileNav config={config} onClose={() => setMobileOpen(false)} />
      )}
    </header>
  );
}

/* ── Products Dropdown ───────────────────────────────────────────────────── */

function ProductsDropdown({ config }: { config: EcosystemShellConfig }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const categories = Array.from(new Set(ECOSYSTEM_PRODUCTS.map((p) => p.category)));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-2 text-sm text-ink-soft transition-colors hover:text-foreground"
        aria-expanded={open}
        aria-haspopup="true"
      >
        Products
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-[560px] max-w-[calc(100vw-2rem)]">
          <div className="overflow-hidden rounded-xl border border-rule bg-card shadow-premium">
            <div className="border-b border-rule/60 px-5 py-3">
              <div className="font-serif text-base">MailMyPDF Products</div>
              <p className="mt-0.5 text-xs text-muted-foreground">Explore all MailMyPDF product verticals.</p>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat} className="border-b border-rule/30 last:border-0">
                  <div className="px-5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{cat}</div>
                  {ECOSYSTEM_PRODUCTS.filter((p) => p.category === cat).map((p) => {
                    const isCurrent = p.slug === config.currentProductSlug;
                    return (
                      <a
                        key={p.slug}
                        href={p.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-start gap-2 px-5 py-2.5 transition-colors hover:bg-muted/40 ${isCurrent ? "bg-muted/20" : ""}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm text-foreground">{p.name}</span>
                            {isCurrent && <span className="rounded-full border border-rule px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">Current</span>}
                            {p.status === "planned" && <span className="rounded-full border border-rule px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">Soon</span>}
                          </div>
                          <div className="mt-0.5 text-xs leading-5 text-muted-foreground">{p.description}</div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-rule bg-paper-deep/30 px-5 py-2.5">
              <a
                href={config.productsUrl}
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-cobalt hover:text-cobalt/80"
              >
                View All Products →
              </a>
              <div className="text-[10px] text-muted-foreground">{ECOSYSTEM_PRODUCTS.length} product families</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Recent Dropdown ─────────────────────────────────────────────────────── */

function RecentDropdown({ config }: { config: EcosystemShellConfig }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const recentItems: { label: string; status: string; href: string }[] = [];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-2 text-sm text-ink-soft transition-colors hover:text-foreground"
        aria-expanded={open}
        aria-haspopup="true"
      >
        Recent
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-80 rounded-xl border border-rule bg-card shadow-premium">
          {recentItems.length === 0 ? (
            <div className="px-5 py-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock size={16} />
                <span className="text-sm">No active work yet</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Start a workflow to see your active and recent cases here.</p>
              <NavLink
                to={config.workflowsUrl}
                onClick={() => setOpen(false)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cobalt hover:text-cobalt/80"
              >
                Browse Workflows <ArrowRight size={12} />
              </NavLink>
            </div>
          ) : (
            <>
              <div className="border-b border-rule/60 px-5 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Active Work</div>
              {recentItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className="block px-5 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <div className="text-sm font-medium text-foreground">{item.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{item.status}</div>
                </Link>
              ))}
            </>
          )}
          <div className="border-t border-rule/60 px-5 py-2.5">
            <NavLink
              to={config.dashboardUrl}
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-cobalt hover:text-cobalt/80"
            >
              View All →
            </NavLink>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Avatar / Account Menu ───────────────────────────────────────────────── */

function AvatarMenu({ config }: { config: EcosystemShellConfig }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { auth } = config;

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await auth.signOut();
    navigate({ to: "/" });
  };

  const initials = auth.user?.email?.[0]?.toUpperCase() ?? "?";
  const caseLabel = config.caseTerm === "Matters" ? "Matters" : "Cases / Matters";

  const menuItems = [
    { label: "Dashboard", href: config.dashboardUrl, icon: FolderOpen },
    { label: caseLabel, href: `${config.dashboardUrl}/cases`, icon: FileText },
    { label: "Drafts", href: `${config.dashboardUrl}/drafts`, icon: FileText },
    { label: "Mailings", href: `${config.dashboardUrl}/mailings`, icon: Mail },
  ];

  return (
    <div className="relative ml-1" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-rule bg-paper-deep text-xs font-medium text-ink-soft transition-colors hover:bg-muted/40"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-rule bg-card p-2 shadow-card">
          <div className="border-b border-rule/50 px-3 py-2">
            <p className="truncate text-xs font-medium text-foreground">{auth.user?.email}</p>
          </div>
          {menuItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-muted/50"
            >
              <item.icon size={14} className="text-muted-foreground" />
              {item.label}
            </Link>
          ))}
          <Link
            to="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-muted/50"
          >
            <User size={14} className="text-muted-foreground" />
            Account
          </Link>
          <div className="my-1 border-t border-rule/50" />
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-soft transition-colors hover:bg-muted/50"
          >
            <LogOut size={14} className="text-muted-foreground" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Mobile Nav ──────────────────────────────────────────────────────────── */

function MobileNav({ config, onClose }: { config: EcosystemShellConfig; onClose: () => void }) {
  const { auth } = config;
  const isAuth = !auth.loading && !!auth.user;
  const [productsExpanded, setProductsExpanded] = useState(false);
  const [recentExpanded, setRecentExpanded] = useState(false);

  return (
    <div className="border-t border-rule bg-paper md:hidden">
      <div className="flex flex-col gap-1 px-4 py-3">
        <NavLink to={config.mailPdfUrl} onClick={onClose} className="rounded-md px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-muted/50">
          Mail a PDF
        </NavLink>

        <button
          onClick={() => setProductsExpanded(!productsExpanded)}
          className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-muted/50"
          aria-expanded={productsExpanded}
        >
          Products
          <ChevronDown size={14} className={`transition-transform ${productsExpanded ? "rotate-180" : ""}`} />
        </button>
        {productsExpanded && (
          <div className="ml-3 border-l border-rule/40 pl-3">
            {ECOSYSTEM_PRODUCTS.map((p) => (
              <a
                key={p.slug}
                href={p.href}
                onClick={onClose}
                className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-muted/50"
              >
                {p.name}
                {p.status === "planned" && <span className="ml-1.5 text-[9px] uppercase tracking-wider text-muted-foreground">Soon</span>}
              </a>
            ))}
            <a
              href={config.productsUrl}
              onClick={onClose}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-cobalt hover:text-cobalt/80"
            >
              View All Products →
            </a>
          </div>
        )}

        <NavLink to={config.workflowsUrl} onClick={onClose} className="rounded-md px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-muted/50">
          Workflows
        </NavLink>
        <NavLink to={config.howItWorksUrl} onClick={onClose} className="rounded-md px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-muted/50">
          How It Works
        </NavLink>
        <NavLink to={config.pricingUrl} onClick={onClose} className="rounded-md px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-muted/50">
          Pricing
        </NavLink>

        {isAuth ? (
          <>
            <div className="my-1 border-t border-rule/40" />
            <button
              onClick={() => setRecentExpanded(!recentExpanded)}
              className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-muted/50"
              aria-expanded={recentExpanded}
            >
              Recent
              <ChevronDown size={14} className={`transition-transform ${recentExpanded ? "rotate-180" : ""}`} />
            </button>
            {recentExpanded && (
              <div className="ml-3 border-l border-rule/40 pl-3">
                <p className="px-3 py-2 text-xs text-muted-foreground">No active work yet</p>
              </div>
            )}
            <NavLink to={config.dashboardUrl} onClick={onClose} className="rounded-md px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-muted/50">
              Dashboard
            </NavLink>
            <Link to="/account" onClick={onClose} className="rounded-md px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-muted/50">
              Account
            </Link>
            <button
              onClick={() => { onClose(); void auth.signOut(); }}
              className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-ink-soft hover:bg-muted/50"
            >
              Sign Out
            </button>
          </>
        ) : (
          <NavLink to={config.authUrl} onClick={onClose} className="rounded-md px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-muted/50">
            Sign In
          </NavLink>
        )}

        <NavLink
          to={config.startUrl}
          onClick={onClose}
          className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          {config.ctaLabel ?? "Start Now"}
        </NavLink>
      </div>
    </div>
  );
}

/* ── Shared Logo ─────────────────────────────────────────────────────────── */

export function ShellLogo({ theme }: { theme?: "default" | "private-office" }) {
  return (
    <span
      aria-hidden
      className="relative inline-flex h-8 w-9 items-center justify-center rounded-sm border border-ink/20 bg-paper-deep overflow-hidden"
    >
      <span className="absolute inset-x-1.5 top-1.5 h-[6px] border-b border-ink/30" />
      <span className="absolute right-1 top-1.5 h-2 w-2 rounded-[1px] bg-cobalt" />
      <span className="absolute bottom-1.5 left-1.5 right-1.5 h-px bg-ink/15" />
      <span className="absolute bottom-1 left-1.5 h-1 w-1 rounded-[1px] bg-brass/60" />
    </span>
  );
}
