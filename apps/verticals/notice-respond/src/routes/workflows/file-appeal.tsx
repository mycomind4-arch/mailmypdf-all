import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { workflows } from "../../domain/workflows";
import { WorkflowShell, Success, UploadZone, ReviewChecks, MailOptions, RecipientForm, CheckoutStep, type StepDef } from "@/components/workflow-shell";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

import { createWorkflowHead } from "@/domain/enhanced-head";
import { useCombinedAnalysis } from "@/domain/use-combined-analysis";
import { LLMAnalysisPanel } from "@/components/llm-analysis-panel";
import { FAQSection } from "@/components/faq-section";
import { getWorkflowSEO } from "@/domain/workflow-seo";
export const Route = createFileRoute("/workflows/file-appeal")({
  head: () => ({ meta: [
    { rel: 'canonical', href: '/workflows/file-appeal' },
    { title: "File an Appeal — Notice Respond" },
    { name: "description", content: "Prepare an appeal letter for a denied claim, decision, or ruling and mail it with proof of delivery." },
  ] }),
  component: FileAppeal,
});

const STEPS: StepDef[] = [
  { id: "intro", label: "Start" }, { id: "notice", label: "Notice" }, { id: "facts", label: "Facts" },
  { id: "objective", label: "Objective" }, { id: "draft", label: "Draft" }, { id: "review", label: "Review" },
  { id: "attachments", label: "Documents" }, { id: "recipient", label: "Recipient" },
  { id: "mailing", label: "Mail" }, { id: "checkout", label: "Checkout" }, { id: "done", label: "Done" },
];

const REVIEW_CHECKS = [
  "I reviewed every factual statement in this draft.",
  "Case number, decision date, and appeal deadline are correct.",
  "I reviewed the appeal instructions from the agency or court.",
  "I understand Notice Respond is not providing legal advice.",
];

