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
  plan: {
    decision: "review-existing-workflow" | "needs-template-review";
    candidateId: string | null;
    candidates: Array<{
      id: string;
      label: string;
      publicHref: string;
      chatExecutable: boolean;
      matchedTerms: string[];
      score: number;
    }>;
  } | null;
  selectedWorkflowId: string | null;
  build: {
    request: {
      id: string;
      label: string;
      startTemplate: "notice-response" | "records-request";
      adoptExisting?: boolean;
      noticeProfile?: Record<string, unknown>;
    };
    canonicalId: string;
    sectionId: string;
    slug: string;
    filePaths: string[];
  } | null;
  buildArtifact: {
    branch: string;
    baseSha: string;
    commitSha: string;
    specPath: string;
    profileRegistryPath: string;
    configPath: string;
    changedFiles: string[];
    checks: Array<{ id: string; command: string; ok: boolean; summary: string }>;
    builtAt: string;
  } | null;
  publicationArtifact: {
    repository: string;
    branch: string;
    commitSha: string;
    pullRequestNumber: number;
    pullRequestUrl: string;
    publishedAt: string;
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
  const [templateFamily, setTemplateFamily] = useState<"notice-response" | "records-request">("notice-response");
  const [templateId, setTemplateId] = useState("");
  const [templateLabel, setTemplateLabel] = useState("");
  const [adoptExisting, setAdoptExisting] = useState(false);
  const [noticeProfileJson, setNoticeProfileJson] = useState("");
  const [pending, setPending] = useState<"report" | "job" | "review" | "build" | "publish" | "cancel" | null>("report");
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
      let noticeProfile: Record<string, unknown> | undefined;
      if (job.stage === "template_review" && templateFamily === "notice-response") {
        if (!noticeProfileJson.trim()) {
          throw new Error("A reviewed Notice Respond profile is required.");
        }
        const parsed = JSON.parse(noticeProfileJson) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Notice Respond profile JSON must be an object.");
        }
        noticeProfile = parsed as Record<string, unknown>;
      }

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
                  ...(adoptExisting ? { adoptExisting: true } : {}),
                  ...(noticeProfile ? { noticeProfile } : {}),
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

  function useCatalogCandidate(candidate: NonNullable<FactoryJob["plan"]>["candidates"][number]) {
    const family = candidate.id.startsWith("records-request/")
      ? "records-request"
      : candidate.id.startsWith("notice-respond/")
        ? "notice-response"
        : null;
    if (!family) return;
    setTemplateFamily(family);
    setTemplateId(candidate.id);
    setTemplateLabel(candidate.label);
    setAdoptExisting(true);
    if (family === "records-request") setNoticeProfileJson("");
  }

  async function runBuild(job: FactoryJob) {
    if (pending) return;
    setPending("build");
    setError(null);
    try {
      const payload = await request(`/api/studio/workflows/jobs/${job.id}/build`, {
        method: "POST",
      }) as { job: FactoryJob };
      upsertJob(payload.job);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to run the local supervised build.");
      await refresh();
    } finally {
      setPending(null);
    }
  }

  async function publish(job: FactoryJob) {
    if (pending) return;
    setPending("publish");
    setError(null);
    try {
      const payload = await request(`/api/studio/workflows/jobs/${job.id}/publish`, {
        method: "POST",
      }) as { job: FactoryJob };
      upsertJob(payload.job);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to publish the accepted proposal as a GitHub PR.");
      await refresh();
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
              <div className="rounded-lg border border-rule bg-ivory p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-stone">Next boundary</div>
                <div className="mt-1 text-sm text-navy">
                  {activeJob.review.required ? "Administrator review" : activeJob.stage === "acceptance" ? "Acceptance executor" : activeJob.stage === "build" ? "Deterministic build" : terminal(activeJob) ? "None" : "Factory execution"}
                </div>
              </div>
            </div>

            {activeJob.buildArtifact && (
              <div className="mt-5 rounded-lg border border-rule bg-ivory p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone">Build artifact</div>
                <div className="mt-2 break-all font-mono text-xs text-navy">{activeJob.buildArtifact.branch}</div>
                <div className="mt-1 break-all font-mono text-[11px] text-stone">{activeJob.buildArtifact.commitSha}</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {activeJob.buildArtifact.checks.map((check) => (
                    <div key={check.id} className="rounded-md border border-rule bg-paper p-3 text-xs">
                      <div className={check.ok ? "font-semibold text-emerald-700" : "font-semibold text-error"}>
                        {check.ok ? "Passed" : "Failed"} · {check.id}
                      </div>
                      <div className="mt-1 break-words font-mono text-[10px] text-stone">{check.command}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-stone">
                  {activeJob.buildArtifact.changedFiles.length} proposal file(s) committed locally.
                  {activeJob.publicationArtifact ? " The accepted commit has been pushed for GitHub review." : " Nothing has been pushed or published yet."}
                </p>
              </div>
            )}

            {activeJob.publicationArtifact && (
              <div className="mt-5 rounded-lg border border-rule bg-ivory p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone">Publication artifact</div>
                <a
                  href={activeJob.publicationArtifact.pullRequestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm font-semibold text-navy underline decoration-brass/50 underline-offset-2"
                >
                  GitHub PR #{activeJob.publicationArtifact.pullRequestNumber}
                </a>
                <div className="mt-1 break-all font-mono text-[11px] text-stone">
                  {activeJob.publicationArtifact.repository} · {activeJob.publicationArtifact.branch}
                </div>
                <p className="mt-2 text-xs text-stone">Proposal published for review only. It has not been merged or deployed.</p>
              </div>
            )}

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
                {activeJob.plan?.candidates.some(
                  (candidate) =>
                    !candidate.chatExecutable &&
                    (candidate.id.startsWith("records-request/") ||
                      candidate.id.startsWith("notice-respond/")),
                ) && (
                  <div className="sm:col-span-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-navy">
                      Existing catalog candidates
                    </div>
                    <p className="mt-1 text-xs leading-5 text-stone">
                      Prefer upgrading an existing canonical workflow over creating a duplicate ID. Adoption preserves its reviewed public config and canonical metadata, then replaces only factory-owned wrappers after acceptance.
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {activeJob.plan.candidates
                        .filter(
                          (candidate) =>
                            !candidate.chatExecutable &&
                            (candidate.id.startsWith("records-request/") ||
                              candidate.id.startsWith("notice-respond/")),
                        )
                        .map((candidate) => (
                          <button
                            key={candidate.id}
                            type="button"
                            onClick={() => useCatalogCandidate(candidate)}
                            className="rounded-md border border-rule bg-paper p-3 text-left hover:border-brass"
                          >
                            <div className="text-sm font-semibold text-navy">{candidate.label}</div>
                            <div className="mt-1 break-all font-mono text-[10px] text-stone">{candidate.id}</div>
                            <div className="mt-2 text-xs text-brass">Adopt catalog workflow</div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                <label className="text-xs font-semibold uppercase tracking-wider text-navy">
                  Factory family
                  <select
                    value={templateFamily}
                    onChange={(event) => setTemplateFamily(event.target.value as "notice-response" | "records-request")}
                    className="mt-2 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm font-normal normal-case tracking-normal text-navy"
                  >
                    <option value="notice-response">Notice response</option>
                    <option value="records-request">Records request</option>
                  </select>
                </label>
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
                    placeholder={templateFamily === "notice-response" ? "notice-respond/workflow-slug" : "records-request/workflow-slug"}
                    className="mt-2 w-full rounded-md border border-rule bg-paper px-3 py-2 font-mono text-sm font-normal normal-case tracking-normal text-navy"
                  />
                  <span className="mt-1 block font-sans text-[11px] font-normal normal-case tracking-normal text-stone">
                    The materializer validates that the section and runtime family agree before the build recipe is persisted.
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-md border border-rule bg-paper p-3 text-sm text-navy sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={adoptExisting}
                    onChange={(event) => setAdoptExisting(event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <strong>Adopt existing canonical catalog workflow</strong>
                    <span className="mt-1 block text-xs font-normal leading-5 text-stone">
                      Use this only when the canonical ID already exists but is not executable. The factory preserves reviewed public config, authority, and legacy metadata and uses the materializer&apos;s reviewed adoption guard for standard route wrappers.
                    </span>
                  </span>
                </label>
                {templateFamily === "notice-response" && (
                  <label className="text-xs font-semibold uppercase tracking-wider text-navy sm:col-span-2">
                    Reviewed notice profile JSON
                    <textarea
                      value={noticeProfileJson}
                      onChange={(event) => setNoticeProfileJson(event.target.value)}
                      rows={12}
                      spellCheck={false}
                      placeholder={'{"domain":"tax","noticeLabel":"State tax notice","primaryDocumentId":"state-tax-notice","primaryDocumentLabel":"State tax notice","extractionSchema":"state.tax.notice.v1","sourcePurpose":"state_tax_notice","responseModeLabel":"How do you want to respond?","responseModes":[{"value":"disagree","label":"Disagree"}],"evidenceKinds":[{"value":"supporting-record","label":"Supporting record"}],"explanationRequiredModes":["disagree"],"explanationLabel":"Explain your response","explanationHint":"Use only verified facts.","requestedActionDefault":"Please review my response and supporting records.","analysisInstructions":"Reviewer-authored source-grounding instructions.","draftInstructions":"Reviewer-authored drafting instructions."}'}
                      className="mt-2 w-full rounded-md border border-rule bg-paper px-3 py-2 font-mono text-xs font-normal normal-case tracking-normal text-navy"
                    />
                    <span className="mt-1 block font-sans text-[11px] font-normal normal-case tracking-normal text-stone">
                      Required for the current tax-notice adapter. The factory validates and preserves these reviewer-authored rules; it does not invent legal authority, deadlines, addresses, remedies, or response modes. Non-tax notice families require a separate generic official-notice runtime.
                    </span>
                  </label>
                )}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {activeJob.status === "awaiting_review" && activeJob.review.required && activeJob.review.reason !== "generated-workflow-publication" && (
                <button type="button" onClick={() => void approve(activeJob)} disabled={pending !== null || (activeJob.stage === "template_review" && (!templateId.trim() || !templateLabel.trim() || (templateFamily === "notice-response" && !noticeProfileJson.trim())))} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50">
                  <CheckCircle2 size={16} /> {pending === "review" ? "Approving…" : "Approve next stage"}
                </button>
              )}
              {activeJob.stage === "acceptance" && activeJob.status === "queued" && (
                <button type="button" onClick={() => void runBuild(activeJob)} disabled={pending !== null} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50">
                  <RefreshCw size={16} className={pending === "build" ? "animate-spin" : ""} />
                  {pending === "build" ? "Building and testing…" : "Run local supervised build"}
                </button>
              )}
              {activeJob.stage === "publication_review" && activeJob.review.reason === "generated-workflow-publication" && (
                <button type="button" onClick={() => void publish(activeJob)} disabled={pending !== null} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50">
                  <ArrowRight size={16} />
                  {pending === "publish" ? "Publishing proposal…" : "Create GitHub PR"}
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
