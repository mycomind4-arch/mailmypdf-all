import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import { workflows } from "../../domain/workflows";
import { WorkflowShell, Success, UploadZone, ReviewChecks, MailOptions, RecipientForm, CheckoutStep, type StepDef } from "@/components/workflow-shell";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createWorkflowHead } from "@/domain/enhanced-head";
import { useCombinedAnalysis } from "@/domain/use-combined-analysis";
import { getWorkflowSEO } from "@/domain/workflow-seo";

export const Route = createFileRoute("/workflows/claim-proof-package")({
  head: () => createWorkflowHead("claim-proof-package"),
  component: ClaimProofPackage,
});

const STEPS: StepDef[] = [
  { id: "intro", label: "Start" }, { id: "notice", label: "Decision" }, { id: "facts", label: "Facts" },
  { id: "objective", label: "Objective" }, { id: "draft", label: "Draft" }, { id: "review", label: "Review" },
  { id: "attachments", label: "Evidence" }, { id: "recipient", label: "Recipient" },
  { id: "mailing", label: "Mail" }, { id: "checkout", label: "Checkout" }, { id: "done", label: "Done" },
];

const REVIEW_CHECKS = [
  "I reviewed every factual statement in this draft.",
  "Claim number, dates, and amounts are correct.",
  "I have attached evidence addressing each denial reason.",
  "I understand Claim Proof is not providing legal or claims advice.",
];

