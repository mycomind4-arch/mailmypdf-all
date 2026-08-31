import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";
import { workflows } from "../../domain/workflows";
import { WorkflowShell, Success, UploadZone, ReviewChecks, MailOptions, RecipientForm, CheckoutStep, type StepDef } from "@/components/workflow-shell";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createWorkflowHead } from "@/domain/enhanced-head";
import { useCombinedAnalysis } from "@/domain/use-combined-analysis";
import { LLMAnalysisPanel } from "@/components/llm-analysis-panel";
import { FAQSection } from "@/components/faq-section";
import { getWorkflowSEO } from "@/domain/workflow-seo";

export const Route = createFileRoute("/workflows/code-enforcement")({
  head: () => createWorkflowHead("code-enforcement"),
  component: codeenforcement,
});

const STEPS: StepDef[] = [
  { id: "intro", label: "Start" }, { id: "notice", label: "Notice" }, { id: "facts", label: "Facts" },
  { id: "objective", label: "Objective" }, { id: "draft", label: "Draft" }, { id: "review", label: "Review" },
  { id: "attachments", label: "Documents" }, { id: "recipient", label: "Recipient" },
  { id: "mailing", label: "Mail" }, { id: "checkout", label: "Checkout" }, { id: "done", label: "Done" },
];

const REVIEW_CHECKS = [
  "I reviewed every factual statement in this draft.",
  "Names, dates, notice numbers, and amounts are correct.",
  "I reviewed the uploaded notice and agency instructions.",
  "I understand Notice Respond is not providing legal advice.",
];

