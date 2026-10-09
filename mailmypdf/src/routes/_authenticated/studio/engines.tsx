import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { authenticatedHeaders } from "@/lib/authenticated-client";
import type { StudioCapabilityCatalogEntry } from "@/studio/domain/studio-capability-catalog";

type CatalogResponse = { capabilities: StudioCapabilityCatalogEntry[] };
type ExecutionResult = {
  engineId: string;
  packageName: string;
  executed: true;
  sideEffects: "none";
  output: unknown;
  limitations: readonly string[];
};
function pretty(value: unknown): string { return JSON.stringify(value, null, 2); }

function EngineWorkbench() {
  const [catalog, setCatalog] = useState<StudioCapabilityCatalogEntry[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [input, setInput] = useState("{}");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/studio/engines", { headers: await authenticatedHeaders(), cache: "no-store" });
        const data = await response.json() as CatalogResponse & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load engine registry.");
        if (active) {
          setCatalog(data.capabilities);
          const first = data.capabilities.find((entry) => entry.runnable);
          if (first) { setSelected(first.id); setInput(pretty(first.exampleInput ?? {})); }
        }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Could not load engines."); }
    })();
    return () => { active = false; };
  }, []);
  const selectedEntry = catalog.find((entry) => entry.id === selected);
  const shown = useMemo(() => catalog.filter((entry) => !search ||
    (entry.label + " " + entry.id + " " + entry.packageName + " " + entry.category).toLowerCase().includes(search.toLowerCase())), [catalog, search]);
  const runnable = catalog.filter((entry) => entry.runnable).length;
  async function execute() {
    if (!selectedEntry?.runnable || loading) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const payload = JSON.parse(input) as unknown;
      const response = await fetch("/api/studio/engines", {
        method: "POST",
        headers: { ...(await authenticatedHeaders()), "content-type": "application/json" },
        body: JSON.stringify({ engineId: selectedEntry.id, input: payload }),
      });
      const body = await response.json() as ExecutionResult & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Engine execution failed.");
      setResult(body);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid JSON input."); }
    finally { setLoading(false); }
  }

  return <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><div className="postmark">Studio / Engine Workbench</div>
        <h1 className="mt-3 font-serif text-4xl">Shared Engine Workbench</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Inspect the canonical capability registry and execute directly connected, read-only engines. A package listed here is not necessarily a runnable Studio integration.</p>
      </div>
      <Link to="/studio/builder" className="rounded-lg border border-rule px-4 py-2 text-sm hover:bg-paper-deep">Open workflow builder</Link>
    </div>
    <div className="mb-5 flex flex-wrap gap-3 text-sm">
      <span className="rounded-lg border border-rule bg-card px-3 py-2">{catalog.length} catalog entries</span>
      <span className="rounded-lg border border-rule bg-card px-3 py-2">{runnable} direct runners</span>
      <span className="rounded-lg border border-rule bg-card px-3 py-2">No external actions</span>
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(290px,0.8fr)_minmax(0,1.5fr)]">
      <section className="rounded-xl border border-rule bg-card p-4">
        <h2 className="font-serif text-2xl">Engine catalog</h2>
        <input className="input-field mt-3 w-full" aria-label="Search engines" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search engines, packages, categories" />
        <div className="mt-4 max-h-[68vh] space-y-2 overflow-y-auto">
          {shown.map((entry) => <button type="button" key={entry.id} onClick={() => { setSelected(entry.id); setInput(pretty(entry.exampleInput ?? {})); setResult(null); setError(null); }}
            className={"w-full rounded-lg border p-3 text-left transition " + (selected === entry.id ? "border-cobalt bg-paper-deep" : "border-rule hover:bg-paper-deep")}>
            <div className="flex items-center justify-between gap-2"><span className="font-medium">{entry.label}</span><span className="text-[10px] uppercase tracking-wide text-muted-foreground">{entry.runnable ? "Runnable" : entry.status}</span></div>
            <div className="mt-1 text-xs text-muted-foreground">{entry.packageName} · {entry.category}</div>
          </button>)}
          {shown.length === 0 && <div className="p-3 text-sm text-muted-foreground">No matching capabilities.</div>}
        </div>
      </section>
      <section className="rounded-xl border border-rule bg-card p-5">
        {selectedEntry ? <>
          <h2 className="font-serif text-2xl">{selectedEntry.label}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{selectedEntry.description}</p>
          <div className="mt-3 text-xs text-muted-foreground">Source: {selectedEntry.packageName} · Package maturity: {selectedEntry.status} · Studio runner: {selectedEntry.runnable ? "connected" : "not bound"}</div>
          {selectedEntry.runnable ? <>
            <label htmlFor="studio-engine-input" className="mt-6 block text-sm font-medium">JSON input</label>
            <textarea id="studio-engine-input" className="mt-2 min-h-52 w-full rounded-lg border border-rule bg-paper p-3 font-mono text-xs" value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void execute()} disabled={loading} className="rounded-lg bg-cobalt px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{loading ? "Executing…" : "Run existing engine"}</button>
              <button type="button" onClick={() => setInput(pretty(selectedEntry.exampleInput ?? {}))} className="rounded-lg border border-rule px-4 py-2 text-sm">Restore example</button>
            </div>
          </> : <div className="mt-6 rounded-lg border border-rule bg-paper-deep p-4 text-sm">The package is registered, but Studio has no approved direct runner for it. Its implementation status is not permission to execute it; add a validated runtime adapter with the required data, access, and approval gates.</div>}
          {error && <div role="alert" className="mt-5 rounded-lg border border-red-300 p-4 text-sm text-red-700">{error}</div>}
          {result && <div className="mt-5">
            <h3 className="text-lg font-medium">Actual engine output</h3>
            <p className="mt-1 text-xs text-muted-foreground">Executed on the server · Read-only · No document storage, payment, mailing, or filing</p>
            <pre className="mt-3 max-h-[50vh] overflow-auto rounded-lg border border-rule bg-paper-deep p-4 text-xs">{pretty(result.output)}</pre>
            {result.limitations.map((limitation) => <p key={limitation} className="mt-2 text-xs text-muted-foreground">{limitation}</p>)}
          </div>}
        </> : <p className="text-sm text-muted-foreground">Loading the capability registry…</p>}
      </section>
    </div>
  </main>;
}

export const Route = createFileRoute("/_authenticated/studio/engines")({
  head: () => ({ meta: [{ title: "Engine Workbench — MailMyPDF Studio" }, { name: "robots", content: "noindex" }] }),
  component: EngineWorkbench,
});
