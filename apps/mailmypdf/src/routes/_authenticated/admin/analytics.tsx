import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { isCurrentUserAdmin } from "@/lib/admin.functions";
import { getAnalyticsDashboard } from "@/lib/admin-analytics.functions";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — MailMyPDF" }, { name: "robots", content: "noindex" }] }),
  component: AnalyticsPage,
});

function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return <div className="envelope-card p-5"><div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div><div className="mt-2 font-serif text-3xl">{value}</div>{detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}</div>;
}

function Bars({ items }: { items: [string, number][] }) {
  const max = Math.max(...items.map(([, n]) => n), 1);
  return <div className="space-y-3">{items.map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-xs"><span className="truncate pr-4">{label}</span><span className="tabular-nums text-muted-foreground">{value.toLocaleString()}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground" style={{ width: `${Math.max(2, (value / max) * 100)}%` }} /></div></div>)}</div>;
}

function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const checkAdmin = useServerFn(isCurrentUserAdmin);
  const getData = useServerFn(getAnalyticsDashboard);
  const { data: admin } = useSuspenseQuery({ queryKey: ["analytics-admin"], queryFn: () => checkAdmin(), retry: false });
  const { data } = useSuspenseQuery({ queryKey: ["analytics-dashboard", days], queryFn: () => getData({ data: { days } }), enabled: !!admin.isAdmin });

  if (!admin.isAdmin) return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-6xl px-6 py-12"><div className="envelope-card p-8"><h1 className="font-serif text-3xl">Not authorized</h1><p className="mt-2 text-sm text-muted-foreground">Analytics is restricted to administrators.</p></div></main><SiteFooter /></div>;

  const d = data;
  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-7xl px-6 py-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="postmark w-fit">Admin intelligence</div><h1 className="mt-3 font-serif text-4xl">Analytics &amp; Cookies</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">First-party, opt-in visitor intelligence. Raw event data stays server-side and is restricted to admins.</p></div><div className="flex gap-1 rounded-md border border-rule p-1">{[7,30,90].map(n => <button key={n} onClick={() => setDays(n)} className={`px-3 py-1.5 text-xs ${days === n ? "bg-foreground text-background" : "text-muted-foreground"}`}>{n}d</button>)}</div></div>

    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6"><Metric label="Visitors" value={d.totals.visitors.toLocaleString()} /><Metric label="Sessions" value={d.totals.sessions.toLocaleString()} /><Metric label="Events" value={d.totals.events.toLocaleString()} /><Metric label="Page views" value={d.totals.pageViews.toLocaleString()} /><Metric label="Interactions" value={d.totals.interactions.toLocaleString()} /><Metric label="Authenticated" value={d.totals.authenticated.toLocaleString()} /></div>

    <div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="envelope-card p-6"><h2 className="font-serif text-2xl">Event activity</h2><div className="mt-5"><Bars items={Object.entries(d.eventCounts).sort((a,b)=>b[1]-a[1]).slice(0,12)} /></div></section><section className="envelope-card p-6"><h2 className="font-serif text-2xl">Top pages</h2><div className="mt-5"><Bars items={d.pages} /></div></section></div>

    <div className="mt-6 grid gap-6 lg:grid-cols-3"><section className="envelope-card p-6"><h2 className="font-serif text-2xl">Acquisition</h2><p className="mt-1 text-xs text-muted-foreground">Captured UTM sources</p><div className="mt-5"><Bars items={d.sources.length ? d.sources : [["No campaign attribution yet", 0]]} /></div></section><section className="envelope-card p-6"><h2 className="font-serif text-2xl">Devices</h2><div className="mt-5"><Bars items={d.devices} /></div></section><section className="envelope-card p-6"><h2 className="font-serif text-2xl">Browsers</h2><div className="mt-5"><Bars items={d.browsers.length ? d.browsers : [["Not classified", 0]]} /></div></section></div>

    <section className="mt-6 envelope-card overflow-hidden"><div className="flex items-center justify-between border-b border-rule p-6"><div><h2 className="font-serif text-2xl">Recent visitors</h2><p className="mt-1 text-xs text-muted-foreground">Identifiers are intentionally truncated in the admin UI.</p></div><span className="text-xs text-muted-foreground">{d.latestVisitors.length} shown</span></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-rule text-[10px] uppercase tracking-widest text-muted-foreground"><tr><th className="px-6 py-3">Visitor</th><th className="px-6 py-3">Last seen</th><th className="px-6 py-3">Events</th><th className="px-6 py-3">Page</th><th className="px-6 py-3">Source</th><th className="px-6 py-3">Account</th></tr></thead><tbody>{d.latestVisitors.slice(0,25).map(v => <tr key={v.visitorId} className="border-b border-rule last:border-0"><td className="px-6 py-3 font-mono text-xs">{v.visitorId}…</td><td className="px-6 py-3 text-xs text-muted-foreground">{v.lastSeen ? new Date(v.lastSeen).toLocaleString() : "—"}</td><td className="px-6 py-3 tabular-nums">{v.events}</td><td className="max-w-xs truncate px-6 py-3 text-xs">{v.lastPage}</td><td className="px-6 py-3 text-xs">{String(v.source)}</td><td className="px-6 py-3 text-xs">{v.authenticated ? "Signed in" : "Anonymous"}</td></tr>)}</tbody></table></div></section>

    <div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="envelope-card p-6"><h2 className="font-serif text-2xl">Consent model</h2><div className="mt-4 grid gap-2 text-sm"><div className="flex justify-between border-b border-rule py-2"><span>Essential</span><span className="text-muted-foreground">Always on where necessary</span></div><div className="flex justify-between border-b border-rule py-2"><span>Analytics</span><span className="text-muted-foreground">Explicit opt-in</span></div><div className="flex justify-between border-b border-rule py-2"><span>Personalization</span><span className="text-muted-foreground">Explicit opt-in</span></div><div className="flex justify-between py-2"><span>Advertising</span><span className="text-muted-foreground">Explicit opt-in</span></div></div></section><section className="envelope-card p-6"><h2 className="font-serif text-2xl">Data boundaries</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">This dashboard exposes analytics telemetry, not passwords, payment-card data, or private document contents. Sensitive attributes are not silently inferred from browsing behavior.</p></section></div>
  </main><SiteFooter /></div>;
}
