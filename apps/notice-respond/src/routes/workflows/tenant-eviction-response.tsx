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

export const Route = createFileRoute("/workflows/tenant-eviction-response")({
  head: () => createWorkflowHead("tenant-eviction-response"),
  component: TenantEvictionResponse,
});

const STEPS: StepDef[] = [
  { id: "intro", label: "Start" }, { id: "notice", label: "Notice" }, { id: "facts", label: "Facts" },
  { id: "objective", label: "Objective" }, { id: "draft", label: "Draft" }, { id: "review", label: "Review" },
  { id: "attachments", label: "Documents" }, { id: "recipient", label: "Recipient" },
  { id: "mailing", label: "Mail" }, { id: "checkout", label: "Checkout" }, { id: "done", label: "Done" },
];

const REVIEW_CHECKS = [
  "I reviewed every factual statement in this draft.",
  "Landlord name, dates, property address, and amounts are correct.",
  "I reviewed the uploaded notice and applicable lease provisions.",
  "I understand Tenant Reply is not providing legal advice.",
];

function TenantEvictionResponse() {
  const definition = workflows["tenant-eviction-response"];
  const [step, setStep] = useState(0);
  const [noticeType, setNoticeType] = useState("");
  const [landlordName, setLandlordName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [noticeDate, setNoticeDate] = useState("");
  const [responseDeadline, setResponseDeadline] = useState("");
  const [amountOwed, setAmountOwed] = useState("");
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

  const llmAnalysis = useCombinedAnalysis("tenant-eviction-response");

  const startWorkflow = useCallback(() => {
    setWorkflowStarted(true);
    setTimeout(() => workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, []);

  function generateDraft() {
    return `Re: Response to ${noticeType || "Eviction Notice"}
${propertyAddress ? `Property: ${propertyAddress}` : ""}
${noticeDate ? `Notice Date: ${noticeDate}` : ""}
${responseDeadline ? `Response Deadline: ${responseDeadline}` : ""}
${amountOwed ? `Amount Owed: ${amountOwed}` : ""}

${landlordName ? `Dear ${landlordName},` : "To Whom It May Concern,"}

I am writing in response to the ${noticeType || "notice"} referenced above. ${objective || "[Your objective will appear here.]"}

${facts || "[The facts you provided will appear here.]"}

I respectfully request that you consider this response and the documentation provided. Thank you for your attention to this matter.

Sincerely,
[Your Name]`;
  }

  function canContinue() {
    switch (step) {
      case 1: return noticeType.trim().length > 0;
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
            body: JSON.stringify({ workflowId: "tenant-eviction-response", analysis: llmAnalysis.llmAnalysis, userFacts: facts, userObjective: objective }),
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

  if (done) return <Success title="Your response has been submitted" definition={definition} />;

  const NOTICE_TYPES = ["Pay or Quit Notice", "Cure or Quit Notice", "Unconditional Quit Notice", "Termination Notice (30/60/90-day)", "Lease Violation Notice"];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <nav className="mb-4 text-xs text-muted-foreground"><Link to="/workflows">Workflows</Link> <span className="text-rule">/</span> <span>Tenant Eviction Response</span></nav>
        <h1 className="font-serif text-3xl">{definition?.title || "Respond to an Eviction Notice"}</h1>
        <p className="mt-2 text-muted-foreground">{definition?.description}</p>

        {!workflowStarted ? (
          <div className="mt-8 rounded-lg border border-rule/60 bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Walk through each step — upload the notice, organize your facts, draft your response, and choose your mail type.</p>
            <button onClick={startWorkflow} className="mt-4 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper">Start the workflow</button>
          </div>
        ) : (
          <div ref={workflowRef}>
            <WorkflowShell
              title={definition?.title || "Respond to an Eviction Notice"}
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
                  <p className="mt-2 text-muted-foreground">You'll review the notice, organize your facts, draft your response, and send it certified.</p>
                  <div className="mt-4 rounded-lg border border-rule/60 bg-card p-4">
                    <div className="font-mono text-xs uppercase tracking-widest text-stamp">Before you begin</div>
                    <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      <li>▸ Have your eviction notice ready (PDF or photo)</li>
                      <li>▸ Gather your lease, rent receipts, and correspondence</li>
                      <li>▸ Know the response deadline on the notice</li>
                      <li>▸ Have your landlord's mailing address</li>
                    </ul>
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Notice type</label>
                    <select value={noticeType} onChange={(e) => setNoticeType(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm">
                      <option value="">Select notice type…</option>
                      {NOTICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Landlord / property manager</label><input value={landlordName} onChange={(e) => setLandlordName(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" placeholder="Landlord name" /></div>
                    <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Property address</label><input value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" placeholder="123 Main St, Apt 4" /></div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Notice date</label><input type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" /></div>
                    <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Response deadline</label><input type="date" value={responseDeadline} onChange={(e) => setResponseDeadline(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" /></div>
                  </div>
                  {noticeType.includes("Pay") && (
                    <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Amount owed (if stated)</label><input value={amountOwed} onChange={(e) => setAmountOwed(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" placeholder="$2,400" /></div>
                  )}
                </div>
              )}
              {step === 2 && (
                <div><h2 className="font-serif text-2xl">What are the facts?</h2><p className="mt-2 text-muted-foreground">Describe what happened. Include dates, communications, lease terms, and evidence.</p><textarea value={facts} onChange={(e) => setFacts(e.target.value)} className="mt-3 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm leading-7 min-h-[150px]" placeholder="On [date], I received a [notice type] stating that [reason]…" /></div>
              )}
              {step === 3 && (
                <div><h2 className="font-serif text-2xl">What outcome do you want?</h2><p className="mt-2 text-muted-foreground">State your objective — dispute, pay, request time, or document corrections.</p><textarea value={objective} onChange={(e) => setObjective(e.target.value)} className="mt-3 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm leading-7 min-h-[120px]" placeholder="I am disputing this notice because…" /></div>
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
