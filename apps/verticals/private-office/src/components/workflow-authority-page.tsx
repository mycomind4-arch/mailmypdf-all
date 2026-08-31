/**
 * Shared Workflow Authority Page
 *
 * Renders a premium workflow landing page with:
 * - Hero (image, title, description, CTA)
 * - Workspace (intake form + analysis results) — optional
 * - Authority content sections
 * - Pricing
 * - CTA
 *
 * Each route file passes its specific authoritySections and intakeFields.
 */
import { Link } from "@tanstack/react-router";
import { useState, type ComponentType } from "react";
import {
  ArrowRight,
  CheckCircle2,
  
  Send,
  DollarSign,
  
  
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { workflowProfiles } from "@/domain/workflow-profiles";
import { workflowImages } from "@/lib/workflow-images";
import { useAuth } from "@/lib/use-auth";
import type { WorkflowId } from "@/domain/workflows";

export interface AuthoritySection {
  icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
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

  function runAnalysis() {
    import("@/domain/private-office-workflow").then(({ runPrivateOfficeWorkflow }) => {
      const res = runPrivateOfficeWorkflow({
        workflowId,
        documentId: "local-doc",
        text: documentText || "Source document text placeholder for analysis.",
        facts: intakeData,
        objective,
      });
      setResult(res);
    });
  }

  const pricingExample = [
    { item: "Workflow preparation", price: `$${profile.pricing.preparationFee.toFixed(2)}` },
    { item: `${profile.pricing.includedResponsePages} response pages included`, price: "Included" },
    { item: "Certified mail with return receipt", price: profile.pricing.certifiedReturnReceipt ? `$${profile.pricing.certifiedReturnReceipt.toFixed(2)}` : "—" },
    { item: "Estimated total", price: `$${(profile.pricing.preparationFee + (profile.pricing.certifiedReturnReceipt ?? 0)).toFixed(2)}`, bold: true },
  ];

  return (
    <main className="min-h-screen bg-ivory">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="border-b border-rule bg-paper">
        <div className="container">
          <div className="grid items-center gap-10 py-16 md:py-20 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <span className="badge badge-brass">{profile.family}</span>
                <span className="badge badge-navy">Gold Standard Workflow</span>
              </div>
              <h1 className="mt-5 text-4xl leading-tight text-charcoal md:text-5xl">
                {profile.outcome.replace(/^Create a documented .*?letter\b/, profile.draftSubject).replace(/^Document and pursue\b/, profile.draftSubject).replace(/^Document a\b/, profile.draftSubject).replace(/^Document your\b/, profile.draftSubject) || profile.draftSubject}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone">
                {profile.problem}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {hasWorkspace ? (
                  <button onClick={() => setShowWorkspaceUI(true)} className="btn-brass">
                    {user ? "Start this matter" : "Try the workflow"} <ArrowRight size={16} />
                  </button>
                ) : user ? (
                  <Link to="/auth" className="btn-brass">
                    Start your matter <ArrowRight size={16} />
                  </Link>
                ) : (
                  <Link to="/auth" className="btn-brass">
                    Sign in to start <ArrowRight size={16} />
                  </Link>
                )}
                <a href="#authority" className="btn-outline">Learn more</a>
              </div>
              {!user && (
                <p className="mt-3 text-xs text-stone-light">
                  Sign in to save your matter, evidence, and delivery records. You can preview the workflow without an account.
                </p>
              )}
            </div>
            {image && (
              <div className="hidden lg:block">
                <div className="aspect-[4/3] overflow-hidden rounded-lg shadow-elevated">
                  <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Workspace ────────────────────────────────── */}
      {hasWorkspace && showWorkspaceUI && (
        <section className="border-b border-rule bg-paper">
          <div className="container max-w-3xl py-12">
            <div className="section-kicker">Workspace</div>
            <h2 className="mt-3 text-2xl text-charcoal">
              {profile.draftSubject} Workspace
            </h2>
            <p className="mt-2 text-sm text-stone">
              Provide the facts of your matter. The system will analyze them, identify issues, and generate a draft for your review.
            </p>

            {/* Intake form */}
            <div className="mt-6 space-y-4">
              {intakeFields!.map((field) => (
                <div key={field.key}>
                  <label className="input-label">{field.label}</label>
                  {field.type === "textarea" || field.rows ? (
                    <textarea
                      className="input-field"
                      rows={field.rows ?? 3}
                      value={intakeData[field.key] ?? ""}
                      onChange={(e) => setIntakeData({ ...intakeData, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      className="input-field"
                      value={intakeData[field.key] ?? ""}
                      onChange={(e) => setIntakeData({ ...intakeData, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                    />
                  )}
                  {field.note && <p className="mt-1 text-xs text-stone-light">{field.note}</p>}
                </div>
              ))}

              {/* Objective */}
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

              {/* Source document */}
              <div>
                <label className="input-label">Source document text (paste relevant documents)</label>
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

            {/* Results */}
            {result && (
              <div className="mt-8 space-y-5">
                {/* Pipeline stages */}
                <div className="card p-6">
                  <h3 className="font-display text-lg text-charcoal">Pipeline stages</h3>
                  <div className="mt-3 space-y-1.5">
                    {result.stages.map((stage) => (
                      <div key={stage.stage} className="flex items-center gap-2 text-sm">
                        <span className={
                          stage.status === "passed" ? "text-success"
                          : stage.status === "failed" || stage.status === "blocked" ? "text-error"
                          : "text-stone-light"
                        }>
                          {stage.status === "passed" ? "✓" : stage.status === "failed" || stage.status === "blocked" ? "✗" : "○"}
                        </span>
                        <span className="text-charcoal-soft">{stage.stage}</span>
                        {stage.detail && <span className="text-stone-light">— {stage.detail}</span>}
                      </div>
                    ))}
                  </div>
                  {result.errors.length > 0 && (
                    <div className="mt-4 alert alert-danger">
                      <strong>Blocking issues:</strong>
                      <ul className="mt-2 list-disc pl-5">
                        {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Findings */}
                {result.analysis.findings.length > 0 && (
                  <div className="card p-6">
                    <h3 className="font-display text-lg text-charcoal">Findings ({result.analysis.findings.length})</h3>
                    <div className="mt-3 space-y-3">
                      {result.analysis.findings.map((finding) => (
                        <div key={finding.id} className="flex items-start gap-3 text-sm">
                          <span className={`badge ${
                            finding.state === "confirmed" ? "badge-success"
                            : finding.state === "missing" ? "badge-error"
                            : "badge-brass"
                          }`}>
                            {finding.state}
                          </span>
                          <div>
                            <p className="font-medium text-charcoal-soft">{finding.title}</p>
                            <p className="text-stone">{finding.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence */}
                {result.analysis.evidence.length > 0 && (
                  <div className="card p-6">
                    <h3 className="font-display text-lg text-charcoal">Evidence requirements ({result.analysis.evidence.length})</h3>
                    <div className="mt-3 space-y-2">
                      {result.analysis.evidence.map((ev) => (
                        <div key={ev.id} className="flex items-center gap-3 text-sm">
                          <span className={`badge ${
                            ev.status === "verified" || ev.status === "provided" ? "badge-success"
                            : ev.status === "missing" ? "badge-error"
                            : "badge-brass"
                          }`}>
                            {ev.status}
                          </span>
                          <span className="text-charcoal-soft">{ev.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {result.analysis.timeline.length > 0 && (
                  <div className="card p-6">
                    <h3 className="font-display text-lg text-charcoal">Timeline ({result.analysis.timeline.length} events)</h3>
                    <div className="mt-3 space-y-2">
                      {result.analysis.timeline.map((event, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium text-navy">{event.date ?? "Date unknown"}</span>
                          <span className="text-stone"> — {event.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Draft */}
                {result.draft && (
                  <div className="card p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg text-charcoal">Draft correspondence</h3>
                      <span className="provenance-badge">AI suggested</span>
                    </div>
                    <p className="mt-1.5 text-xs text-stone-light">
                      [DRAFT — REVIEW BEFORE SENDING] This draft is generated from your facts. Review every word before approving for mailing.
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
                      Approval applies to this exact version. Any modification creates a new version requiring re-approval.
                    </p>

                    {/* Mailing checklist */}
                    <div className="mt-6 border-t border-rule pt-5">
                      <div className="section-kicker">Mailing Checklist</div>
                      <div className="mt-3 space-y-2">
                        {[
                          { label: "Draft approved", done: result.ready },
                          { label: "Recipient complete", done: false },
                          { label: "Evidence complete", done: result.errors.length === 0 },
                          { label: "Payment verified", done: false },
                          { label: "Ready for mailing", done: result.ready },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-2.5 text-sm">
                            <span className={item.done ? "text-success" : "text-stone-light"}>
                              {item.done ? "✓" : "○"}
                            </span>
                            <span className={item.done ? "text-charcoal-soft" : "text-stone"}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button className="btn-brass mt-4" disabled={!result.ready}>
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

                {/* Disclaimer */}
                <div className="alert alert-warning">
                  <strong>Important:</strong> {profile.disclaimer}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Authority Content ────────────────────────── */}
      <section id="authority" className="py-20 md:py-28">
        <div className="container max-w-3xl">
          <div className="space-y-12">
            {authoritySections.map((section, i) => (
              <div key={i}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-ivory">
                    <section.icon size={20} className="text-navy" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-2xl text-charcoal">{section.title}</h2>
                </div>
                {section.content && (
                  <p className="mt-3 text-sm leading-7 text-charcoal-soft">{section.content}</p>
                )}
                {section.items && (
                  <ul className="mt-3 space-y-2">
                    {section.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm leading-7 text-charcoal-soft">
                        <CheckCircle2 size={16} className="mt-1 shrink-0 text-navy" strokeWidth={1.5} />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {/* Pricing */}
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-ivory">
                  <DollarSign size={20} className="text-navy" strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl text-charcoal">Pricing</h2>
              </div>
              <div className="mt-4 card p-6">
                <p className="text-sm text-stone">
                  Starting at ${(profile.pricing.preparationFee + profile.pricing.standardMail).toFixed(2)} (preparation + standard mail). Certified mail with return receipt starts at ${(profile.pricing.preparationFee + (profile.pricing.certifiedReturnReceipt ?? 0)).toFixed(2)}.
                </p>
                <div className="mt-4 space-y-2">
                  {pricingExample.map((row) => (
                    <div key={row.item} className="flex items-center justify-between text-sm">
                      <span className="text-charcoal-soft">{row.item}</span>
                      <span className={row.bold ? "font-semibold text-navy" : "text-charcoal-soft"}>
                        {row.price}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-stone-light">
                  The exact price is calculated from your final approved packet before payment. Payment confirms your selected mailing service — mailing remains subject to the required approval and fulfillment checks.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="card p-8 text-center">
              <h2 className="text-2xl text-charcoal">
                Ready to document your matter?
              </h2>
              <p className="mt-2 text-sm text-stone">
                Start the workflow to organize your facts, generate a professional draft, review it, and send it certified with proof of delivery.
              </p>
              {hasWorkspace ? (
                <button onClick={() => { setShowWorkspaceUI(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="btn-brass mt-6">
                  Start the {profile.draftSubject} workflow <ArrowRight size={16} />
                </button>
              ) : user ? (
                <Link to="/auth" className="btn-brass mt-6">
                  Start your matter <ArrowRight size={16} />
                </Link>
              ) : (
                <Link to="/auth" className="btn-brass mt-6">
                  Sign in to start <ArrowRight size={16} />
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
