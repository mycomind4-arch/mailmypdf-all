import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { ArrowRight, CheckCircle2, Send, DollarSign } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { workflowProfiles } from "@/domain/workflow-profiles";
import type { StudioWorkflow } from "@/domain/studio-workflow";
import { workflowImages } from "@/lib/workflow-images";
import { useAuth } from "@/lib/use-auth";
import type { WorkflowId } from "@/domain/workflows";

export interface AuthoritySection {
  icon: ComponentType<{
    size?: number;
    className?: string;
    strokeWidth?: number;
  }>;
  title: string;
  content?: string;
  items?: string[];
}

export interface IntakeField {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "textarea";
  rows?: number;
  note?: string;
}

interface WorkflowAuthorityPageProps {
  workflowId: WorkflowId;
  authoritySections: AuthoritySection[];
  intakeFields?: IntakeField[];
  showWorkspace?: boolean;
}

export function WorkflowAuthorityPage({
  workflowId,
  authoritySections,
  intakeFields,
  showWorkspace = true,
}: WorkflowAuthorityPageProps) {
  const profile = workflowProfiles[workflowId];
  const { user } = useAuth();
  const image = workflowImages[workflowId];
  const hasWorkspace = showWorkspace && intakeFields && intakeFields.length > 0;

  const [showWorkspaceUI, setShowWorkspaceUI] = useState(false);
  const [intakeData, setIntakeData] = useState<Record<string, string>>({});
  const [objective, setObjective] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [result, setResult] = useState<null | ReturnType<
    typeof import("@/domain/private-office-workflow").runPrivateOfficeWorkflow
  >>(null);
  const [studioWorkflow, setStudioWorkflow] = useState<StudioWorkflow | null>(
    null,
  );
  const [isStudioPreview, setIsStudioPreview] = useState(false);
  const [isStudioEmbed, setIsStudioEmbed] = useState(false);
  const [studioPhaseId, setStudioPhaseId] = useState<string | null>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const isPreview = search.get("studioPreview") === "draft";
    const isEmbed = search.get("studioEmbed") === "1";
    setIsStudioPreview(isPreview);
    setIsStudioEmbed(isEmbed);
    setStudioPhaseId(search.get("studioPhase"));
    const keyPrefix = isPreview
      ? "private-office-studio-preview-workflow:"
      : "private-office-studio-published-workflow:";
    const key = `${keyPrefix}${workflowId}`;

    const loadStudioWorkflow = () => {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        setStudioWorkflow(null);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (
          parsed &&
          typeof parsed === "object" &&
          Array.isArray((parsed as StudioWorkflow).phases)
        ) {
          setStudioWorkflow(parsed as StudioWorkflow);
        }
      } catch {
        window.localStorage.removeItem(key);
        setStudioWorkflow(null);
      }
    };

    loadStudioWorkflow();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === key) loadStudioWorkflow();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [workflowId]);

  function runAnalysis() {
    if (!user) return;
    import("@/domain/private-office-workflow").then(
      ({ runPrivateOfficeWorkflow }) => {
        const res = runPrivateOfficeWorkflow({
          workflowId,
          documentId: "local-doc",
          text:
            documentText || "Source document text placeholder for analysis.",
          facts: intakeData,
          objective,
        });
        setResult(res);
      },
    );
  }

  const pricingExample = [
    {
      item: "Workflow preparation",
      price: `$${profile.pricing.preparationFee.toFixed(2)}`,
    },
    {
      item: `${profile.pricing.includedResponsePages} response pages included`,
      price: "Included",
    },
    {
      item: "Certified mail with return receipt",
      price: profile.pricing.certifiedReturnReceipt
        ? `$${profile.pricing.certifiedReturnReceipt.toFixed(2)}`
        : "—",
    },
    {
      item: "Estimated total",
      price: `$${(profile.pricing.preparationFee + (profile.pricing.certifiedReturnReceipt ?? 0)).toFixed(2)}`,
      bold: true,
    },
  ];

  const authLink = `/auth?returnTo=${encodeURIComponent(`/workflows/${workflowId}`)}`;
  const defaultHeadline =
    profile.outcome
      .replace(/^Create a documented .*?letter\b/, profile.draftSubject)
      .replace(/^Document and pursue\b/, profile.draftSubject)
      .replace(/^Document a\b/, profile.draftSubject)
      .replace(/^Document your\b/, profile.draftSubject) || profile.draftSubject;
  const landingPage = studioWorkflow?.landingPage;
  const landingHeadline = landingPage?.headline || defaultHeadline;
  const landingDescription = landingPage?.description || profile.problem;
  const landingAction = landingPage?.primaryAction || "Start this matter";
  const selectedStudioPhase = studioPhaseId
    ? studioWorkflow?.phases.find((phase) => phase.id === studioPhaseId)
    : undefined;

  if (isStudioEmbed && studioWorkflow) {
    if (!selectedStudioPhase) {
      return (
        <main className="min-h-screen bg-ivory text-charcoal">
          <div className="flex items-center justify-between border-b border-rule bg-paper px-6 py-4">
            <div className="flex items-center gap-3 font-semibold text-navy">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-navy font-display text-lg text-paper">M</span>
              <span>MailMyPDF <span className="text-xs font-medium tracking-wider text-stone">PRIVATE OFFICE</span></span>
            </div>
            <span className="badge badge-brass">Workflow preview</span>
          </div>
          <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
            <div className="grid items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
              <div>
                <div className="badge badge-brass">{profile.family} workflow</div>
                <h1 className="mt-5 text-4xl leading-tight text-charcoal md:text-5xl">{landingHeadline}</h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-stone">{landingDescription}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" className="btn-brass">{landingAction} <ArrowRight size={16} /></button>
                  <button type="button" className="btn-outline">See how it works</button>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {["Secure records", "Source-backed", "Owner approval", "Mailing proof"].map((item) => (
                    <div key={item} className="rounded-lg border border-rule bg-paper p-3">
                      <CheckCircle2 size={17} className="text-brass" />
                      <div className="mt-2 text-xs font-medium leading-relaxed text-charcoal">{item}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-rule bg-navy shadow-elevated">
                {image ? (
                  <img src={image} alt="" className="aspect-[4/3] h-full w-full object-cover opacity-90" />
                ) : (
                  <div className="aspect-[4/3] bg-navy" />
                )}
                <div className="absolute bottom-4 right-4 max-w-xs rounded-lg bg-paper/95 p-4 shadow-elevated">
                  <div className="flex items-center gap-2 text-sm font-semibold text-charcoal"><CheckCircle2 size={16} className="text-success" /> Designed around your records</div>
                  <p className="mt-2 text-xs leading-relaxed text-stone">A guided, reviewable package with delivery controls at the end.</p>
                </div>
              </div>
            </div>
            <section className="mt-10 rounded-xl border border-rule bg-paper p-5 md:p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div><div className="section-kicker">Simple, guided process</div><h2 className="mt-2 text-2xl text-charcoal">From intake to documented delivery.</h2></div>
                <span className="text-sm text-stone">{studioWorkflow.phases.length} guided phases</span>
              </div>
              <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {studioWorkflow.phases.map((phase, index) => (
                  <li key={phase.id} className="rounded-lg border border-rule bg-ivory p-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-xs font-semibold text-paper">{index + 1}</span>
                    <div className="mt-4 text-sm font-semibold text-charcoal">{phase.title}</div>
                    <p className="mt-2 text-xs leading-relaxed text-stone">{phase.objective}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </main>
      );
    }

    const phaseIndex = studioWorkflow.phases.findIndex(
      (phase) => phase.id === selectedStudioPhase.id,
    );
    const variables = selectedStudioPhase.variables ?? [];
    const journeyIndex =
      phaseIndex === 0
        ? 0
        : phaseIndex < studioWorkflow.phases.length - 2
          ? 1
          : 2;
    const journeySteps = ["Understand", "Build", "Send"];
    const screenHeading =
      selectedStudioPhase.kind === "input"
        ? "Start with your records"
        : selectedStudioPhase.kind === "analysis" ||
            selectedStudioPhase.kind === "authority"
          ? "Here’s what we found"
          : selectedStudioPhase.kind === "review"
            ? "Review before you continue"
            : selectedStudioPhase.kind === "action"
              ? "Prepare for delivery"
              : "Complete this step";

    return (
      <main className="min-h-screen bg-ivory text-charcoal">
        <div className="flex items-center justify-between border-b border-rule bg-paper px-5 py-3 md:px-8">
          <div className="flex items-center gap-2.5 font-semibold text-navy">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-navy font-display text-base text-paper">M</span>
            MailMyPDF <span className="text-[10px] font-medium tracking-wider text-stone">PRIVATE OFFICE</span>
          </div>
          <span className="text-xs text-stone">Your case</span>
        </div>
        <div className="mx-auto max-w-5xl px-5 py-9 md:px-8 md:py-12">
          <div className="text-center">
            <div className="section-kicker">{studioWorkflow.title}</div>
            <h1 className="mt-3 text-4xl leading-tight text-charcoal md:text-5xl">{selectedStudioPhase.title}</h1>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-stone">{selectedStudioPhase.objective}</p>
          </div>

          <ol className="mx-auto mt-8 flex max-w-3xl items-start overflow-x-auto pb-2">
            {journeySteps.map((step, index) => {
              const isCurrent = index === journeyIndex;
              const isComplete = index < journeyIndex;
              return (
                <li key={step} className="flex min-w-28 flex-1 items-start last:flex-none">
                  <div className="w-full text-center">
                    <div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${isCurrent ? "border-navy bg-navy text-paper" : isComplete ? "border-success bg-success text-paper" : "border-rule bg-paper text-stone"}`}>
                      {isComplete ? <CheckCircle2 size={14} /> : index + 1}
                    </div>
                    <div className={`mt-2 text-xs font-semibold uppercase tracking-wide ${isCurrent ? "text-navy" : "text-stone"}`}>{step}</div>
                    <div className="mt-1 text-[11px] text-stone-light">{isComplete ? "Complete" : isCurrent ? `${Math.round(((phaseIndex + 1) / studioWorkflow.phases.length) * 100)}%` : "Not started"}</div>
                  </div>
                  {index < journeySteps.length - 1 && <div className={`mt-3 h-px flex-1 ${index < journeyIndex ? "bg-navy" : "border-t border-dashed border-rule"}`} />}
                </li>
              );
            })}
          </ol>

          <section className="mx-auto mt-9 max-w-4xl rounded-2xl border border-rule bg-paper p-6 shadow-sm md:p-8">
            <div className="text-center">
              <div className="section-kicker">Step {phaseIndex + 1} of {studioWorkflow.phases.length}</div>
              <h2 className="mt-3 text-3xl text-charcoal">{screenHeading}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-stone">{selectedStudioPhase.objective}</p>
            </div>

            {selectedStudioPhase.kind === "input" && (
              <div className="mx-auto mt-7 max-w-xl rounded-xl border border-rule bg-ivory p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-brass/30 bg-paper text-2xl text-navy">↑</div>
                <div className="mt-4 text-2xl text-charcoal">Add your matter records</div>
                <p className="mt-2 text-sm text-stone">PDF, PNG, JPG, or details from your records. Nothing is sent without your approval.</p>
                <button type="button" className="btn-brass mt-5">Choose documents</button>
              </div>
            )}

            {variables.length ? (
              <div className="mx-auto mt-7 grid max-w-3xl gap-4 sm:grid-cols-2">
                {variables.map((variable) => (
                  <div key={variable.id} className="rounded-lg border border-rule bg-ivory p-4 text-left">
                    <label className="input-label" htmlFor={`phase-${variable.id}`}>{variable.label}</label>
                    <textarea id={`phase-${variable.id}`} className="input-field mt-2 min-h-20 resize-y bg-paper" defaultValue={variable.value} placeholder={variable.description || "Add the information needed for this step."} />
                    {variable.description && <p className="mt-2 text-xs leading-relaxed text-stone-light">{variable.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mx-auto mt-7 max-w-3xl rounded-xl border border-rule bg-ivory p-5 text-left">
                <div className="text-lg text-charcoal">What this step covers</div>
                <p className="mt-2 text-sm leading-relaxed text-stone">{selectedStudioPhase.objective}</p>
              </div>
            )}

            {selectedStudioPhase.gates.filter((gate) => gate.required).length > 0 && (
              <div className="mx-auto mt-5 max-w-3xl rounded-lg border border-brass/25 bg-brass/10 p-4 text-left">
                <div className="text-sm font-semibold text-charcoal">Before you continue</div>
                <ul className="mt-2 space-y-1 text-sm text-stone">{selectedStudioPhase.gates.filter((gate) => gate.required).map((gate) => <li key={`${gate.type}-${gate.label}`}>• {gate.label}</li>)}</ul>
              </div>
            )}
            <div className="mx-auto mt-7 flex max-w-3xl flex-wrap justify-center gap-3">
              <button type="button" className="btn-outline">Save & exit</button>
              <button type="button" className="btn-brass">Continue <ArrowRight size={16} /></button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ivory">
      <SiteHeader />
      <section className="border-b border-rule bg-paper">
        <div className="container">
          <div className="grid items-center gap-10 py-16 md:py-20 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <span className="badge badge-brass">{profile.family}</span>
                <span className="badge badge-navy">Gold Standard Workflow</span>
              </div>
              <h1 className="mt-5 text-4xl leading-tight text-charcoal md:text-5xl">
                {landingHeadline}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone">
                {landingDescription}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {!user ? (
                  <Link
                    to="/auth"
                  search={{ returnTo: `/workflows/${workflowId}` }}
                  className="btn-brass"
                >
                    {landingAction} <ArrowRight size={16} />
                  </Link>
                ) : hasWorkspace ? (
                  <button
                  onClick={() => setShowWorkspaceUI(true)}
                  className="btn-brass"
                >
                    {landingAction} <ArrowRight size={16} />
                  </button>
                ) : (
                  <Link to="/auth" className="btn-brass">
                    {landingAction} <ArrowRight size={16} />
                  </Link>
                )}
                <a href="#authority" className="btn-outline">
                  Learn more
                </a>
              </div>
              {!user && (
                <p className="mt-3 text-xs text-stone-light">
                  A MailMyPDF account is required before private matter intake
                  or analysis can begin.
                </p>
              )}
            </div>
            {image && (
              <div className="hidden lg:block">
                <div className="aspect-[4/3] overflow-hidden rounded-lg shadow-elevated">
                  <img
                    src={image}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {studioWorkflow && (
        <section className="border-b border-rule bg-paper">
          <div className="container py-8">
            <div className="rounded-lg border border-navy/15 bg-navy-bg p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="eyebrow">
                    {isStudioPreview
                      ? "Build Studio preview"
                      : "Published from Build Studio"}
                  </div>
                  <h2 className="mt-2 text-xl text-charcoal">
                    {studioWorkflow.title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone">
                    {studioWorkflow.description}
                  </p>
                </div>
                {isStudioPreview && (
                  <span className="badge badge-brass">Unpublished draft</span>
                )}
              </div>
              <ol className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {studioWorkflow.phases.map((phase, index) => (
                  <li
                    key={phase.id}
                    className="flex gap-3 rounded-md border border-navy/10 bg-paper p-3 text-sm"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-paper">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium text-charcoal">
                        {phase.title}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-stone">
                        {phase.objective}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {hasWorkspace && showWorkspaceUI && user && (
        <section className="border-b border-rule bg-paper">
          <div className="container max-w-3xl py-12">
            <div className="section-kicker">Workspace</div>
            <h2 className="mt-3 text-2xl text-charcoal">
              {profile.draftSubject} Workspace
            </h2>
            <p className="mt-2 text-sm text-stone">
              Provide the facts of your matter. The system will analyze them,
              identify issues, and generate a draft for your review.
            </p>
            <div className="mt-6 space-y-4">
              {intakeFields!.map((field) => (
                <div key={field.key}>
                  <label className="input-label">{field.label}</label>
                  {field.type === "textarea" || field.rows ? (
                    <textarea
                      className="input-field"
                      rows={field.rows ?? 3}
                      value={intakeData[field.key] ?? ""}
                      onChange={(e) =>
                        setIntakeData({
                          ...intakeData,
                          [field.key]: e.target.value,
                        })
                      }
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      className="input-field"
                      value={intakeData[field.key] ?? ""}
                      onChange={(e) =>
                        setIntakeData({
                          ...intakeData,
                          [field.key]: e.target.value,
                        })
                      }
                      placeholder={field.placeholder}
                    />
                  )}
                  {field.note && (
                    <p className="mt-1 text-xs text-stone-light">
                      {field.note}
                    </p>
                  )}
                </div>
              ))}
              <div>
                <label className="input-label">Requested resolution</label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder={profile.objectivePrompt}
                />
              </div>
              <div>
                <label className="input-label">
                  Source document text (paste relevant documents)
                </label>
                <textarea
                  className="input-field"
                  rows={6}
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                  placeholder="Paste the text of your contract, invoice, correspondence, or other relevant documents..."
                />
              </div>
              <button onClick={runAnalysis} className="btn-primary">
                Analyze & Generate Draft <ArrowRight size={16} />
              </button>
            </div>
            {result && (
              <div className="mt-8 space-y-5">
                <div className="card p-6">
                  <h3 className="font-display text-lg text-charcoal">
                    Pipeline stages
                  </h3>
                  <div className="mt-3 space-y-1.5">
                    {result.stages.map((stage) => (
                      <div
                        key={stage.stage}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className={
                            stage.status === "passed"
                              ? "text-success"
                              : stage.status === "failed" ||
                                  stage.status === "blocked"
                                ? "text-error"
                                : "text-stone-light"
                          }
                        >
                          {stage.status === "passed"
                            ? "✓"
                            : stage.status === "failed" ||
                                stage.status === "blocked"
                              ? "✗"
                              : "○"}
                        </span>
                        <span className="text-charcoal-soft">
                          {stage.stage}
                        </span>
                        {stage.detail && (
                          <span className="text-stone-light">
                            — {stage.detail}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {result.errors.length > 0 && (
                    <div className="mt-4 alert alert-danger">
                      <strong>Blocking issues:</strong>
                      <ul className="mt-2 list-disc pl-5">
                        {result.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {result.analysis.findings.length > 0 && (
                  <div className="card p-6">
                    <h3 className="font-display text-lg text-charcoal">
                      Findings ({result.analysis.findings.length})
                    </h3>
                    <div className="mt-3 space-y-3">
                      {result.analysis.findings.map((finding) => (
                        <div
                          key={finding.id}
                          className="flex items-start gap-3 text-sm"
                        >
                          <span
                            className={`badge ${finding.state === "confirmed" ? "badge-success" : finding.state === "missing" ? "badge-error" : "badge-brass"}`}
                          >
                            {finding.state}
                          </span>
                          <div>
                            <p className="font-medium text-charcoal-soft">
                              {finding.title}
                            </p>
                            <p className="text-stone">{finding.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.analysis.evidence.length > 0 && (
                  <div className="card p-6">
                    <h3 className="font-display text-lg text-charcoal">
                      Evidence requirements ({result.analysis.evidence.length})
                    </h3>
                    <div className="mt-3 space-y-2">
                      {result.analysis.evidence.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span
                            className={`badge ${ev.status === "verified" || ev.status === "provided" ? "badge-success" : ev.status === "missing" ? "badge-error" : "badge-brass"}`}
                          >
                            {ev.status}
                          </span>
                          <span className="text-charcoal-soft">
                            {ev.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.analysis.timeline.length > 0 && (
                  <div className="card p-6">
                    <h3 className="font-display text-lg text-charcoal">
                      Timeline ({result.analysis.timeline.length} events)
                    </h3>
                    <div className="mt-3 space-y-2">
                      {result.analysis.timeline.map((event, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium text-navy">
                            {event.date ?? "Date unknown"}
                          </span>
                          <span className="text-stone">
                            {" "}
                            — {event.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.draft && (
                  <div className="card p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg text-charcoal">
                        Draft correspondence
                      </h3>
                      <span className="provenance-badge">AI suggested</span>
                    </div>
                    <p className="mt-1.5 text-xs text-stone-light">
                      [DRAFT — REVIEW BEFORE SENDING] This draft is generated
                      from your facts. Review every word before approving for
                      mailing.
                    </p>
                    <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-ivory p-4 text-sm leading-relaxed text-charcoal-soft">
                      {result.draft}
                    </pre>
                    <div className="mt-5 flex gap-3">
                      <button className="btn-primary" disabled={!result.ready}>
                        Approve this draft <Send size={16} />
                      </button>
                      <button className="btn-outline">Edit draft</button>
                    </div>
                    <p className="mt-3 text-xs text-stone">
                      Approval applies to this exact version. Any modification
                      creates a new version requiring re-approval.
                    </p>
                    <div className="mt-6 border-t border-rule pt-5">
                      <div className="section-kicker">Mailing Checklist</div>
                      <div className="mt-3 space-y-2">
                        {[
                          { label: "Draft approved", done: result.ready },
                          { label: "Recipient complete", done: false },
                          {
                            label: "Evidence complete",
                            done: result.errors.length === 0,
                          },
                          { label: "Payment verified", done: false },
                          { label: "Ready for mailing", done: result.ready },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center gap-2.5 text-sm"
                          >
                            <span
                              className={
                                item.done ? "text-success" : "text-stone-light"
                              }
                            >
                              {item.done ? "✓" : "○"}
                            </span>
                            <span
                              className={
                                item.done ? "text-charcoal-soft" : "text-stone"
                              }
                            >
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        className="btn-brass mt-4"
                        disabled={!result.ready}
                      >
                        Send with MailMyPDF <Send size={15} />
                      </button>
                      {!result.ready && (
                        <p className="mt-2 text-xs text-error">
                          Complete required steps before mailing.
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <div className="alert alert-warning">
                  <strong>Important:</strong> {profile.disclaimer}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section id="authority" className="py-20 md:py-28">
        <div className="container max-w-3xl">
          <div className="space-y-12">
            {authoritySections.map((section, i) => (
              <div key={i}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-ivory">
                    <section.icon
                      size={20}
                      className="text-navy"
                      strokeWidth={1.5}
                    />
                  </div>
                  <h2 className="text-2xl text-charcoal">{section.title}</h2>
                </div>
                {section.content && (
                  <p className="mt-3 text-sm leading-7 text-charcoal-soft">
                    {section.content}
                  </p>
                )}
                {section.items && (
                  <ul className="mt-3 space-y-2">
                    {section.items.map((item, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-2 text-sm leading-7 text-charcoal-soft"
                      >
                        <CheckCircle2
                          size={16}
                          className="mt-1 shrink-0 text-navy"
                          strokeWidth={1.5}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-ivory">
                  <DollarSign
                    size={20}
                    className="text-navy"
                    strokeWidth={1.5}
                  />
                </div>
                <h2 className="text-2xl text-charcoal">Pricing</h2>
              </div>
              <div className="mt-4 card p-6">
                <p className="text-sm text-stone">
                  Starting at $
                  {(
                    profile.pricing.preparationFee +
                    profile.pricing.standardMail
                  ).toFixed(2)}{" "}
                  (preparation + standard mail). Certified mail with return
                  receipt starts at $
                  {(
                    profile.pricing.preparationFee +
                    (profile.pricing.certifiedReturnReceipt ?? 0)
                  ).toFixed(2)}
                  .
                </p>
                <div className="mt-4 space-y-2">
                  {pricingExample.map((row) => (
                    <div
                      key={row.item}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-charcoal-soft">{row.item}</span>
                      <span
                        className={
                          row.bold
                            ? "font-semibold text-navy"
                            : "text-charcoal-soft"
                        }
                      >
                        {row.price}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-stone-light">
                  The exact price is calculated from your final approved packet
                  before payment. Payment confirms your selected mailing service
                  — mailing remains subject to the required approval and
                  fulfillment checks.
                </p>
              </div>
            </div>
            <div className="card p-8 text-center">
              <h2 className="text-2xl text-charcoal">
                Ready to document your matter?
              </h2>
              <p className="mt-2 text-sm text-stone">
                Start the workflow to organize your facts, generate a
                professional draft, review it, and send it certified with proof
                of delivery.
              </p>
              {!user ? (
                <Link
                  to="/auth"
                  search={{ returnTo: `/workflows/${workflowId}` }}
                  className="btn-brass mt-6"
                >
                  Sign in to start <ArrowRight size={16} />
                </Link>
              ) : hasWorkspace ? (
                <button
                  onClick={() => {
                    setShowWorkspaceUI(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="btn-brass mt-6"
                >
                  Start the {profile.draftSubject} workflow{" "}
                  <ArrowRight size={16} />
                </button>
              ) : (
                <Link to="/auth" className="btn-brass mt-6">
                  Start your matter <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
