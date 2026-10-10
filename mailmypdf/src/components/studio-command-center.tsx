import { Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity, AlertTriangle, BarChart3, Bot, Boxes, CheckCircle2, CircleAlert,
  FileClock, KeyRound, Mail, Newspaper, Plug, RefreshCw, ServerCog, ShieldCheck,
  Users, WandSparkles, Workflow, XCircle, BrainCircuit,
} from "lucide-react";
import { getStudioCommandCenter } from "@/lib/studio-command-center.functions";
import { getStudioLaunchReadiness } from "@/lib/studio-launch-readiness.functions";

function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return <div className="rounded-xl border border-rule bg-card p-5"><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div><div className="mt-2 font-serif text-3xl">{value}</div>{detail ? <div className="mt-1 text-xs text-muted-foreground">{detail}</div> : null}</div>;
}

function StatusRow({ label, ready, detail }: { label: string; ready: boolean; detail?: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-rule/60 py-3 last:border-0"><div><div className="text-sm font-medium">{label}</div>{detail ? <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div> : null}</div><span className={"inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider " + (ready ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900")}>{ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}{ready ? "Ready" : "Needs setup"}</span></div>;
}

function Shortcut({ to, title, detail, icon: Icon }: { to: string; title: string; detail: string; icon: typeof WandSparkles }) {
  return <Link to={to} className="group rounded-xl border border-rule bg-card p-5 transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-sm"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper-deep"><Icon className="h-4 w-4" /></div><div className="mt-4 font-medium">{title}</div><div className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</div><div className="mt-3 text-xs font-semibold text-cobalt">Open →</div></Link>;
}

function LaunchBadge({ status }: { status: "pass" | "warning" | "fail" | "manual" }) {
  const styles = {
    pass: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-amber-900",
    fail: "bg-red-50 text-red-800",
    manual: "bg-slate-100 text-slate-700",
  } as const;
  const labels = { pass: "Pass", warning: "Review", fail: "Blocked", manual: "Manual" } as const;
  return <span className={"rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider " + styles[status]}>{labels[status]}</span>;
}

