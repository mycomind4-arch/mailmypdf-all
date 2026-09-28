import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, CircleAlert, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { authenticatedHeaders } from "@/lib/authenticated-client";

type FactoryEntry = {
  id: string;
  maturity: string;
  policyFamily: string | null;
  chatExecutable: boolean;
  reason: string;
  diagnostics: Array<{ code: string; message: string }>;
};
type FactoryReport = { total: number; chatExecutable: number; awaitingChatContract: number; workflows: FactoryEntry[] };
type ProblemPlan = {
  decision: "review-existing-workflow" | "needs-template-review";
  nextStep: string;
  candidates: Array<{ id: string; label: string; publicHref: string; chatExecutable: boolean; matchedTerms: string[]; score: number }>;
};

async function factoryRequest(path: string, init?: RequestInit) {
  const headers = await authenticatedHeaders();
  const response = await fetch(path, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `Factory request failed (${response.status}).`);
  }
  return response.json();
}

export function WorkflowFactoryPage({ request = factoryRequest }: {
  request?: (path: string, init?: RequestInit) => Promise<unknown>;
}) {
  const [report, setReport] = useState<FactoryReport | null>(null);
  const [problem, setProblem] = useState("");
  const [plan, setPlan] = useState<ProblemPlan | null>(null);
  const [filter, setFilter] = useState<"ready" | "contracts" | "all">("ready");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<"report" | "plan" | null>("report");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setPending("report");
    setError(null);
    try { setReport(await request("/api/studio/workflows/readiness") as FactoryReport); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load readiness."); }
    finally { setPending(null); }
  }

  useEffect(() => { void refresh(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!problem.trim() || pending) return;
    setPending("plan");
    setError(null);
    setPlan(null);
    try {
      setPlan(await request("/api/studio/workflows/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ problem: problem.trim() }),
      }) as ProblemPlan);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to plan workflow."); }
    finally { setPending(null); }
  }

  const rows = useMemo(() => (report?.workflows ?? []).filter((item) => {
    if (filter === "ready" && !item.chatExecutable) return false;
    if (filter === "contracts" && item.reason !== "chat-contract-not-registered" && item.reason !== "certification-failed") return false;
    return item.id.toLowerCase().includes(search.trim().toLowerCase());
  }), [report, filter, search]);

  return (
    <main className="min-h-screen bg-[#f1eee8] px-4 py-8 text-charcoal sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <nav aria-label="Breadcrumb" className="text-xs font-medium uppercase tracking-[0.16em] text-stone">
          <a href="/studio" className="hover:text-navy">Studio</a><span className="mx-2">/</span>Workflow factory
        </nav>
        <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.19em] text-brass">Supervised design</p>
            <h1 className="mt-2 font-serif text-4xl leading-tight text-navy sm:text-5xl">Workflow factory</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone">Start with a problem. Inspect a matching workflow before creating a matter. New templates still require review and acceptance tests.</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={pending !== null} className="inline-flex items-center gap-2 rounded-md border border-rule bg-paper px-3 py-2 text-sm font-medium text-navy hover:border-navy disabled:opacity-50">
            <RefreshCw size={15} className={pending === "report" ? "animate-spin" : ""} /> Refresh readiness
          </button>
        </header>

        {error && <div role="alert" className="mt-6 rounded-lg border border-error/30 bg-paper p-4 text-sm text-error">{error}</div>}

        <section aria-labelledby="factory-plan-title" className="mt-8 rounded-xl border border-rule bg-paper p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3"><Search className="mt-1 text-brass" size={20} /><div>
            <h2 id="factory-plan-title" className="font-serif text-2xl text-navy">Find a starting point</h2>
            <p className="mt-1 text-sm text-stone">Use a short description. Suggested matches are proposals for your review.</p>
          </div></div>
          <form onSubmit={(event) => void submit(event)} className="mt-5">
            <label htmlFor="factory-problem" className="block text-xs font-semibold uppercase tracking-wider text-navy">What needs to be handled?</label>
            <textarea id="factory-problem" value={problem} onChange={(event) => setProblem(event.target.value)} maxLength={4000} rows={3} placeholder="For example, I received an IRS CP14 notice and need to respond." className="mt-2 w-full resize-y rounded-lg border border-rule bg-ivory p-3 text-sm leading-6 outline-none placeholder:text-stone/70 focus:border-brass focus:ring-2 focus:ring-brass/20" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-stone">The description is used for this request; the response contains only suggested workflow metadata.</p><button disabled={!problem.trim() || pending !== null} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-paper hover:bg-charcoal disabled:opacity-50">{pending === "plan" ? "Finding matches…" : "Find workflows"}<ArrowRight size={15} /></button></div>
          </form>
          {plan && <div aria-live="polite" className="mt-6 border-t border-rule pt-5">
            <div className="flex items-start gap-2 text-sm font-medium text-navy">{plan.decision === "review-existing-workflow" ? <CheckCircle2 size={18} className="text-success" /> : <CircleAlert size={18} className="text-brass" />}{plan.nextStep}</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">{plan.candidates.map((item) => <div key={item.id} className="rounded-lg border border-rule bg-ivory p-4">
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-medium text-navy">{item.label}</h3><p className="mt-1 font-mono text-xs text-stone">{item.id}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${item.chatExecutable ? "bg-success/15 text-success" : "bg-brass/15 text-navy"}`}>{item.chatExecutable ? "Chat ready" : "Review needed"}</span></div>
              {item.chatExecutable && <a href={item.publicHref} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-navy underline underline-offset-4 hover:text-brass">Review workflow <ArrowRight size={13} /></a>}
            </div>)}</div>
            {plan.candidates.length === 0 && <p className="mt-3 text-sm text-stone">No catalog match found. A reviewer can assess whether a new template is appropriate.</p>}
          </div>}
        </section>

        <section aria-labelledby="factory-readiness-title" className="mt-8 rounded-xl border border-rule bg-paper p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 id="factory-readiness-title" className="font-serif text-2xl text-navy">Registry readiness</h2><p className="mt-1 text-sm text-stone">Identity, runtime and chat certification are tracked separately.</p></div><ShieldCheck className="text-brass" size={22} /></div>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4" aria-live="polite">
            {[["Canonical", report?.total], ["Chat ready", report?.chatExecutable], ["Contract next", report?.awaitingChatContract]].map(([label, value]) => <div key={label} className="rounded-lg border border-rule bg-ivory p-3 sm:p-4"><div className="font-serif text-2xl text-navy sm:text-3xl">{value ?? "—"}</div><div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-stone">{label}</div></div>)}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {([ ["ready", "Chat ready"], ["contracts", "Needs contract"], ["all", "All workflows"] ] as const).map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${filter === value ? "border-navy bg-navy text-paper" : "border-rule text-navy hover:border-navy"}`}>{label}</button>)}
            <label className="ml-auto"><span className="sr-only">Filter workflows</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter by name or ID" className="w-full rounded-md border border-rule bg-ivory px-3 py-2 text-sm outline-none focus:border-brass sm:w-56" /></label>
          </div>
          <p className="mt-3 text-xs text-stone" aria-live="polite">{pending === "report" ? "Loading readiness…" : `${rows.length} workflows shown`}</p>
          <div className="mt-3 max-h-[440px] divide-y divide-rule overflow-y-auto rounded-lg border border-rule">
            {rows.slice(0, 100).map((item) => <details key={item.id} className="group bg-paper px-4 py-3 open:bg-ivory"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium text-navy">{item.id}</span><span className="shrink-0 text-xs text-stone">{item.chatExecutable ? "Chat ready" : item.reason.replaceAll("-", " ")}</span></summary><div className="pt-3 text-xs leading-5 text-stone"><p>Registry maturity: {item.maturity}{item.policyFamily ? ` · ${item.policyFamily}` : ""}</p>{item.diagnostics.map((diagnostic, index) => <p key={`${diagnostic.code}-${index}`} className="mt-1">{diagnostic.code}: {diagnostic.message}</p>)}</div></details>)}
            {rows.length === 0 && pending !== "report" && <p className="p-5 text-sm text-stone">No workflows match this filter.</p>}
          </div>
          {rows.length > 100 && <p className="mt-2 text-xs text-stone">Showing the first 100 matches. Narrow the filter to inspect a specific workflow.</p>}
        </section>
      </div>
    </main>
  );
}