function ClaimProofPackage() {
  const definition = workflows["claim-proof-package"];
  const [step, setStep] = useState(0);
  const [claimType, setClaimType] = useState("");
  const [claimNumber, setClaimNumber] = useState("");
  const [decisionDate, setDecisionDate] = useState("");
  const [appealDeadline, setAppealDeadline] = useState("");
  const [agency, setAgency] = useState("");
  const [facts, setFacts] = useState("");
  const [objective, setObjective] = useState("");
  const [draft, setDraft] = useState("");
  const [checks, setChecks] = useState<boolean[]>(REVIEW_CHECKS.map(() => false));
  const [mailType, setMailType] = useState("certified");
  const [recipient, setRecipient] = useState({ name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" });
  const [done, setDone] = useState(false);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const workflowRef = useRef<HTMLDivElement>(null);
  const allChecked = checks.every(Boolean);
  const llmAnalysis = useCombinedAnalysis("claim-proof-package");

  const startWorkflow = useCallback(() => {
    setWorkflowStarted(true);
    setTimeout(() => workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, []);

  function generateDraft() {
    return `Re: Appeal of ${claimType || "Claim"} Decision
${claimNumber ? `Claim Number: ${claimNumber}` : ""}
${decisionDate ? `Decision Date: ${decisionDate}` : ""}
${appealDeadline ? `Appeal Deadline: ${appealDeadline}` : ""}

${agency ? `Dear ${agency},` : "To Whom It May Concern,"}

I am writing to appeal the decision referenced above. ${objective || "[Your objective will appear here.]"}

${facts || "[The facts you provided will appear here.]"}

I respectfully request that you reconsider this decision based on the evidence provided. Thank you for your attention to this matter.

Sincerely,
[Your Name]`;
  }

  function canContinue() {
    switch (step) {
      case 1: return claimType.trim().length > 0;
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
            body: JSON.stringify({ workflowId: "claim-proof-package", analysis: llmAnalysis.llmAnalysis, userFacts: facts, userObjective: objective }),
          });
          if (r.ok) { const d = await r.json(); setDraft(d.draft); }
          else { setDraft(generateDraft()); }
        } else { setDraft(generateDraft()); }
      } catch { setDraft(generateDraft()); }
    }
    if (step === STEPS.length - 1) { setDone(true); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function prev() { if (step > 0) setStep((s) => s - 1); }

  if (done) return <Success title="Your claim proof package has been submitted" definition={definition} />;

  const CLAIM_TYPES = ["Insurance Denial", "Disability (SSDI/SSI) Denial", "Unemployment Denial", "Health Insurance Denial", "Life Insurance Denial", "Workers Comp Denial", "VA Benefits Denial", "FEMA Denial"];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <nav className="mb-4 text-xs text-muted-foreground"><Link to="/workflows">Workflows</Link> <span className="text-rule">/</span> <span>Claim Proof Package</span></nav>
        <h1 className="font-serif text-3xl">{definition?.title || "Build a Claim Proof Package"}</h1>
        <p className="mt-2 text-muted-foreground">{definition?.description}</p>

        {!workflowStarted ? (
          <div className="mt-8 rounded-lg border border-rule/60 bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Upload the decision, organize your evidence, and build a proof package addressing each denial reason.</p>
            <button onClick={startWorkflow} className="mt-4 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper">Start the workflow</button>
          </div>
        ) : (
          <div ref={workflowRef}>
            <WorkflowShell
              title={definition?.title || "Build a Claim Proof Package"}
              steps={STEPS}
              step={step}
              setStep={setStep}
              canContinue={canContinue()}
              onNext={next}
              onBack={prev}
            >
              {step === 0 && (
                <div>
                  <h2 className="font-serif text-2xl">Build your proof package</h2>
                  <p className="mt-2 text-muted-foreground">You'll review the decision, map evidence to each denial reason, and prepare a submission-ready package.</p>
                  <div className="mt-4 rounded-lg border border-rule/60 bg-card p-4">
                    <div className="font-mono text-xs uppercase tracking-widest text-stamp">Before you begin</div>
                    <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      <li>▸ Have your decision letter ready (PDF or photo)</li>
                      <li>▸ Gather medical records, financial records, policy documents</li>
                      <li>▸ Know the appeal deadline on the decision</li>
                      <li>▸ Have the appeal address</li>
                    </ul>
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Claim type</label>
                    <select value={claimType} onChange={(e) => setClaimType(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm">
                      <option value="">Select claim type…</option>
                      {CLAIM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Claim number</label><input value={claimNumber} onChange={(e) => setClaimNumber(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" placeholder="CLM-2026-01234" /></div>
                    <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Agency / insurer</label><input value={agency} onChange={(e) => setAgency(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" placeholder="SSA / State Farm / etc." /></div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Decision date</label><input type="date" value={decisionDate} onChange={(e) => setDecisionDate(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" /></div>
                    <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Appeal deadline</label><input type="date" value={appealDeadline} onChange={(e) => setAppealDeadline(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" /></div>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div><h2 className="font-serif text-2xl">What are the facts?</h2><p className="mt-2 text-muted-foreground">Describe the claim, the decision, and why you believe it was wrong. Reference specific evidence.</p><textarea value={facts} onChange={(e) => setFacts(e.target.value)} className="mt-3 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm leading-7 min-h-[150px]" placeholder="The decision denied my claim because [reason]. I disagree because [evidence]…" /></div>
              )}
              {step === 3 && (
                <div><h2 className="font-serif text-2xl">What outcome do you want?</h2><p className="mt-2 text-muted-foreground">State your objective — appeal the denial, request reconsideration, or submit additional evidence.</p><textarea value={objective} onChange={(e) => setObjective(e.target.value)} className="mt-3 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm leading-7 min-h-[120px]" placeholder="I am appealing this denial and requesting reconsideration based on…" /></div>
              )}
              {step === 4 && (
                <div><h2 className="font-serif text-2xl">Review your draft</h2><div className="mt-3 rounded-lg border border-rule/60 bg-card p-5 text-sm leading-7 whitespace-pre-wrap min-h-[300px]">{draft || generateDraft()}</div></div>
              )}
              {step === 5 && <ReviewChecks checks={REVIEW_CHECKS} values={checks} onChange={setChecks} />}
              {step === 6 && <UploadZone />}
              {step === 7 && <RecipientForm recipient={recipient} onChange={setRecipient} />}
              {step === 8 && <MailOptions value={mailType} onChange={setMailType} />}
              {step === 9 && <CheckoutStep mailType={mailType} recipient={recipient} onSubmit={() => setStep(10)} />}
            </WorkflowShell>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
