import { Link, useRouterState } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"
import {
  BarChart3,
  Bot,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileClock,
  FolderOpen,
  Home,
  KeyRound,
  LogOut,
  Mail,
  Menu,
  Search,
  Settings,
  Sparkles,
  Workflow,
  X,
} from "lucide-react"
import { useMemo, useState } from "react"
import { isCurrentUserAdmin } from "@/lib/admin.functions"
import {
  WORKFLOW_NAV_COUNT,
  WORKFLOW_NAV_SECTIONS,
  findWorkflowNavigationItem,
} from "@/lib/workflow-navigation"

type SidebarUser = {
  email?: string | null
  fullName?: string
  user_metadata?: Record<string, unknown>
}

type SidebarItem = {
  label: string
  href: string
  icon: typeof Home
  exact?: boolean
}

const primaryItems: SidebarItem[] = [
  { label: "Home", href: "/dashboard", icon: Home, exact: true },
  { label: "My Matters", href: "/dashboard", icon: FolderOpen },
  { label: "Mail a PDF", href: "/mail-a-pdf", icon: Mail },
]

const adminItems: SidebarItem[] = [
  { label: "Studio Home", href: "/admin", icon: Sparkles, exact: true },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "AI Control Plane", href: "/admin/ai", icon: Bot },
  { label: "Audit Log", href: "/admin/audit-log", icon: FileClock },
  { label: "Entitlements", href: "/admin/entitlements", icon: KeyRound },
]

function isActivePath(pathname: string, item: SidebarItem) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(item.href + "/")
}