export function StudioCommandCenter() {
  const load = useServerFn(getStudioCommandCenter);
  const query = useSuspenseQuery({ queryKey: ["studio-command-center"], queryFn: () => load(), refetchInterval: 60_000 });
  const data = query.data;
  const loadLaunch = useServerFn(getStudioLaunchReadiness);
  const launchQuery = useQuery({
    queryKey: ["studio-launch-readiness"],
    queryFn: () => loadLaunch(),
    refetchInterval: 120_000,
    retry: false,
  });
  const criticalAlerts = data.alerts.filter((alert) => alert.severity === "critical").length;
  const warningAlerts = data.alerts.filter((alert) => alert.severity === "warning").length;
  const executablePct = data.workflows.total ? Math.round((data.workflows.executable / data.workflows.total) * 100) : 0;
  const chatPct = data.workflows.total ? Math.round((data.workflows.chatCertified / data.workflows.total) * 100) : 0;

  return <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-6 lg:px-10 lg:py-10">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><div className="postmark w-fit">Studio / Command Center</div><h1 className="mt-3 font-serif text-4xl sm:text-5xl">MailMyPDF control room</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">One view of workflow maturity, ChatGPT connector coverage, fulfillment health, configuration, users, AI routing, and recent failures. This surface is read-only; consequential actions remain in their dedicated admin tools.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void query.refetch()} disabled={query.isFetching} className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-4 py-2 text-xs font-semibold disabled:opacity-50"><RefreshCw className={"h-3.5 w-3.5 " + (query.isFetching ? "animate-spin" : "")} />Refresh</button><Link to="/studio/builder" className="inline-flex items-center gap-2 rounded-full bg-cobalt px-4 py-2 text-xs font-semibold text-white"><WandSparkles className="h-3.5 w-3.5" />Open Workflow Builder</Link></div></div>

    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      <Metric label="Workflows" value={data.workflows.total} detail={String(data.workflows.sections) + " sections"} />
      <Metric label="Executable" value={data.workflows.executable} detail={String(executablePct) + "% of catalog"} />
      <Metric label="Chat certified" value={data.workflows.chatCertified} detail={String(chatPct) + "% of catalog"} />
      <Metric label="Connector tools" value={data.connector.tools} detail={String(data.connector.protectedTools) + " authenticated"} />
      <Metric label="Orders" value={data.operations.orders ?? "—"} detail={String(data.operations.queue) + " active queue"} />
      <Metric label="Profiles" value={data.operations.profiles ?? "—"} detail="Admin-visible user profiles" />
      <Metric label="Alerts" value={data.alerts.length} detail={String(criticalAlerts) + " critical · " + String(warningAlerts) + " warning"} />
    </section>

    <section className="mt-6 overflow-hidden rounded-xl border border-rule bg-card">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule px-6 py-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <h2 className="font-serif text-2xl">Launch readiness</h2>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
            Read-only checks against production configuration, the deployed website, MCP discovery, storage/schema, secure-core backlog, and manual canary gates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void launchQuery.refetch()}
          disabled={launchQuery.isFetching}
          className="inline-flex items-center gap-2 rounded-full border border-rule px-4 py-2 text-xs font-semibold disabled:opacity-50"
        >
          <RefreshCw className={"h-3.5 w-3.5 " + (launchQuery.isFetching ? "animate-spin" : "")} />
          Run readiness checks
        </button>
      </div>

      {launchQuery.isLoading ? (
        <div className="px-6 py-8 text-sm text-muted-foreground">Running production readiness probes…</div>
      ) : launchQuery.isError || !launchQuery.data ? (
        <div className="px-6 py-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <XCircle className="h-4 w-4" />
            Launch readiness probe could not complete.
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            The rest of Studio remains available. Retry the read-only probe or run verify:production-config -- --live from the deployment environment.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-5">
            <div className="bg-card p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Overall</div>
              <div className="mt-2 font-serif text-2xl">
                {launchQuery.data.launchStatus === "automated-ready" ? "Automated ready" : launchQuery.data.launchStatus === "needs-review" ? "Needs review" : "Blocked"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{launchQuery.data.paymentEnv} payments · {launchQuery.data.autoSubmitToLob ? "Lob auto-submit on" : "Lob auto-submit off"}</div>
            </div>
            <Metric label="Passed" value={launchQuery.data.totals.pass} detail="automated checks" />
            <Metric label="Review" value={launchQuery.data.totals.warning} detail="non-blocking warnings" />
            <Metric label="Blocked" value={launchQuery.data.totals.fail} detail="must resolve" />
            <Metric label="Manual" value={launchQuery.data.totals.manual} detail="human canary/verification" />
          </div>

          <div className="grid gap-0 lg:grid-cols-2">
            {launchQuery.data.checks.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 border-b border-rule px-6 py-4 lg:odd:border-r">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.category}</div>
                  <div className="mt-1 text-sm font-medium">{item.label}</div>
                  <div className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">{item.detail}</div>
                </div>
                <LaunchBadge status={item.status} />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-paper-deep px-6 py-4 text-xs text-muted-foreground">
            <span>Checked against {launchQuery.data.baseUrl} · generated <span suppressHydrationWarning>{new Date(launchQuery.data.generatedAt).toLocaleString()}</span></span>
            <span>Green automated checks do not replace the listed sandbox/live canaries.</span>
          </div>
        </>
      )}
    </section>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-xl border border-rule bg-card"><div className="flex items-center justify-between border-b border-rule px-6 py-5"><div><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-700" /><h2 className="font-serif text-2xl">Needs attention</h2></div><p className="mt-1 text-xs text-muted-foreground">Configuration gaps and operational failures that merit administrator review.</p></div><Link to="/admin" className="text-xs font-semibold text-cobalt">Operations →</Link></div><div className="divide-y divide-rule">{data.alerts.length === 0 ? <div className="flex items-center gap-3 px-6 py-7 text-sm"><CheckCircle2 className="h-5 w-5 text-emerald-700" />No command-center alerts are active.</div> : data.alerts.map((alert) => <div key={alert.code} className="flex items-start gap-3 px-6 py-4">{alert.severity === "critical" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" /> : alert.severity === "warning" ? <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /> : <Activity className="mt-0.5 h-4 w-4 shrink-0 text-cobalt" />}<div><div className="text-sm">{alert.message}</div><div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{alert.severity} · {alert.code}</div></div></div>)}</div></section>
      <section className="rounded-xl border border-rule bg-card p-6"><div className="flex items-center gap-2"><ServerCog className="h-4 w-4" /><h2 className="font-serif text-2xl">Production services</h2></div><div className="mt-4"><StatusRow label="Supabase" ready={data.services.supabase} detail="Auth, database, storage" /><StatusRow label={"Stripe · " + data.services.stripeMode} ready={data.services.stripe} detail="Secret, client token, webhook" /><StatusRow label="Lob" ready={data.services.lob} detail={data.services.autoSubmit ? "Webhook configured · auto-submit on" : "Webhook required · auto-submit off"} /><StatusRow label="Transactional email" ready={data.services.email} detail="Resend" /><StatusRow label="Cloudflare Worker target" ready={data.services.deploymentTarget} detail={data.deployment.cloudflareTargetConfigured ? ((data.deployment.workerName ?? "mailmypdf") + " · canonical deploy script · local Studio only") : "Studio deploy target not wired"} /></div></section>
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <section className="rounded-xl border border-rule bg-card p-6"><div className="flex items-center gap-2"><Workflow className="h-4 w-4" /><h2 className="font-serif text-2xl">Workflow factory</h2></div><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between border-b border-rule pb-2"><span>Total canonical workflows</span><strong>{data.workflows.total}</strong></div><div className="flex justify-between border-b border-rule pb-2"><span>Executable UI/runtime</span><strong>{data.workflows.executable}</strong></div><div className="flex justify-between border-b border-rule pb-2"><span>Not connected</span><strong>{data.workflows.notConnected}</strong></div><div className="flex justify-between border-b border-rule pb-2"><span>Certified for chat</span><strong>{data.workflows.chatCertified}</strong></div></div><div className="mt-5 grid grid-cols-2 gap-2 text-xs">{Object.entries(data.workflows.sectionsByState).map(([state, count]) => <div key={state} className="rounded-lg bg-paper-deep px-3 py-2"><div className="font-semibold">{count}</div><div className="mt-0.5 text-muted-foreground">{state}</div></div>)}</div><Link to="/studio/builder" className="mt-5 inline-block text-xs font-semibold text-cobalt">Open visual builder →</Link></section>
      <section className="rounded-xl border border-rule bg-card p-6"><div className="flex items-center gap-2"><Plug className="h-4 w-4" /><h2 className="font-serif text-2xl">ChatGPT connector</h2></div><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between border-b border-rule pb-2"><dt>Connector version</dt><dd className="font-mono text-xs">{data.connector.version}</dd></div><div className="flex justify-between border-b border-rule pb-2"><dt>Contract</dt><dd className="font-mono text-xs">{data.connector.contractVersion}</dd></div><div className="flex justify-between border-b border-rule pb-2"><dt>Tools</dt><dd>{data.connector.tools}</dd></div><div className="flex justify-between border-b border-rule pb-2"><dt>Public discovery</dt><dd>{data.connector.publicTools}</dd></div><div className="flex justify-between border-b border-rule pb-2"><dt>Protected tools</dt><dd>{data.connector.protectedTools}</dd></div><div className="flex justify-between"><dt>Chat-certified workflows</dt><dd>{data.connector.certifiedWorkflows}</dd></div></dl><div className="mt-5 rounded-lg bg-paper-deep p-3 font-mono text-[11px] text-muted-foreground">{data.services.appBaseUrl}/api/mcp</div></section>
      <section className="rounded-xl border border-rule bg-card p-6"><div className="flex items-center gap-2"><Bot className="h-4 w-4" /><h2 className="font-serif text-2xl">AI & publishing</h2></div><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between border-b border-rule pb-2"><span>AI providers</span><strong>{data.ai.enabledProviders}/{data.ai.providers}</strong></div><div className="flex justify-between border-b border-rule pb-2"><span>AI routes</span><strong>{data.ai.enabledRoutes}/{data.ai.routes}</strong></div><div className="flex justify-between border-b border-rule pb-2"><span>Publications</span><strong>{data.publications.total ?? "—"}</strong></div><div className="flex justify-between"><span>Workflow matters</span><strong>{data.operations.workflowCases ?? "—"}</strong></div></div><div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold"><Link to="/admin/ai" className="text-cobalt">AI Control Plane →</Link><Link to="/admin/publications" className="text-cobalt">Publications →</Link></div></section>
    </div>

    <section className="mt-6 rounded-xl border border-rule bg-card" aria-labelledby="reference-journeys-heading">
      <div className="border-b border-rule px-6 py-5">
        <h2 id="reference-journeys-heading" className="font-serif text-2xl">Reference journeys &amp; factory graduation</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tool registration and manifest certification are not end-to-end acceptance or proof of mailing.
          The factory queue stays supervised; nothing is published or charged from this view.
        </p>
      </div>
      <div className="grid divide-y divide-rule lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {data.workflows.graduation.references.map((journey) => (
          <div key={journey.id} className="space-y-3 p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold">{journey.label}</h3>
              <span className={"shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold " +
                (journey.contractReady ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900")}>
                {journey.contractReady ? "Contract compatible" : "Contract needs work"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {journey.contractEvidence === "tool-surface-only"
                ? "MCP tool availability only; no specialized workflow certificate."
                : "Manifest + runtime chat-contract certification."}
            </p>
            <p className="text-xs text-amber-800">Acceptance unverified · Live fulfillment unverified</p>
            {journey.missingTools.length > 0 && (
              <p className="text-xs text-red-700">Missing: {journey.missingTools.join(", ")}</p>
            )}
            <p className="text-xs leading-5 text-muted-foreground">{journey.nextAcceptance}</p>
            {journey.workspaceHref && (
              <Link to={journey.workspaceHref} className="inline-block text-xs font-semibold text-cobalt">
                Inspect workspace →
              </Link>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-rule px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3"><h3 className="text-sm font-semibold">Next factory graduation steps</h3><Link to="/studio/factory" className="text-xs font-semibold text-cobalt">Open supervised Workflow Factory →</Link></div>
          <span className="text-xs text-muted-foreground">
            {data.workflows.graduation.summary.awaitingGraduation} workflows require chat-contract work
          </span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {data.workflows.graduation.queue.slice(0, 6).map((item) => (
            <div key={item.id} className="rounded-lg border border-rule/70 p-3">
              <div className="font-mono text-[11px] text-muted-foreground">{item.id}</div>
              <div className="mt-1 text-xs font-semibold">{item.milestone.replaceAll("-", " ")}</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.nextAction}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="mt-6 rounded-xl border border-rule bg-card"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule px-6 py-5"><div><h2 className="font-serif text-2xl">Recent fulfillment failures</h2><p className="mt-1 text-xs text-muted-foreground">Latest failed fulfillment/provider submissions.</p></div><Link to="/admin" className="text-xs font-semibold text-cobalt">Open Operations →</Link></div>{data.operations.recentFailures.length === 0 ? <div className="flex items-center gap-3 px-6 py-8 text-sm text-muted-foreground"><ShieldCheck className="h-5 w-5 text-emerald-700" />No recent fulfillment failures.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-paper-deep text-left text-[10px] uppercase tracking-widest text-muted-foreground"><tr><th className="px-6 py-3">Created</th><th className="px-6 py-3">Customer</th><th className="px-6 py-3">Recipient</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Price</th><th className="px-6 py-3"></th></tr></thead><tbody className="divide-y divide-rule">{data.operations.recentFailures.map((order) => <tr key={order.id}><td className="px-6 py-4 font-mono text-xs text-muted-foreground" suppressHydrationWarning>{new Date(order.created_at).toLocaleString()}</td><td className="px-6 py-4">{order.email}</td><td className="px-6 py-4">{order.recipient_name}</td><td className="px-6 py-4 font-mono text-xs text-red-700">{order.status}</td><td className="px-6 py-4">${((order.price_cents ?? 0) / 100).toFixed(2)}</td><td className="px-6 py-4 text-right"><Link to="/admin/orders/$id" params={{ id: order.id }} className="text-xs font-semibold text-cobalt">Inspect →</Link></td></tr>)}</tbody></table></div>}</section>

    <section className="mt-6"><div className="mb-4 flex items-center gap-2"><Boxes className="h-4 w-4" /><h2 className="font-serif text-2xl">Admin tools</h2></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Shortcut to="/studio/builder" title="Workflow Builder" detail="Open the visual workflow/factory environment." icon={WandSparkles} /><Shortcut to="/studio/engines" title="Engine Workbench" detail="Inspect shared package capabilities and run directly bound read-only engines." icon={Boxes} /><Shortcut to="/studio/super-agent" title="Super Agent Chat" detail="Ruthless Investigator council plus isolated Claude/Codex development agents." icon={BrainCircuit} /><Shortcut to="/admin/users" title="Users" detail="Review account profiles and roles without changing privileges." icon={Users} /><Shortcut to="/admin" title="Operations" detail="Revenue, fulfillment queue, orders, failures, and provider health." icon={Mail} /><Shortcut to="/admin/analytics" title="Analytics" detail="First-party acquisition, usage, and page activity." icon={BarChart3} /><Shortcut to="/admin/ai" title="AI Control Plane" detail="Providers, models, routing, and shared runtime variables." icon={Bot} /><Shortcut to="/admin/publications" title="Publications" detail="Preview and approve controlled publishing runs." icon={Newspaper} /><Shortcut to="/admin/audit-log" title="Audit Log" detail="Review administrator entitlement and quote activity." icon={FileClock} /><Shortcut to="/admin/entitlements" title="Entitlements" detail="Review and assign pricing/access policies." icon={KeyRound} /></div></section>

    <section className="mt-6 rounded-xl border border-rule bg-paper-deep p-5 text-xs text-muted-foreground"><div className="flex flex-wrap items-center justify-between gap-3"><span>Deployment: <strong className="text-foreground">{data.deployment.project}</strong> · {data.deployment.branch} · {data.deployment.cloudflareTargetConfigured ? ((data.deployment.workerName ?? "mailmypdf") + " Worker target wired") : "Cloudflare target not wired"} · deploy execution {data.deployment.executionBoundary}</span><a href={data.deployment.repository} target="_blank" rel="noreferrer" className="font-semibold text-cobalt">Repository →</a></div></section>
  </main>;
}