function FileAppeal() {
  const definition = workflows["file-appeal"];
  const [step, setStep] = useState(0);
  const [appealingTo, setAppealingTo] = useState("");
  const [decisionDate, setDecisionDate] = useState("");
  const [appealDeadline, setAppealDeadline] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [originalDecision, setOriginalDecision] = useState("");
  const [facts, setFacts] = useState("");
  const [objective, setObjective] = useState("");
  const [draft, setDraft] = useState("");
  const [checks, setChecks] = useState<boolean[]>(REVIEW_CHECKS.map(() => false));
  const [mailType, setMailType] = useState("certified");
  const [recipient, setRecipient] = useState({ name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" });
  const [done, setDone] = useState(false);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const workflowRef = useRef<HTMLDivElement>(null);

  const startWorkflow = useCallback(() => {
    setWorkflowStarted(true);
    setTimeout(() => {
      workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  const llmAnalysis = useCombinedAnalysis("file-appeal");
  const allChecked = checks.every(Boolean);

  function generateDraft() {
    return `Re: Appeal of Decision
${appealingTo ? `Appealing to: ${appealingTo}` : ""}
${caseNumber ? `Case No.: ${caseNumber}` : ""}
${decisionDate ? `Decision Date: ${decisionDate}` : ""}
${appealDeadline ? `Appeal Deadline: ${appealDeadline}` : ""}

Dear Sir or Madam,

I am writing to appeal the decision referenced above. ${objective || "[Your objective will appear here.]"}

${originalDecision ? `Original Decision: ${originalDecision}` : ""}

${facts || "[The facts you provided will appear here.]"}

Sincerely,
[Your Name]`;
  }

  function canContinue() {
    switch (step) {
      case 1: return appealingTo.trim().length > 0;
      case 2: return facts.trim().length > 0;
      case 3: return objective.trim().length > 0;
      case 5: return allChecked;
      case 7: return !!(recipient.name && recipient.address1 && recipient.city && recipient.state && recipient.zip);
      default: return true;
    }
  }

  async function next() {
    if (step === 4 && !draft) {
      try {
        if (llmAnalysis.llmAnalysis) {
          const r = await fetch("/api/workflows/draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workflowId: "file-appeal", analysis: llmAnalysis.llmAnalysis, userFacts: facts, userObjective: objective }),
          });
          if (r.ok) { const d = await r.json(); setDraft(d.draft); } else { setDraft(generateDraft()); }
        } else { setDraft(generateDraft()); }
      } catch (e) { setDraft(generateDraft()); }
    }
    if (step === STEPS.length - 1) { setDone(true); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  if (done) return <Success title="Your appeal has been submitted" href="/workflows/file-appeal" />;

  return (
          <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-rule/60">
          <div className="absolute inset-0 bg-gradient-to-b from-paper-deep/40 via-paper to-paper" aria-hidden="true" />
          <div className="relative mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20 md:py-28">
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-stamp transition-colors">Notice Respond</Link>
              <span className="text-rule">/</span>
              <Link to="/workflows" className="hover:text-stamp transition-colors">Workflows</Link>
              <span className="text-rule">/</span>
              <span className="text-ink-soft">Appeal</span>
            </nav>
            <div className="postmark w-fit mt-6">Appeal</div>
            <h1 className="mt-6 font-serif text-4xl leading-[1.1] sm:text-5xl md:text-6xl">
              Respond to your <span className="italic text-stamp">appeal</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
              You need to appeal a decision from a court, agency, or tribunal. Upload the original decision, understand your appeal rights, and prepare a documented appeal within the deadline.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={startWorkflow} className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">
                Start your response
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </button>
              <Link to="/workflows" className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-6 py-3.5 text-sm font-medium transition-colors hover:border-ink/30">Browse other notices</Link>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule/60 bg-rule/60 sm:grid-cols-4">
              <KeyFact label="Notice type" value="Appeal" />
              <KeyFact label="Jurisdiction" value="Any" />
              <KeyFact label="Recommended mail" value="Certified" />
              <KeyFact label="Cost to prepare" value="Free" />
            </div>
          </div>
        </section>

        {/* WHAT IS */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Understanding the notice</div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">What is an appeal?</h2>
            <div className="mt-6 space-y-4 text-base leading-7 text-ink-soft">
              <p>An appeal is a formal request to a higher authority to review and overturn a decision made by a lower court, administrative agency, or tribunal. You may be appealing a judgment, a denial of benefits, a license revocation, a tax assessment, or any government action you believe was wrong.</p>
              <p>Appeals have strict deadlines — typically 30 days from the date of the decision. Missing the deadline usually forfeits your right to appeal entirely. Some appeals require specific forms, filing fees, or a statement of grounds.</p>
              <p>A documented appeal identifies the errors in the original decision, presents new evidence or legal arguments, and requests a specific remedy. Responding with a well-organized, timely appeal gives you the best chance of a favorable outcome.</p>
            </div>
            <div className="mt-8 rounded-lg border border-rule/60 bg-paper-deep/30 p-5">
              <div className="font-mono text-xs uppercase tracking-widest text-stamp">What this notice includes</div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Original decision or judgment</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Case or reference number</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Deadline to appeal (usually 30 days)</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Grounds for appeal</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Court or appellate body</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Filing fee</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Required forms</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Statement of errors</li>
              </ul>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">The process</div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">How Notice Respond works</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <ProcessStep number="01" title="Upload & analyze" text="Upload the original decision. AI extracts the case number, decision date, deadline, and identifies potential grounds for appeal." />
              <ProcessStep number="02" title="Review & draft" text="State your grounds for appeal, cite specific errors, and present supporting evidence. Generate a formal appeal document." />
              <ProcessStep number="03" title="Mail with proof" text="Approve the exact draft. File with the appropriate court or body. Certified mail provides proof of timely filing." />
            </div>
          </div>
        </section>

        {/* WORKFLOW */}
        <section ref={workflowRef} className="border-b border-rule/60" style={{ scrollMarginTop: "80px" }}>
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            {workflowStarted ? (
              <WorkflowShell title="File an Appeal" steps={STEPS} step={step} setStep={setStep} canContinue={canContinue()} onNext={next} onBack={() => setStep((s) => Math.max(s - 1, 0))}>
      {step === 0 && (
        <div>
          <div className="postmark w-fit">1 · Start</div>
          <h2 className="mt-4 font-serif text-4xl">File an appeal</h2>
          <p className="mt-3 text-muted-foreground">Prepare an appeal letter for a denied claim, decision, or ruling and mail it with proof of delivery.</p>
          <div className="mt-6 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground"><div className="font-mono text-xs uppercase tracking-widest text-stamp">Disclaimer</div><p className="mt-2">{definition.disclaimer}</p></div>
        </div>
      )}
      {step === 1 && (
        <div>

          {llmAnalysis.llmAnalysis && (
            <LLMAnalysisPanel analysis={llmAnalysis.llmAnalysis} provider={llmAnalysis.llmProvider} />
          )}
          {llmAnalysis.llmLoading && (
            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary animate-pulse">✦ AI is analyzing your document…</div>
          )}
          <div className="postmark w-fit">2 · Notice</div>
          <h2 className="mt-4 font-serif text-3xl">Start with the decision</h2>
          <label className="cursor-pointer block">
            <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              let text = ""; if (file.type === "text/plain") text = await file.text();
              await llmAnalysis.analyzeWithLLM(file, text);
            }} />
            <UploadZone label="Upload decision letter" sublabel="PDF, JPG, or PNG" />
          </label>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div><label className="input-label">Appealing to *</label><input className="input-field" value={appealingTo} onChange={(e) => setAppealingTo(e.target.value)} placeholder="Agency, board, or court" /></div>
            <div><label className="input-label">Case number</label><input className="input-field" value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} /></div>
            <div><label className="input-label">Decision date</label><input type="date" className="input-field" value={decisionDate} onChange={(e) => setDecisionDate(e.target.value)} /></div>
            <div><label className="input-label">Appeal deadline</label><input type="date" className="input-field" value={appealDeadline} onChange={(e) => setAppealDeadline(e.target.value)} /></div>
            <div className="sm:col-span-2"><label className="input-label">Original decision (summary)</label><input className="input-field" value={originalDecision} onChange={(e) => setOriginalDecision(e.target.value)} placeholder="Briefly describe what was decided" /></div>
          </div>
        </div>
      )}
      {step === 2 && (<div><div className="postmark w-fit">3 · Facts</div><h2 className="mt-4 font-serif text-3xl">What facts should the appeal include?</h2><textarea className="input-field mt-6 min-h-48" value={facts} onChange={(e) => setFacts(e.target.value)} /></div>)}
      {step === 3 && (<div><div className="postmark w-fit">4 · Objective</div><h2 className="mt-4 font-serif text-3xl">What do you want the appeal to accomplish?</h2><textarea className="input-field mt-6 min-h-40" value={objective} onChange={(e) => setObjective(e.target.value)} /></div>)}
      {step === 4 && (<div><div className="postmark w-fit">5 · Draft</div><h2 className="mt-4 font-serif text-3xl">Your appeal letter</h2><p className="mt-3 text-muted-foreground">Review every fact. This is editable.</p><textarea className="input-field mt-6 min-h-72 font-mono text-sm leading-6" value={draft} onChange={(e) => setDraft(e.target.value)} /></div>)}
      {step === 5 && (<div><div className="postmark w-fit">6 · Review</div><h2 className="mt-4 font-serif text-3xl">Review before anything is mailed</h2><ReviewChecks items={REVIEW_CHECKS} checks={checks} setChecks={setChecks} /></div>)}
      {step === 6 && (<div><div className="postmark w-fit">7 · Documents</div><h2 className="mt-4 font-serif text-3xl">Add supporting documents</h2><UploadZone label="Add attachments" sublabel="Evidence, prior filings, documentation" /></div>)}
      {step === 7 && (<div><div className="postmark w-fit">8 · Recipient</div><h2 className="mt-4 font-serif text-3xl">Where should we send it?</h2><RecipientForm recipient={recipient} setRecipient={setRecipient} orgPlaceholder={appealingTo || "Organization"} /></div>)}
      {step === 8 && (<div><div className="postmark w-fit">9 · Mail</div><h2 className="mt-4 font-serif text-3xl">Choose your mail type</h2><p className="mt-3 text-muted-foreground">For appeals, Certified mail is recommended for proof of timely filing.</p><MailOptions selected={mailType} onSelect={setMailType} /></div>)}
      {step === 9 && <CheckoutStep mailType={mailType} recipient={recipient} />}
                  </WorkflowShell>
                        ) : (
              <div className="text-center py-16">
                <button onClick={startWorkflow} className="inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">
                  Start your response
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* TRUST BAND */}
        <section className="border-y border-rule/60 bg-ink text-paper">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="inline-flex items-center gap-0.4rem border border-stamp/40 px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-[0.15em] text-stamp rounded-full">Trust architecture</div>
            <h2 className="mt-5 font-serif text-3xl text-paper">You stay in control of every step.</h2>
            <p className="mt-4 text-base leading-7 text-paper/70">The notice is the source material. Your facts remain under your control. AI assists — it does not decide. You review the response before approval. Approval applies to the exact draft. Payment is distinct from authorization. Mailing creates a documented record.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <TrustItem title="Your data, your control" text="Documents are processed for extraction. Nothing is shared with third parties." />
              <TrustItem title="Review before send" text="You approve the exact letter. Nothing is mailed without your explicit confirmation." />
              <TrustItem title="Proof of delivery" text="Certified mail provides tracking and delivery confirmation — your record of timely response." />
            </div>
          </div>
        </section>

        {/* RELATED */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Related workflows</div>
            <h2 className="mt-3 font-serif text-2xl">Other notice types</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <RelatedCard href="/workflows/court-summons" title="Court Summons" desc="Respond to a court summons" />
              <RelatedCard href="/workflows/agency-action" title="Agency Action" desc="Respond to government agency actions" />
              <RelatedCard href="/workflows/irs-notice" title="IRS Notice" desc="Respond to IRS notices" />
            </div>
            <div className="mt-6"><Link to="/workflows" className="text-sm text-stamp hover:text-ink transition-colors">Browse all notice types →</Link></div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function KeyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper p-3 text-center">
      <div className="font-serif text-lg text-ink">{value}</div>
      <div className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function ProcessStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div>
      <div className="font-mono text-xs font-semibold text-stamp">{number}</div>
      <h3 className="mt-2 font-serif text-xl text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{text}</p>
    </div>
  );
}

function TrustItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-paper/15 p-4">
      <h3 className="font-medium text-paper">{title}</h3>
      <p className="mt-1.5 text-sm text-paper/60">{text}</p>
    </div>
  );
}

function RelatedCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link to={href} className="block rounded-lg border border-rule/60 bg-card p-4 transition-colors hover:border-stamp/40">
      <div className="font-medium text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}
