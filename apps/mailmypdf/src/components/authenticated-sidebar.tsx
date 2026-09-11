import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  CircleHelp,
  Crown,
  FileSearch2,
  FileText,
  FolderOpen,
  Globe2,
  Home,
  LogOut,
  Mail,
  Map,
  Menu,
  Scale,
  Settings,
  ShieldAlert,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type SidebarUser = {
  email?: string | null;
  fullName?: string;
  user_metadata?: Record<string, unknown>;
};

type SidebarItem = {
  label: string;
  href: string;
  icon: typeof Home;
  accent?: string;
  exact?: boolean;
};

const primaryItems: SidebarItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home, exact: true },
  { label: "My Mail", href: "/dashboard/orders", icon: FolderOpen },
  { label: "Workflows", href: "/ecosystem", icon: Workflow },
  { label: "Mail a PDF", href: "/mail-a-pdf", icon: Mail },
];

const productItems: SidebarItem[] = [
  { label: "Notice Respond", href: "/notice-respond", icon: FileText, accent: "text-rose-400" },
  { label: "Appeal Mail", href: "/appeal-mail", icon: Scale, accent: "text-amber-400" },
  { label: "Immigration Mail", href: "/immigration-mail", icon: Globe2, accent: "text-sky-400" },
  { label: "Dispute Mail", href: "/dispute-mail", icon: ShieldAlert, accent: "text-pink-400" },
  { label: "Records Requests", href: "/records-request", icon: FileSearch2, accent: "text-emerald-400" },
  { label: "Code Enforcement", href: "/code-enforcement", icon: Building2, accent: "text-blue-300" },
  { label: "Private Office", href: "/private-office", icon: Crown, accent: "text-yellow-300" },
  { label: "Small Business", href: "/small-business", icon: BriefcaseBusiness, accent: "text-indigo-300" },
  { label: "Fair Process", href: "/fair-process", icon: Map, accent: "text-teal-300" },
];

function isActivePath(pathname: string, item: SidebarItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function SidebarNavItem({
  item,
  pathname,
  onNavigate,
}: {
  item: SidebarItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActivePath(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-all duration-150 ${
        active
          ? "bg-blue-500/20 text-white shadow-[inset_2px_0_0_rgba(96,165,250,.95)]"
          : "text-slate-300 hover:bg-white/[0.055] hover:text-white"
      }`}
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center ${item.accent ?? (active ? "text-blue-300" : "text-slate-400 group-hover:text-slate-200")}`}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      <ChevronRight
        className={`h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 ${
          active ? "text-blue-300" : "text-slate-600 group-hover:text-slate-400"
        }`}
        aria-hidden="true"
      />
    </Link>
  );
}

function SidebarContents({
  user,
  onSignOut,
  onNavigate,
}: {
  user: SidebarUser;
  onSignOut: () => void | Promise<void>;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const { displayName, initials } = useMemo(() => {
    const metadataName =
      user.fullName ||
      (typeof user.user_metadata?.fullName === "string"
        ? user.user_metadata.fullName
        : typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : "");
    const fallback = user.email?.split("@")[0] || "Account";
    const name = metadataName.trim() || fallback;
    const parts = name.split(/\s+/).filter(Boolean);
    const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2);
    return { displayName: name, initials: letters.toUpperCase() };
  }, [user.email, user.fullName, user.user_metadata]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pb-4 pt-5">
        <Link to="/" onClick={onNavigate} className="group flex items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.045] shadow-inner">
            <Mail className="h-5 w-5 text-slate-100" strokeWidth={1.7} aria-hidden="true" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#071728] bg-blue-400" />
          </span>
          <span className="min-w-0">
            <span className="block font-serif text-[22px] leading-none text-white">MailMyPDF</span>
            <span className="mt-1.5 block text-[8px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Secure · Simple · Done
            </span>
          </span>
        </Link>
      </div>

      <div className="px-3">
        <Link
          to="/ecosystem"
          onClick={onNavigate}
          className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-blue-400/25 bg-blue-500/15 px-3 py-2.5 text-sm font-medium text-blue-100 transition hover:border-blue-300/40 hover:bg-blue-500/20"
        >
          <Sparkles className="h-4 w-4 text-blue-300" aria-hidden="true" />
          New Matter
          <ArrowUpRight className="h-3.5 w-3.5 text-blue-300" aria-hidden="true" />
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Authenticated navigation">
        <div className="space-y-1">
          {primaryItems.map((item) => (
            <SidebarNavItem key={item.label} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>

        <div className="my-4 border-t border-white/10" />

        <div className="px-3 pb-2 text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          Products
        </div>
        <div className="space-y-1">
          {productItems.map((item) => (
            <SidebarNavItem key={item.label} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>

        <div className="my-4 border-t border-white/10" />

        <div className="space-y-1">
          <SidebarNavItem
            item={{ label: "Help Center", href: "/how-it-works", icon: CircleHelp }}
            pathname={pathname}
            onNavigate={onNavigate}
          />
          <SidebarNavItem
            item={{ label: "Account Settings", href: "/dashboard/settings", icon: Settings }}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-700/55 font-serif text-sm text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{displayName}</div>
            <div className="truncate text-[11px] text-slate-500">{user.email}</div>
          </div>
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AuthenticatedSidebar({
  user,
  onSignOut,
  showMobileControls = true,
}: {
  user: SidebarUser;
  onSignOut: () => void | Promise<void>;
  showMobileControls?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[272px] border-r border-white/10 bg-[#071728] text-white shadow-[18px_0_55px_-32px_rgba(2,12,27,.85)] lg:block">
        <SidebarContents user={user} onSignOut={onSignOut} />
      </aside>

      {showMobileControls && (
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-rule/60 bg-paper/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-rule bg-card text-foreground"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
        <Link to="/" className="font-serif text-lg">MailMyPDF</Link>
        <Link
          to="/ecosystem"
          className="rounded-full bg-cobalt px-3 py-1.5 text-xs font-semibold text-white"
        >
          New Matter
        </Link>
      </div>
      )}

      {showMobileControls && mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,310px)] border-r border-white/10 bg-[#071728] text-white shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-slate-300 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <SidebarContents
              user={user}
              onSignOut={onSignOut}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
}