function SidebarNavItem({
  item,
  pathname,
  onNavigate,
  collapsed,
}: {
  item: SidebarItem
  pathname: string
  onNavigate?: () => void
  collapsed?: boolean
}) {
  const active = isActivePath(pathname, item)
  const Icon = item.icon
  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={`group flex min-h-10 items-center rounded-md text-sm transition ${
        collapsed ? "justify-center px-0" : "gap-3 px-3"
      } ${
        active
          ? "bg-white/15 text-white shadow-sm"
          : "text-white/68 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center">
        <Icon className="h-[17px] w-[17px]" strokeWidth={1.7} aria-hidden="true" />
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
    </Link>
  )
}

function WorkflowNavigator({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string
  collapsed: boolean
  onNavigate?: () => void
}) {
  const current = findWorkflowNavigationItem(pathname)
  const [open, setOpen] = useState(Boolean(current))
  const [query, setQuery] = useState("")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(current ? [current.section.id] : []),
  )

  const normalized = query.trim().toLowerCase()
  const matches = useMemo(() => {
    if (!normalized) return []
    return WORKFLOW_NAV_SECTIONS.flatMap((section) =>
      section.workflows
        .filter((workflow) =>
          workflow.label.toLowerCase().includes(normalized) ||
          workflow.slug.toLowerCase().includes(normalized) ||
          section.label.toLowerCase().includes(normalized),
        )
        .map((workflow) => ({ section, workflow })),
    ).slice(0, 60)
  }, [normalized])

  function toggleSection(id: string) {
    setExpandedSections((currentSet) => {
      const next = new Set(currentSet)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title={collapsed ? "Workflows" : undefined}
        aria-expanded={open}
        className={`group flex min-h-10 w-full items-center rounded-md text-sm transition ${
          collapsed ? "justify-center px-0" : "gap-3 px-3"
        } ${
          current ? "bg-white/15 text-white shadow-sm" : "text-white/68 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center">
          <Workflow className="h-[17px] w-[17px]" strokeWidth={1.7} aria-hidden="true" />
        </span>
        {!collapsed && (
          <>
            <a href="/dashboard/workflows" onClick={onNavigate} className="min-w-0 flex-1 text-left hover:text-white">Workflows</a>
            <span className="text-[10px] tabular-nums text-white/40">{WORKFLOW_NAV_COUNT}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {!collapsed && open && (
        <div className="mt-2 rounded-md bg-black/15 p-2">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search 420 workflows..."
              className="h-9 w-full rounded-md border border-white/10 bg-black/15 pl-8 pr-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-white/25"
            />
          </label>

          <div className="mt-2 max-h-[48vh] overflow-y-auto pr-1">
            {normalized ? (
              <div className="space-y-0.5">
                {matches.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-white/45">No matching workflows.</p>
                ) : matches.map(({ section, workflow }) => (
                  <a
                    key={workflow.workspaceHref}
                    href={workflow.workspaceHref}
                    onClick={onNavigate}
                    className="block rounded px-2.5 py-2 text-xs text-white/72 hover:bg-white/10 hover:text-white"
                  >
                    <span className="block truncate">{workflow.label}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-white/35">{section.label}</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="space-y-0.5">
                {WORKFLOW_NAV_SECTIONS.map((section) => {
                  const sectionOpen = expandedSections.has(section.id)
                  return (
                    <div key={section.id}>
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs font-medium text-white/78 hover:bg-white/10 hover:text-white"
                      >
                        <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${sectionOpen ? "rotate-90" : ""}`} />
                        <span className="min-w-0 flex-1 truncate">{section.label}</span>
                        <span className="text-[10px] text-white/35">{section.workflows.length}</span>
                      </button>
                      {sectionOpen && (
                        <div className="ml-5 border-l border-white/10 pl-1">
                          <a href={section.workspaceHref} onClick={onNavigate} className="block rounded px-2 py-1.5 text-[11px] font-medium text-[#d1ad72] hover:bg-white/10">
                            {section.label} overview
                          </a>
                          {section.workflows.map((workflow) => {
                            const active = pathname === workflow.workspaceHref || pathname.startsWith(workflow.workspaceHref + "/")
                            return (
                              <a
                                key={workflow.workspaceHref}
                                href={workflow.workspaceHref}
                                onClick={onNavigate}
                                aria-current={active ? "page" : undefined}
                                className={`block rounded px-2 py-1.5 text-[11px] leading-snug ${
                                  active ? "bg-white/12 text-white" : "text-white/58 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                {workflow.label}
                              </a>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarContents({
  user,
  onSignOut,
  onNavigate,
  collapsed,
}: {
  user: SidebarUser
  onSignOut: () => void | Promise<void>
  onNavigate?: () => void
  collapsed: boolean
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const checkAdmin = useServerFn(isCurrentUserAdmin)
  const { data: adminAccess } = useQuery({
    queryKey: ["authenticated-sidebar-admin-access", user.email ?? ""],
    queryFn: () => checkAdmin(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
  const isAdmin = adminAccess?.isAdmin === true

  const { displayName, initials } = useMemo(() => {
    const metadataName =
      user.fullName ||
      (typeof user.user_metadata?.fullName === "string"
        ? user.user_metadata.fullName
        : typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : "")
    const fallback = user.email?.split("@")[0] || "Account"
    const name = metadataName.trim() || fallback
    const parts = name.split(/\s+/).filter(Boolean)
    const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
    return { displayName: name, initials: letters.toUpperCase() }
  }, [user.email, user.fullName, user.user_metadata])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`border-b border-white/10 p-4 ${collapsed ? "px-2" : ""}`}>
        <Link to="/" onClick={onNavigate} className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`} title={collapsed ? "MailMyPDF" : undefined}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/12 bg-white/5">
            <Mail className="h-4 w-4 text-[#d1ad72]" strokeWidth={1.7} />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block font-serif text-[20px] leading-none text-white">MailMyPDF</span>
              <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.24em] text-white/38">Workspace</span>
            </span>
          )}
        </Link>
      </div>

      <div className={collapsed ? "px-2 pt-3" : "px-3 pt-3"}>
        <a href="/dashboard/workflows" onClick={onNavigate} title={collapsed ? "New Matter" : undefined} className={`flex min-h-10 items-center justify-center rounded-md border border-white/12 bg-white/[0.07] text-sm font-medium text-white transition hover:bg-white/12 ${collapsed ? "px-0" : "gap-2 px-3"}`}>
          <Sparkles className="h-4 w-4 text-[#d1ad72]" />
          {!collapsed && <span>New Matter</span>}
        </a>
      </div>

      <nav className={`min-h-0 flex-1 overflow-y-auto pb-4 pt-3 ${collapsed ? "px-2" : "px-3"}`} aria-label="Authenticated navigation">
        <div className="space-y-1">
          {primaryItems.map((item) => <SidebarNavItem key={item.label} item={item} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} />)}
          <WorkflowNavigator pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
        </div>

        {isAdmin && (
          <>
            <div className="my-4 border-t border-white/10" />
            {!collapsed && <div className="px-3 pb-2 text-[9px] font-semibold uppercase tracking-[0.24em] text-[#d1ad72]">Studio / Admin</div>}
            <div className="space-y-1">
              {adminItems.map((item) => <SidebarNavItem key={item.label} item={item} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} />)}
            </div>
          </>
        )}

        <div className="my-4 border-t border-white/10" />
        <div className="space-y-1">
          <SidebarNavItem item={{ label: "Help", href: "/how-it-works", icon: CircleHelp }} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} />
          <SidebarNavItem item={{ label: "Account", href: "/dashboard/settings", icon: Settings }} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} />
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className={`flex items-center rounded-md py-2 ${collapsed ? "justify-center px-0" : "gap-3 px-2"}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 font-serif text-sm text-white" title={collapsed ? displayName : undefined}>{initials}</div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">{displayName}</div>
                <div className="truncate text-[10px] text-white/38">{isAdmin ? "Administrator" : user.email}</div>
              </div>
              <button type="button" onClick={() => void onSignOut()} className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-white/42 transition hover:bg-white/10 hover:text-white" aria-label="Sign out" title="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function AuthenticatedSidebar({
  user,
  onSignOut,
  showMobileControls = true,
}: {
  user: SidebarUser
  onSignOut: () => void | Promise<void>
  showMobileControls?: boolean
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onFocus={() => setExpanded(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false)
        }}
        className={`fixed inset-y-0 left-0 z-[70] hidden overflow-hidden border-r border-white/10 bg-[#202b39] text-white shadow-[18px_0_55px_-32px_rgba(2,12,27,.8)] transition-[width] duration-200 ease-out lg:block ${expanded ? "w-[300px]" : "w-16"}`}
      >
        <SidebarContents user={user} onSignOut={onSignOut} collapsed={!expanded} />
      </aside>

      {showMobileControls && (
        <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-rule/60 bg-paper/95 px-4 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-rule bg-card text-foreground" aria-label="Open navigation">
            <Menu className="h-4 w-4" />
          </button>
          <Link to="/" className="font-serif text-lg">MailMyPDF</Link>
          <a href="/dashboard/workflows" className="rounded-full bg-cobalt px-3 py-1.5 text-xs font-semibold text-white">New Matter</a>
        </div>
      )}

      {showMobileControls && mobileOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <aside className="absolute inset-y-0 left-0 w-[min(92vw,340px)] border-r border-white/10 bg-[#202b39] text-white shadow-2xl">
            <button type="button" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded bg-white/10 text-white/70 hover:text-white" aria-label="Close navigation">
              <X className="h-4 w-4" />
            </button>
            <SidebarContents user={user} onSignOut={onSignOut} onNavigate={() => setMobileOpen(false)} collapsed={false} />
          </aside>
        </div>
      )}
    </>
  )
}
