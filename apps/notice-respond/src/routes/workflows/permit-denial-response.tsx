import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import { workflows } from "../../domain/workflows";
import { WorkflowShell, Success, UploadZone, ReviewChecks, MailOptions, RecipientForm, CheckoutStep, type StepDef } from "@/components/workflow-shell";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createWorkflowHead } from "@/domain/enhanced-head";
import { useCombinedAnalysis } from "@/domain/use-combined-analysis";
import { getWorkflowSEO } from "@/domain/workflow-seo";

export const Route = createFileRoute("/workflows/permit-denial-response")({
  head: () => createWorkflowHead("permit-denial-response"),
  component: PermitDenialResponse,
});

const STEPS: StepDef[] = [
  { id: "intro", label: "Start" }, { id: "notice", label: "Denial" }, { id: "facts", label: "Facts" },
  { id: "objective", label: "Objective" }, { id: "draft", label: "Draft" }, { id: "review", label: "Review" },
  { id: "attachments", label: "Documents" }, { id: "recipient", label: "Recipient" },
  { id: "mailing", label: "Mail" }, { id: "checkout", label: "Checkout" }, { id: "done", label: "Done" },
];

const REVIEW_CHECKS = [
  "I reviewed every factual statement in this draft.",
  "Permit number, dates, property address, and code references are correct.",
  "I reviewed the uploaded denial and applicable building code sections.",
  "I understand Permit Reply is not providing legal or engineering advice.",
];

function PermitDenialResponse() {
  const definition = workflows["permit-denial-response"];
  const [step, setStep] = useState(0);
  const [denialType, setDenialType] = useState("");
  const [permitNumber, setPermitNumber] = useState("");
  const [authority, setAuthority] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [denialDate, setDenialDate] = useState("");
  const [appealDeadline, setAppealDeadline] = useState("");
  const [citedCode, setCitedCode] = useState("");
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
  const llmAnalysis = useCombinedAnalysis("permit-denial-response");

  const startWorkflow = useCallback(() => {
    setWorkflowStarted(true);
    setTimeout(() => workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, []);

  function generateDraft() {
    return `Re: Request for Reconsideration — ${denialType || "Permit Denial"}
${permitNumber ? `Permit Number: ${permitNumber}` : ""}
${propertyAddress ? `Property: ${propertyAddress}` : ""}
${denialDate ? `Denial Date: ${denialDate}` : ""}
${appealDeadline ? `Appeal Deadline: ${appealDeadline}` : ""}
${citedCode ? `Cited Code Sections: ${citedCode}` : ""}

${authority ? `Dear ${authority},` : "To Whom It May Concern,"}

I am writing to request reconsideration of the ${denialType || "permit denial"} referenced above. ${objective || "[Your objective will appear here.]"}

${facts || "[The facts you provided will appear here.]"}

I respectfully request that you reconsider this denial based on the documentation and code references provided. Thank you for your attention to this matter.

Sincerely,
[Your Name]`;
  }

  function canContinue() {
    switch (step) {
      case 1: return denialType.trim().length > 0;
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
            body: JSON.stringify({ workflowId: "permit-denial-response", analysis: llmAnalysis.llmAnalysis, userFacts: facts, userObjective: objective }),
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

  if (done) return <Success title="Your permit denial response has been submitted" definition={definition} />;

  const DENIAL_TYPES = ["Building Permit Denial", "Zoning Denial", "Variance Denial", "Certificate of Occupancy Denial", "Special Use Permit Denial", "Demolition Permit Denial", "Grading Permit Denial"];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <nav className="mb-4 text-xs text-muted-foreground"><Link to="/workflows">Workflows</Link> <span className="text-rule">/</span> <span>Permit Denial Response</span></nav>
        <h1 className="font-serif text-3xl">{definition?.title || "Respond to a Permit Denial"}</h1>
        <p className="mt-2 text-muted-foreground">{definition?.description}</p>

        {!workflowStarted ? (
          <div className="mt-8 rounded-lg border border-rule/60 bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Upload the denial, identify cited code sections, and prepare a reconsideration request with evidence.</p>
            <button onClick={startWorkflow} className="mt-4 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper">Start the workflow</button>
          </div>
        ) : (
          <div ref={workflowRef}>
            <WorkflowShell
              title={definition?.title || "Respond to a Permit Denial"}
              steps={STEPS}
              step={step}
              setStep={setStep}
              canContinue={canContinue()}
              onNext={next}
              onBack={prev}
            >
              {step === 0 && (
                <div>
                  <h2 className="font-serif text-2xl">Let's prepare your response</h2>
                  <p className="mt-2 text-muted-foreground">You'll review the denial, cite code sections, organize evidence, and prepare a reconsideration request.</p>
                  <div className="mt-4 rounded-lg border border-rule/60 bg-card p-4">
                    <div className="font-mono text-xs uppercase tracking-widest text-stamp">Before you begin</div>
                    <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      <li>▸ Have your permit denial letter ready (PDF or photo)</li>
                      <li>▸ Identify the cited code sections</li>
                      <li>▸ Gather revised plans, engineering reports, code analysis</li>
                      <li>▸ Know the appeal deadline on the denial</li>
                    </ul>
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Denial type</label>
                    <select value={denialType} onChange={(e) => setDenialType(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm">
                      <option value="">Select denial type…</option>
                      {DENIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Permit / application number</label><input value={permitNumber} onChange={(e) => setPermitNumber(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" placeholder="BLD-2026-01234" /></div>
                    <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Issuing authority</label><input value={authority} onChange={(e) => setAuthority(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" placeholder="Building Department" /></div>
                  </div>
                  <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Property address</label><input value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" placeholder="123 Main Street" /></div>
                  <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Cited code sections</label><input value={citedCode} onChange={(e) => setCitedCode(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" placeholder="IBC 1011.1, IRC R311.2, local zoning §15.04.030" /></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Denial date</label><input type="date" value={denialDate} onChange={(e) => setDenialDate(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" /></div>
                    <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Appeal deadline</label><input type="date" value={appealDeadline} onChange={(e) => setAppealDeadline(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" /></div>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div><h2 className="font-serif text-2xl">What are the facts?</h2><p className="mt-2 text-muted-foreground">Describe the project, the denial reasons, and why the project meets code. Cite specific code sections.</p><textarea value={facts} onChange={(e) => setFacts(e.target.value)} className="mt-3 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm leading-7 min-h-[150px]" placeholder="The denial states that [reason]. I disagree because [code section] supports [position]…" /></div>
              )}
              {step === 3 && (
                <div><h2 className="font-serif text-2xl">What outcome do you want?</h2><p className="mt-2 text-muted-foreground">State your objective — reconsideration, appeal, or resubmission with corrections.</p><textarea value={objective} onChange={(e) => setObjective(e.target.value)} className="mt-3 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm leading-7 min-h-[120px]" placeholder="I am requesting reconsideration of this denial based on the following code compliance documentation…" /></div>
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
