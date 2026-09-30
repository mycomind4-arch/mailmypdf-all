import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { authenticatedHeaders } from "@/lib/authenticated-client";

type FactoryEntry = {
  id: string;
  maturity: string;
  policyFamily: string | null;
  chatExecutable: boolean;
  reason: string;
  diagnostics: Array<{ code: string; message: string }>;
};

type FactoryReport = {
  total: number;
  chatExecutable: number;
  awaitingChatContract: number;
  workflows: FactoryEntry[];
};

type FactoryJob = {
  id: string;
  revision: number;
  status: "queued" | "running" | "awaiting_review" | "completed" | "failed" | "cancelled";
  stage: "intake" | "match" | "certify" | "template_review" | "build" | "acceptance" | "publication_review" | "complete";
  problem: string;
  selectedWorkflowId: string | null;
  build: {
    canonicalId: string;
    sectionId: string;
    slug: string;
    artifact: null | {
      repository: string;
      branch: string;
      baseCommitSha: string;
      commitSha: string;
      pullRequestNumber: number;
      pullRequestUrl: string;
    };
  } | null;
  diagnostics: Array<{ code: string; message: string; severity: "info" | "warning" | "error" }>;
  review: { required: boolean; reason: string | null; approvedAt: string | null };
  updatedAt: string;
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

function stageLabel(stage: FactoryJob["stage"]) {
  return stage.replaceAll("_", " ");
}

function terminal(job: FactoryJob) {
  return job.status === "completed" || job.status === "failed" || job.status === "cancelled";
}

export function WorkflowFactoryPage({ request = factoryRequest }: {
  request?: (path: string, init?: RequestInit) => Promise<unknown>;
}) {
  const [report, setReport] = useState<FactoryReport | null>(null);
  const [jobs, setJobs] = useState<FactoryJob[]>([]);
  const [activeJob, setActiveJob] = useState<FactoryJob | null>(null);
  const [problem, setProblem] = useState("");
  const [filter, setFilter] = useState<"ready" | "contracts" | "all">("ready");
  const [search, setSearch] = useState("");
  const templateFamily = "records-request" as const;
  const [templateId, setTemplateId] = useState("");
  const [templateLabel, setTemplateLabel] = useState("");
  const [pending, setPending] = useState<"report" | "job" | "review" | "run" | "cancel" | null>("report");
  const [error, setError] = useState<string | null>(null);

  function upsertJob(job: FactoryJob) {
    setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]);
    setActiveJob(job);
  }

  async function refresh() {
    setPending("report");
    setError(null);
    try {
      const [readiness, queue] = await Promise.all([
        request("/api/studio/workflows/readiness") as Promise<FactoryReport>,
        request("/api/studio/workflows/jobs/") as Promise<{ jobs: FactoryJob[] }>,
      ]);
      setReport(readiness);
      setJobs(queue.jobs);
      setActiveJob((current) =>
        current ? queue.jobs.find((item) => item.id === current.id) ?? current : queue.jobs[0] ?? null,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load factory state.");
    } finally {
      setPending(null);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!problem.trim() || pending) return;
    setPending("job");
    setError(null);
    try {
      const payload = await request("/api/studio/workflows/jobs/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ problem: problem.trim() }),
      }) as { job: FactoryJob };
      upsertJob(payload.job);
      setProblem("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start factory job.");
    } finally {
      setPending(null);
    }
  }

  async function approve(job: FactoryJob) {
    if (pending) return;
    setPending("review");
    setError(null);
    try {
      const payload = await request(`/api/studio/workflows/jobs/${job.id}/review`, {
        method: "POST",
        ...(job.stage === "template_review"
          ? {
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                templateRequest: {
                  id: templateId.trim(),
                  label: templateLabel.trim(),
                  startTemplate: templateFamily,
                },
              }),
            }
          : {}),
      }) as { job: FactoryJob };
      upsertJob(payload.job);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to approve factory review.");
    } finally {
      setPending(null);
    }
  }

  async function resume(job: FactoryJob) {
    if (pending) return;
    setPending("run");
    setError(null);
    try {
      const payload = await request(`/api/studio/workflows/jobs/${job.id}/run`, {
        method: "POST",
      }) as { job: FactoryJob };
      upsertJob(payload.job);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to resume factory job.");
    } finally {
      setPending(null);
    }
  }

  async function cancel(job: FactoryJob) {
    if (pending) return;
    setPending("cancel");
    setError(null);
    try {
      const payload = await request(`/api/studio/workflows/jobs/${job.id}/cancel`, {
        method: "POST",
      }) as { job: FactoryJob };
      upsertJob(payload.job);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to cancel factory job.");
    } finally {
      setPending(null);
    }
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
            <p className="text-xs font-semibold uppercase tracking-[0.19em] text-brass">Supervised automation</p>
            <h1 className="mt-2 font-serif text-4xl leading-tight text-navy sm:text-5xl">Workflow factory</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone">
              Start with a problem. The factory persists its work, advances every certified deterministic stage, and stops at review or build boundaries.
            </p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={pending !== null} className="inline-flex items-center gap-2 rounded-md border border-rule bg-paper px-3 py-2 text-sm font-medium text-navy hover:border-navy disabled:opacity-50">
            <RefreshCw size={15} className={pending === "report" ? "animate-spin" : ""} /> Refresh factory
          </button>
        </header>

        {error && <div role="alert" className="mt-6 rounded-lg border border-error/30 bg-paper p-4 text-sm text-error">{error}</div>}

        <section aria-labelledby="factory-start-title" className="mt-8 rounded-xl border border-rule bg-paper p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <Search className="mt-1 text-brass" size={20} />
            <div>
              <h2 id="factory-start-title" className="font-serif text-2xl text-navy">Start a factory job</h2>
              <p className="mt-1 text-sm text-stone">The job is durable. Existing certified workflows advance automatically; new templates stop for review before build work begins.</p>
            </div>
          </div>
          <form onSubmit={(event) => void submit(event)} className="mt-5">
            <label htmlFor="factory-problem" className="block text-xs font-semibold uppercase tracking-wider text-navy">What needs to be handled?</label>
            <textarea id="factory-problem" value={problem} onChange={(event) => setProblem(event.target.value)} maxLength={4000} rows={3} placeholder="For example, I received an IRS CP14 notice and need to respond." className="mt-2 w-full resize-y rounded-lg border border-rule bg-ivory p-3 text-sm leading-6 outline-none placeholder:text-stone/70 focus:border-brass focus:ring-2 focus:ring-brass/20" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-stone">No code is published automatically. Review and publication remain separate boundaries.</p>
              <button disabled={!problem.trim() || pending !== null} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-paper hover:bg-charcoal disabled:opacity-50">
                {pending === "job" ? "Running factory…" : "Start factory job"}<ArrowRight size={15} />
              </button>
            </div>
          </form>
        </section>

        {activeJob && (
          <section aria-labelledby="active-job-title" className="mt-8 rounded-xl border border-rule bg-paper p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Active job · revision {activeJob.revision}</p>
                <h2 id="active-job-title" className="mt-1 font-serif text-2xl text-navy">{stageLabel(activeJob.stage)}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-stone">{activeJob.problem}</p>
              </div>
              <span className="rounded-full bg-ivory px-3 py-1.5 text-xs font-semibold text-navy">{activeJob.status.replaceAll("_", " ")}</span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-rule bg-ivory p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-stone">Selected workflow</div>
                <div className="mt-1 break-all font-mono text-sm text-navy">{activeJob.selectedWorkflowId ?? "New template review required"}</div>
              </div>
              {activeJob.build?.artifact && (
                <div className="rounded-lg border border-rule bg-ivory p-4 sm:col-span-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-stone">Factory pull request</div>
                  <a
                    href={activeJob.build.artifact.pullRequestUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block break-all font-mono text-sm text-navy underline decoration-brass/50 underline-offset-2"
                  >
                    PR #{activeJob.build.artifact.pullRequestNumber} · {activeJob.build.artifact.branch}
                  </a>
                  <div className="mt-1 break-all font-mono text-[11px] text-stone">
                    {activeJob.build.artifact.commitSha}
                  </div>
                </div>
              )}
              <div className="rounded-lg border border-rule bg-ivory p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-stone">Next boundary</div>
                <div className="mt-1 text-sm text-navy">
                  {activeJob.review.required ? "Administrator review" : activeJob.stage === "acceptance" ? "Acceptance executor" : activeJob.stage === "build" ? "Deterministic build" : terminal(activeJob) ? "None" : "Factory execution"}
                </div>
              </div>
            </div>

            {activeJob.diagnostics.length > 0 && (
              <div className="mt-4 space-y-2">
                {activeJob.diagnostics.map((item, index) => (
                  <div key={`${item.code}-${index}`} className="flex items-start gap-2 rounded-lg border border-rule bg-ivory p-3 text-sm text-stone">
                    {item.severity === "error" ? <XCircle size={16} className="mt-0.5 shrink-0 text-error" /> : <CircleAlert size={16} className="mt-0.5 shrink-0 text-brass" />}
                    <span><strong className="text-navy">{item.code}</strong>: {item.message}</span>
                  </div>
                ))}
              </div>
            )}

            {activeJob.stage === "template_review" && activeJob.status === "awaiting_review" && (
              <div className="mt-5 grid gap-4 rounded-lg border border-rule bg-ivory p-4 sm:grid-cols-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-navy">
                  Factory family
                  <div className="mt-2 rounded-md border border-rule bg-paper px-3 py-2 text-sm font-normal normal-case tracking-normal text-navy">
                    Records request
                  </div>
                </div>
                <label className="text-xs font-semibold uppercase tracking-wider text-navy">
                  Workflow label
                  <input
                    value={templateLabel}
                    onChange={(event) => setTemplateLabel(event.target.value)}
                    placeholder="Example: State Tax Balance Notice Response"
                    className="mt-2 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm font-normal normal-case tracking-normal text-navy"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wider text-navy sm:col-span-2">
                  Canonical workflow ID
                  <input
                    value={templateId}
                    onChange={(event) => setTemplateId(event.target.value)}
                    placeholder="records-request/example-records-request"
                    className="mt-2 w-full rounded-md border border-rule bg-paper px-3 py-2 font-mono text-sm font-normal normal-case tracking-normal text-navy"
                  />
                  <span className="mt-1 block font-sans text-[11px] font-normal normal-case tracking-normal text-stone">
                    The materializer validates that the section and runtime family agree before the build recipe is persisted.
                  </span>
                </label>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {(activeJob.status === "queued" || activeJob.status === "running") && (
                <button type="button" onClick={() => void resume(activeJob)} disabled={pending !== null} className="inline-flex items-center gap-2 rounded-md border border-navy px-4 py-2 text-sm font-semibold text-navy disabled:opacity-50">
                  <RefreshCw size={16} className={pending === "run" ? "animate-spin" : ""} />
                  {pending === "run" ? "Checking factory…" : activeJob.stage === "acceptance" ? "Check acceptance" : "Resume factory"}
                </button>
              )}
              {activeJob.status === "awaiting_review" && activeJob.review.required && (
                <button type="button" onClick={() => void approve(activeJob)} disabled={pending !== null || (activeJob.stage === "template_review" && (!templateId.trim() || !templateLabel.trim()))} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50">
                  <CheckCircle2 size={16} /> {pending === "review" ? "Approving…" : "Approve next stage"}
                </button>
              )}
              {!terminal(activeJob) && (
                <button type="button" onClick={() => void cancel(activeJob)} disabled={pending !== null} className="inline-flex items-center gap-2 rounded-md border border-rule px-4 py-2 text-sm font-medium text-stone hover:border-error hover:text-error disabled:opacity-50">
                  <XCircle size={16} /> {pending === "cancel" ? "Cancelling…" : "Cancel job"}
                </button>
              )}
            </div>
          </section>
        )}

        <section aria-labelledby="job-queue-title" className="mt-8 rounded-xl border border-rule bg-paper p-5 shadow-sm sm:p-7">
          <h2 id="job-queue-title" className="font-serif text-2xl text-navy">Factory job queue</h2>
          <p className="mt-1 text-sm text-stone">Durable jobs can be resumed after leaving Studio.</p>
          <div className="mt-4 divide-y divide-rule rounded-lg border border-rule">
            {jobs.slice(0, 20).map((job) => (
              <button key={job.id} type="button" onClick={() => setActiveJob(job)} className="flex w-full items-center justify-between gap-4 bg-paper px-4 py-3 text-left hover:bg-ivory">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-navy">{job.problem}</div>
                  <div className="mt-1 font-mono text-[11px] text-stone">{job.id} · rev {job.revision}</div>
                </div>
                <div className="shrink-0 text-right text-xs text-stone">
                  <div>{stageLabel(job.stage)}</div>
                  <div className="mt-1">{job.status.replaceAll("_", " ")}</div>
                </div>
              </button>
            ))}
            {jobs.length === 0 && pending !== "report" && <p className="p-5 text-sm text-stone">No persistent factory jobs yet.</p>}
          </div>
        </section>

        <section aria-labelledby="factory-readiness-title" className="mt-8 rounded-xl border border-rule bg-paper p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="factory-readiness-title" className="font-serif text-2xl text-navy">Registry readiness</h2>
              <p className="mt-1 text-sm text-stone">Identity, runtime and chat certification are tracked separately.</p>
            </div>
            <ShieldCheck className="text-brass" size={22} />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4" aria-live="polite">
            {([["Canonical", report?.total], ["Chat ready", report?.chatExecutable], ["Contract next", report?.awaitingChatContract]] as const).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-rule bg-ivory p-3 sm:p-4">
                <div className="font-serif text-2xl text-navy sm:text-3xl">{value ?? "—"}</div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-stone">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {([["ready", "Chat ready"], ["contracts", "Needs contract"], ["all", "All workflows"]] as const).map(([value, label]) => (
              <button type="button" key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${filter === value ? "border-navy bg-navy text-paper" : "border-rule text-navy hover:border-navy"}`}>{label}</button>
            ))}
            <label className="ml-auto">
              <span className="sr-only">Filter workflows</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter by name or ID" className="w-full rounded-md border border-rule bg-ivory px-3 py-2 text-sm outline-none focus:border-brass sm:w-56" />
            </label>
          </div>
          <p className="mt-3 text-xs text-stone" aria-live="polite">{pending === "report" ? "Loading readiness…" : `${rows.length} workflows shown`}</p>
          <div className="mt-3 max-h-[440px] divide-y divide-rule overflow-y-auto rounded-lg border border-rule">
            {rows.slice(0, 100).map((item) => (
              <details key={item.id} className="group bg-paper px-4 py-3 open:bg-ivory">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-navy">{item.id}</span>
                  <span className="shrink-0 text-xs text-stone">{item.chatExecutable ? "Chat ready" : item.reason.replaceAll("-", " ")}</span>
                </summary>
                <div className="pt-3 text-xs leading-5 text-stone">
                  <p>Registry maturity: {item.maturity}{item.policyFamily ? ` · ${item.policyFamily}` : ""}</p>
                  {item.diagnostics.map((diagnostic, index) => <p key={`${diagnostic.code}-${index}`} className="mt-1">{diagnostic.code}: {diagnostic.message}</p>)}
                </div>
              </details>
            ))}
            {rows.length === 0 && pending !== "report" && <p className="p-5 text-sm text-stone">No workflows match this filter.</p>}
          </div>
          {rows.length > 100 && <p className="mt-2 text-xs text-stone">Showing the first 100 matches. Narrow the filter to inspect a specific workflow.</p>}
        </section>
      </div>
    </main>
  );
}
