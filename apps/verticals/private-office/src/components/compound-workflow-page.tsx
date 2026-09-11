import { Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Loader2,
  Play,
  ShieldCheck,
} from "lucide-react";
import { PrivateOfficeChrome } from "@/components/private-office-chrome";
import {
  compoundWorkflows,
  type CompoundWorkflowId,
} from "@/domain/compound-workflows";
import type {
  CompoundCapabilityRun,
  CompoundMatterState,
} from "@/domain/compound-workflow-runtime";
import { useAuth } from "@/lib/use-auth";
import {
  createCompoundMatter,
  getCompoundMatter,
  runCompoundCapability,
  startCompoundMatterPhase,
} from "@/lib/fns/compound-matter";

type ParsedEvidenceRelation = "supports" | "contradicts" | "qualifies" | "missing";
type ParsedEvidenceType = "document" | "fact" | "entity" | "external";

function nonEmptyLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseFacts(value: string) {
  return nonEmptyLines(value).map((line, index) => {
    const [subject, predicate, ...rest] = line.split("|").map((part) => part.trim());
    const factValue = rest.join(" | ").trim();
    if (!subject || !predicate || !factValue) {
      throw new Error(
        `Fact line ${index + 1} must use: subject | predicate | value`,
      );
    }
    return {
      subject,
      predicate,
      value: factValue,
      provenanceLevel: "user_provided" as const,
    };
  });
}

function parseTimeline(value: string) {
  return nonEmptyLines(value).map((line, index) => {
    const [date, eventType, ...rest] = line.split("|").map((part) => part.trim());
    if (!eventType) {
      throw new Error(
        `Timeline line ${index + 1} must use: YYYY-MM-DD | event type | description`,
      );
    }
    return {
      date: date || undefined,
      eventType,
      description: rest.join(" | ").trim() || undefined,
      provenanceLevel: "user_provided" as const,
    };
  });
}

function parseEvidence(value: string) {
  const allowedRelations = new Set<ParsedEvidenceRelation>([
    "supports",
    "contradicts",
    "qualifies",
    "missing",
  ]);
  const allowedTypes = new Set<ParsedEvidenceType>([
    "document",
    "fact",
    "entity",
    "external",
  ]);

  return nonEmptyLines(value).map((line, index) => {
    const [claimId, relationRaw, evidenceTypeRaw, evidenceId, ...rest] = line
      .split("|")
      .map((part) => part.trim());
    const relation = relationRaw as ParsedEvidenceRelation;
    const evidenceType = evidenceTypeRaw as ParsedEvidenceType;
    if (
      !claimId ||
      !allowedRelations.has(relation) ||
      !allowedTypes.has(evidenceType) ||
      !evidenceId
    ) {
      throw new Error(
        `Evidence line ${index + 1} must use: claim | supports/contradicts/qualifies/missing | document/fact/entity/external | evidence id | explanation`,
      );
    }
    return {
      claimId,
      relation,
      evidenceType,
      evidenceId,
      explanation: rest.join(" | ").trim() || undefined,
      provenanceLevel: "user_provided" as const,
    };
  });
}