function codeenforcement() {
  const definition = workflows["code-enforcement"];
  const [step, setStep] = useState(0);
  const [agency, setAgency] = useState("");
  const [noticeNumber, setNoticeNumber] = useState("");
  const [noticeDate, setNoticeDate] = useState("");
  const [responseDeadline, setResponseDeadline] = useState("");
  const [facts, setFacts] = useState("");
  const [objective, setObjective] = useState("");
  const [draft, setDraft] = useState("");
  const [checks, setChecks] = useState<boolean[]>(REVIEW_CHECKS.map(() => false));
  const [mailType, setMailType] = useState("certified");
  const [recipient, setRecipient] = useState({ name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" });
  const [done, setDone] = useState(false);
  const allChecked = checks.every(Boolean);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const workflowRef = useRef<HTMLDivElement>(null);

  const startWorkflow = useCallback(() => {
    setWorkflowStarted(true);
    setTimeout(() => {
      workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  const llmAnalysis = useCombinedAnalysis("code-enforcement");

  function generateDraft() {
    return `Re: Response to Respond to a Code Enforcement Notice
${agency ? `Agency: ${agency}` : ""}
${noticeNumber ? `Reference: ${noticeNumber}` : ""}
${noticeDate ? `Notice Date: ${noticeDate}` : ""}
${responseDeadline ? `Response Deadline: ${responseDeadline}` : ""}

Dear Sir or Madam,

I am writing in response to the notice referenced above. ${objective || "[Your objective will appear here.]"}

${facts || "[The facts you provided will appear here.]"}

Sincerely,
[Your Name]`;
  }

  function canContinue() {
    switch (step) {
      case 1: return agency.trim().length > 0 || noticeNumber.trim().length > 0;
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
            body: JSON.stringify({ workflowId: "code-enforcement", analysis: llmAnalysis.llmAnalysis, userFacts: facts, userObjective: objective }),
          });
          if (r.ok) {
            const d = await r.json();
            setDraft(d.draft);
          } else {
            setDraft(generateDraft());
          }
        } else {
          setDraft(generateDraft());
        }
      } catch (e) {
        setDraft(generateDraft());
      }
    }
    if (step === STEPS.length - 1) { setDone(true); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  if (done) return <Success title="Your response has been submitted" href="/workflows/code-enforcement" />;

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
              <span className="text-ink-soft">Municipal Notice</span>
            </nav>
            <div className="postmark w-fit mt-6">Municipal Notice</div>
            <h1 className="mt-6 font-serif text-4xl leading-[1.1] sm:text-5xl md:text-6xl">
              Respond to your <span className="italic text-stamp">code enforcement notice</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
              Your city or county sent a code enforcement notice alleging a property violation. Upload it, understand the violation, and prepare a documented response with evidence of compliance or a plan to correct.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={startWorkflow} className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">
                Start your response
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </button>
              <Link to="/workflows" className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-6 py-3.5 text-sm font-medium transition-colors hover:border-ink/30">Browse other notices</Link>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule/60 bg-rule/60 sm:grid-cols-4">
              <KeyFact label="Notice type" value="Code Violation" />
              <KeyFact label="Jurisdiction" value="City or county" />
              <KeyFact label="Recommended mail" value="Certified" />
              <KeyFact label="Cost to prepare" value="Free" />
            </div>
          </div>
        </section>

        {/* WHAT IS */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Understanding the notice</div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">What is a code enforcement notice?</h2>
            <div className="mt-6 space-y-4 text-base leading-7 text-ink-soft">
              <p>A code enforcement notice is issued by a city or county government when a property is alleged to violate local ordinances. Common violations include overgrown vegetation, unpermitted structures, unsafe conditions, parking violations, and nuisance complaints.</p>
              <p>These notices typically include a deadline to correct the violation and may carry daily fines for non-compliance. Ignoring them can lead to administrative hearings, liens on your property, or in extreme cases, abatement where the government performs the work and bills you.</p>
              <p>You have the right to respond, request an inspection, or appeal. A documented response showing your compliance plan or contesting the violation can stop the escalation and preserve your right to a hearing.</p>
            </div>
            <div className="mt-8 rounded-lg border border-rule/60 bg-paper-deep/30 p-5">
              <div className="font-mono text-xs uppercase tracking-widest text-stamp">What this notice includes</div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Issuing department</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Case/reference number</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Cited violation and code section</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Property address</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Compliance deadline</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Required corrective action</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Fine or penalty amount</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Hearing or appeal information</li>
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
              <ProcessStep number="01" title="Upload & analyze" text="Upload the code enforcement notice. AI extracts the violation type, cited code sections, deadline, and required corrections." />
              <ProcessStep number="02" title="Review & draft" text="Document your compliance plan or contest the violation with evidence — photos, permits, prior correspondence. Generate a formal response letter." />
              <ProcessStep number="03" title="Mail with proof" text="Approve the exact draft. Certified mail creates a documented record of your response before the compliance deadline." />
            </div>
          </div>
        </section>

        {/* WORKFLOW */}
        <section ref={workflowRef} className="border-b border-rule/60" style={{ scrollMarginTop: "80px" }}>
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            {workflowStarted ? (
              <WorkflowShell title="Respond to a Code Enforcement Notice" steps={STEPS} step={step} setStep={setStep} canContinue={canContinue()} onNext={next} onBack={() => setStep((s) => Math.max(s - 1, 0))}>
      {step === 0 && (
        <div>
          <div className="postmark w-fit">1 · Start</div>
          <h2 className="mt-4 font-serif text-4xl">Respond to a Code Enforcement Notice</h2>
          <p className="mt-3 text-muted-foreground">Organize a code enforcement notice around the property, alleged violations, inspection dates, correction deadline, and evidence you want the agency to consider.</p>
          <div className="mt-6 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground">
            <div className="font-mono text-xs uppercase tracking-widest text-stamp">Disclaimer</div>
            <p className="mt-2">{definition?.disclaimer ?? "Code enforcement varies by municipality. Notice Respond is not a law firm and does not provide legal advice."}</p>
          </div>
          {(() => { const seo = getWorkflowSEO("code-enforcement"); return seo ? <FAQSection faq={seo.faq} /> : null; })()}
        </div>
      )}
      {step === 1 && (
        <div>
          <div className="postmark w-fit">2 · Notice</div>
          <h2 className="mt-4 font-serif text-3xl">Start with the notice</h2>
          <label className="cursor-pointer block">
            <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              let text = ""; if (file.type === "text/plain") text = await file.text();
              await llmAnalysis.analyzeWithLLM(file, text);
            }} />
            <UploadZone label="Upload notice" sublabel="PDF, JPG, or PNG" />
          </label>
          {llmAnalysis.llmAnalysis && (
            <LLMAnalysisPanel analysis={llmAnalysis.llmAnalysis} provider={llmAnalysis.llmProvider} />
          )}
          {llmAnalysis.llmLoading && (
            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary animate-pulse">✦ AI is analyzing your document…</div>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div><label className="input-label">Agency</label><input className="input-field" value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="Code Enforcement" /></div>
            <div><label className="input-label">Notice / reference number</label><input className="input-field" value={noticeNumber} onChange={(e) => setNoticeNumber(e.target.value)} /></div>
            <div><label className="input-label">Notice date</label><input type="date" className="input-field" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} /></div>
            <div><label className="input-label">Response deadline</label><input type="date" className="input-field" value={responseDeadline} onChange={(e) => setResponseDeadline(e.target.value)} /></div>
          </div>
        </div>
      )}
      {step === 2 && (<div><div className="postmark w-fit">3 · Facts</div><h2 className="mt-4 font-serif text-3xl">What facts should the response address?</h2><p className="mt-3 text-muted-foreground">Use your own words. Only include information you can verify.</p><textarea className="input-field mt-6 min-h-48" value={facts} onChange={(e) => setFacts(e.target.value)} placeholder="Enter the relevant facts..." /></div>)}
      {step === 3 && (<div><div className="postmark w-fit">4 · Objective</div><h2 className="mt-4 font-serif text-3xl">What do you want the response to accomplish?</h2><textarea className="input-field mt-6 min-h-40" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Describe the outcome you want..." /></div>)}
      {step === 4 && (
        <div>
          <div className="postmark w-fit">5 · Draft</div>
          <h2 className="mt-4 font-serif text-3xl">Your response letter</h2>
          <p className="mt-3 text-muted-foreground">Review every fact, name, date, and statement. This is editable.</p>
          <textarea className="input-field mt-6 min-h-72 font-mono text-sm leading-6" value={draft} onChange={(e) => setDraft(e.target.value)} />
          {llmAnalysis.llmAnalysis && (
            <button
              onClick={async () => {
                const r = await fetch("/api/workflows/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflowId: "code-enforcement", analysis: llmAnalysis.llmAnalysis, userFacts: facts, userObjective: objective }) });
                if (r.ok) { const d = await r.json(); setDraft(d.draft); }
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5"
            >✦ Regenerate with AI</button>
          )}
        </div>
      )}
      {step === 5 && (<div><div className="postmark w-fit">6 · Review</div><h2 className="mt-4 font-serif text-3xl">Review before anything is mailed</h2><p className="mt-3 text-muted-foreground">Please confirm each item below.</p><ReviewChecks items={REVIEW_CHECKS} checks={checks} setChecks={setChecks} /></div>)}
      {step === 6 && (<div><div className="postmark w-fit">7 · Documents</div><h2 className="mt-4 font-serif text-3xl">Add supporting documents</h2><p className="mt-3 text-muted-foreground">Attach any documents referenced in your response.</p><UploadZone label="Add attachments" sublabel="Evidence, records, correspondence" /></div>)}
      {step === 7 && (<div><div className="postmark w-fit">8 · Recipient</div><h2 className="mt-4 font-serif text-3xl">Where should we send it?</h2><p className="mt-3 text-muted-foreground">Enter the agency's mailing address.</p><RecipientForm recipient={recipient} setRecipient={setRecipient} orgPlaceholder={agency || "Code Enforcement"} /></div>)}
      {step === 8 && (<div><div className="postmark w-fit">9 · Mail</div><h2 className="mt-4 font-serif text-3xl">Choose your mail type</h2><p className="mt-3 text-muted-foreground">Certified mail is recommended for proof of timely delivery.</p><MailOptions selected={mailType} onSelect={setMailType} /></div>)}
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
              <RelatedCard href="/workflows/permit-correction" title="Permit Correction" desc="Respond to permit-related notices" />
              <RelatedCard href="/workflows/court-summons" title="Court Summons" desc="Respond to a court summons" />
              <RelatedCard href="/workflows/tax-notice" title="Tax Notice" desc="Respond to state or local tax notices" />
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