export function CompoundWorkflowPage({ workflowId }: { workflowId: CompoundWorkflowId }) {
  const workflow = compoundWorkflows[workflowId];
  const { user, loading: authLoading } = useAuth();
  const search = useSearch({ strict: false }) as { matterId?: string };
  const [matter, setMatter] = useState<CompoundMatterState | null>(null);
  const [creating, setCreating] = useState(false);
  const [startingPhase, setStartingPhase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [analysisContext, setAnalysisContext] = useState("");
  const [factsText, setFactsText] = useState("");
  const [timelineText, setTimelineText] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [runningCapability, setRunningCapability] = useState(false);

  useEffect(() => {
    if (!user || !search.matterId || matter?.id === search.matterId) return;
    let cancelled = false;
    setResuming(true);
    setError(null);

    getCompoundMatter({ data: { matterId: search.matterId } })
      .then((result) => {
        if (cancelled) return;
        const loaded = result.matter as CompoundMatterState;
        if (loaded.workflowId !== workflowId) {
          throw new Error("This matter belongs to a different compound workflow.");
        }
        setMatter(loaded);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to resume this matter.");
        }
      })
      .finally(() => {
        if (!cancelled) setResuming(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, search.matterId, workflowId, matter?.id]);

  const activePhaseState = matter?.phases.find(
    (phase) => phase.status === "in_progress",
  );
  const activePhaseDefinition = activePhaseState
    ? workflow.phases.find((phase) => phase.id === activePhaseState.phaseId)
    : undefined;

  useEffect(() => {
    const first = activePhaseDefinition?.capabilities[0];
    if (!first) {
      setSelectedCapability("");
      return;
    }
    if (!activePhaseDefinition.capabilities.includes(selectedCapability)) {
      setSelectedCapability(first);
    }
  }, [activePhaseDefinition, selectedCapability]);

  async function createMatter() {
    setCreating(true);
    setError(null);
    try {
      const result = await createCompoundMatter({ data: { workflowId } });
      const created = result.matter as CompoundMatterState;
      setMatter(created);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("matterId", created.id);
        window.history.replaceState({}, "", url);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create the matter.");
    } finally {
      setCreating(false);
    }
  }

  async function beginFirstPhase() {
    if (!matter) return;
    const firstReady = matter.phases.find((phase) => phase.status === "ready");
    if (!firstReady) return;

    setStartingPhase(true);
    setError(null);
    try {
      const result = await startCompoundMatterPhase({
        data: {
          matterId: matter.id,
          expectedVersion: matter.version,
          phaseId: firstReady.phaseId,
        },
      });
      setMatter(result.matter as CompoundMatterState);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start this phase.");
    } finally {
      setStartingPhase(false);
    }
  }

  async function executeSelectedCapability() {
    if (!matter || !activePhaseState || !selectedCapability) return;
    setRunningCapability(true);
    setError(null);
    try {
      const result = await runCompoundCapability({
        data: {
          matterId: matter.id,
          expectedVersion: matter.version,
          phaseId: activePhaseState.phaseId,
          capabilityLabel: selectedCapability,
          jurisdiction: jurisdiction.trim() || undefined,
          context: analysisContext.trim() || undefined,
          facts: parseFacts(factsText),
          timelineEvents: parseTimeline(timelineText),
          evidence: parseEvidence(evidenceText),
        },
      });
      setMatter(result.matter as CompoundMatterState);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to execute this capability.",
      );
    } finally {
      setRunningCapability(false);
    }
  }

  const firstReady = matter?.phases.find((phase) => phase.status === "ready");
  const latestRun = matter?.capabilityRuns
    ?.filter((run) => run.phaseId === activePhaseState?.phaseId)
    .at(-1) as CompoundCapabilityRun | undefined;

  return (
    <main className="min-h-screen bg-ivory text-charcoal">
      <PrivateOfficeChrome />
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14">
        <div className="max-w-4xl">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Private Office · Compound workflow
          </div>
          <h1 className="font-serif text-4xl leading-tight md:text-6xl">{workflow.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">{workflow.summary}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            {authLoading || resuming ? (
              <button disabled className="inline-flex items-center gap-2 rounded-full bg-slate-300 px-6 py-3 text-sm font-semibold text-white">
                <Loader2 className="h-4 w-4 animate-spin" /> {resuming ? "Resuming matter" : "Checking account"}
              </button>
            ) : !user ? (
              <Link
                to="/auth"
                search={{ returnTo: `/workflows/${workflowId}` }}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white"
              >
                Sign in to start <ArrowRight className="h-4 w-4" />
              </Link>
            ) : !matter ? (
              <button
                onClick={createMatter}
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {creating ? "Creating matter…" : "Start this compound matter"}
              </button>
            ) : firstReady ? (
              <button
                onClick={beginFirstPhase}
                disabled={startingPhase}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {startingPhase ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {startingPhase ? "Starting phase…" : "Begin next ready phase"}
              </button>
            ) : null}

            <Link
              to="/workflows"
              className="inline-flex items-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold"
            >
              All workflows
            </Link>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        {matter && (
          <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Live matter
                </div>
                <h2 className="mt-2 font-serif text-3xl">{workflow.title}</h2>
                <p className="mt-2 font-mono text-xs text-slate-500">
                  Matter {matter.id} · version {matter.version}
                </p>
              </div>
              <Link to="/dashboard" className="text-sm font-semibold underline underline-offset-4">
                Open Private Office dashboard
              </Link>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {matter.phases.map((phase, index) => {
                const definition = workflow.phases.find((candidate) => candidate.id === phase.phaseId);
                return (
                  <div key={phase.phaseId} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Phase {index + 1}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                        {phase.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <h3 className="mt-2 font-semibold text-slate-950">{definition?.title ?? phase.phaseId}</h3>
                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      {phase.gates.map((gate) => (
                        <div key={gate.gate} className="flex justify-between gap-3">
                          <span>{gate.gate}</span>
                          <span>{gate.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {matter && activePhaseDefinition && activePhaseState && (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Active phase analysis
              </div>
              <h2 className="mt-2 font-serif text-3xl">{activePhaseDefinition.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Run one of this phase&apos;s canonical capabilities. Inputs stay attached to this
                matter through the resulting capability record; outputs record their provider,
                platform capability, adapter, status, and execution time.
              </p>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="input-label">Capability</label>
                  <select
                    className="input-field"
                    value={selectedCapability}
                    onChange={(event) => setSelectedCapability(event.target.value)}
                  >
                    {activePhaseDefinition.capabilities.map((capability) => (
                      <option key={capability} value={capability}>
                        {capability}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="input-label">Jurisdiction</label>
                  <input
                    className="input-field"
                    value={jurisdiction}
                    onChange={(event) => setJurisdiction(event.target.value)}
                    placeholder="Example: California, Humboldt County"
                  />
                </div>

                <div>
                  <label className="input-label">Analysis context</label>
                  <textarea
                    className="input-field"
                    rows={4}
                    value={analysisContext}
                    onChange={(event) => setAnalysisContext(event.target.value)}
                    placeholder="Describe the question this capability should address. Authority research remains blocked unless a live authority provider is configured."
                  />
                </div>

                <div>
                  <label className="input-label">Facts</label>
                  <textarea
                    className="input-field font-mono text-xs"
                    rows={5}
                    value={factsText}
                    onChange={(event) => setFactsText(event.target.value)}
                    placeholder={"subject | predicate | value\nhearing | hearing_date | 2026-09-20"}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    One fact per line. These are stored as user-provided provenance unless later verified.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="input-label">Timeline events</label>
                  <textarea
                    className="input-field font-mono text-xs"
                    rows={5}
                    value={timelineText}
                    onChange={(event) => setTimelineText(event.target.value)}
                    placeholder={"2026-09-01 | agency_notice | Notice received\n2026-09-20 | hearing | Hearing stated in notice"}
                  />
                </div>

                <div>
                  <label className="input-label">Evidence</label>
                  <textarea
                    className="input-field font-mono text-xs"
                    rows={6}
                    value={evidenceText}
                    onChange={(event) => setEvidenceText(event.target.value)}
                    placeholder={"claim-1 | supports | document | notice-pdf | Agency notice\nclaim-1 | contradicts | fact | witness-2 | Conflicting account"}
                  />
                </div>

                <button
                  type="button"
                  onClick={executeSelectedCapability}
                  disabled={runningCapability || !selectedCapability}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {runningCapability ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {runningCapability ? "Running capability…" : "Run capability"}
                </button>
              </div>
            </div>

            {latestRun && (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Latest persisted capability run
                    </div>
                    <h3 className="mt-1 font-semibold text-slate-950">
                      {latestRun.capabilityLabel}
                    </h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {latestRun.status}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Platform</dt>
                    <dd className="mt-1">{latestRun.canonicalCapabilityId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Adapter</dt>
                    <dd className="mt-1">{latestRun.adapterId ?? "platform"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Provider</dt>
                    <dd className="mt-1">{latestRun.provider}</dd>
                  </div>
                </dl>

                {latestRun.messages.length > 0 && (
                  <ul className="mt-4 space-y-1 text-sm text-slate-700">
                    {latestRun.messages.map((message, index) => (
                      <li key={index}>• {message}</li>
                    ))}
                  </ul>
                )}

                {latestRun.output !== null && latestRun.output !== undefined && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold">
                      View structured output
                    </summary>
                    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-4 text-xs text-slate-700">
                      {JSON.stringify(latestRun.output, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </section>
        )}

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <ShieldCheck className="h-6 w-6" />
            <h2 className="mt-4 font-serif text-2xl">Major outcome</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{workflow.majorOutcome}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <CheckCircle2 className="h-6 w-6" />
            <h2 className="mt-4 font-serif text-2xl">Controlled execution</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Evidence, authority, deadline, and human-review gates control progression. Consequential
              actions are never automatic.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <GitBranch className="h-6 w-6" />
            <h2 className="mt-4 font-serif text-2xl">{workflow.phases.length} linked phases</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Each phase unlocks only when its prerequisite record is complete, preserving a traceable
              path from intake through final proof or handoff.
            </p>
          </div>
        </div>

        <section className="mt-16">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Orchestration map
            </div>
            <h2 className="mt-3 font-serif text-4xl">One major objective, multiple governed operations.</h2>
          </div>
          <div className="mt-8 space-y-5">
            {workflow.phases.map((phase, index) => (
              <article key={phase.id} className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-start">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-2xl">{phase.title}</h3>
                    <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{phase.objective}</p>
                    <div className="mt-5 grid gap-5 lg:grid-cols-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Capabilities</div>
                        <ul className="mt-2 space-y-1 text-sm text-slate-700">
                          {phase.capabilities.map((item) => <li key={item}>• {item}</li>)}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Outputs</div>
                        <ul className="mt-2 space-y-1 text-sm text-slate-700">
                          {phase.outputs.map((item) => <li key={item}>• {item}</li>)}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gates</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {phase.gates.map((gate) => (
                            <span key={gate} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                              {gate}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-7">
            <h2 className="font-serif text-3xl">What to gather first</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
              {workflow.entryDocuments.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-7">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="font-serif text-3xl">Escalate for professional review</h2>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
              {workflow.attorneyEscalationTriggers.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 p-7 text-white">
          <h2 className="font-serif text-3xl">Guardrails</h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-200">
            {workflow.guardrails.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </section>
      </section>
    </main>
  );
}
