import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import { workflows } from "../../domain/workflows";
import { WorkflowShell, Success, UploadZone, ReviewChecks, MailOptions, RecipientForm, CheckoutStep, type StepDef } from "@/components/workflow-shell";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createWorkflowHead } from "@/domain/enhanced-head";
import { useCombinedAnalysis } from "@/domain/use-combined-analysis";
import { getWorkflowSEO } from "@/domain/workflow-seo";

export const Route = createFileRoute("/workflows/tenant-repair-demand")({
  head: () => createWorkflowHead("tenant-repair-demand"),
  component: TenantRepairDemand,
});

const STEPS: StepDef[] = [
  { id: "intro", label: "Start" }, { id: "notice", label: "Issue" }, { id: "facts", label: "Facts" },
  { id: "objective", label: "Objective" }, { id: "draft", label: "Draft" }, { id: "review", label: "Review" },
  { id: "attachments", label: "Documents" }, { id: "recipient", label: "Recipient" },
  { id: "mailing", label: "Mail" }, { id: "checkout", label: "Checkout" }, { id: "done", label: "Done" },
];

const REVIEW_CHECKS = [
  "I reviewed every factual statement in this draft.",
  "Property address and landlord name are correct.",
  "I have attached photos and evidence for each issue.",
  "I understand Tenant Reply is not providing legal advice.",
];

function TenantRepairDemand() {
  const definition = workflows["tenant-repair-demand"];
  const [step, setStep] = useState(0);
  const [landlordName, setLandlordName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [issueType, setIssueType] = useState("");
  const [dateReported, setDateReported] = useState("");
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
  const llmAnalysis = useCombinedAnalysis("tenant-repair-demand");

  const startWorkflow = useCallback(() => {
    setWorkflowStarted(true);
    setTimeout(() => workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, []);

  function generateDraft() {
    return `Re: Repair Demand — ${issueType || "Habitability Issue"}
${propertyAddress ? `Property: ${propertyAddress}` : ""}
${dateReported ? `Date First Reported: ${dateReported}` : ""}

${landlordName ? `Dear ${landlordName},` : "To Whom It May Concern,"}

I am writing to formally request repairs at the above property. ${objective || "[Your objective will appear here.]"}

${facts || "[The facts you provided will appear here.]"}

I request that these repairs be completed within the statutory period. Thank you for your prompt attention to this matter.

Sincerely,
[Your Name]`;
  }

  function canContinue() {
    switch (step) {
      case 1: return issueType.trim().length > 0;
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
            body: JSON.stringify({ workflowId: "tenant-repair-demand", analysis: llmAnalysis.llmAnalysis, userFacts: facts, userObjective: objective }),
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

  if (done) return <Success title="Your repair demand has been submitted" definition={definition} />;

  const ISSUE_TYPES = ["Plumbing", "Heating / HVAC", "Electrical", "Mold / Moisture", "Pests / Infestation", "Roof Leak", "Structural", "Hot Water", "Other Habitability Issue"];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <nav className="mb-4 text-xs text-muted-foreground"><Link to="/workflows">Workflows</Link> <span className="text-rule">/</span> <span>Tenant Repair Demand</span></nav>
        <h1 className="font-serif text-3xl">{definition?.title || "Respond to a Repair Demand"}</h1>
        <p className="mt-2 text-muted-foreground">{definition?.description}</p>

        {!workflowStarted ? (
          <div className="mt-8 rounded-lg border border-rule/60 bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Document the issue, organize your evidence, and prepare a formal repair demand letter.</p>
            <button onClick={startWorkflow} className="mt-4 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper">Start the workflow</button>
          </div>
        ) : (
          <div ref={workflowRef}>
            <WorkflowShell
              title={definition?.title || "Tenant Repair Demand"}
              steps={STEPS}
              step={step}
              setStep={setStep}
              canContinue={canContinue()}
              onNext={next}
              onBack={prev}
            >
              {step === 0 && (
                <div>
                  <h2 className="font-serif text-2xl">Document the habitability issue</h2>
                  <p className="mt-2 text-muted-foreground">You'll describe the issue, organize evidence, and prepare a formal demand letter.</p>
                  <div className="mt-4 rounded-lg border border-rule/60 bg-card p-4">
                    <div className="font-mono text-xs uppercase tracking-widest text-stamp">Before you begin</div>
                    <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      <li>▸ Have photos of the issue ready</li>
                      <li>▸ Gather any prior repair requests</li>
                      <li>▸ Have your lease agreement</li>
                      <li>▸ Know your landlord's mailing address</li>
                    </ul>
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Issue type</label>
                    <select value={issueType} onChange={(e) => setIssueType(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm">
                      <option value="">Select issue type…</option>
                      {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Landlord name</label><input value={landlordName} onChange={(e) => setLandlordName(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" /></div>
                    <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Property address</label><input value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" /></div>
                  </div>
                  <div><label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Date first reported (if previously)</label><input type="date" value={dateReported} onChange={(e) => setDateReported(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm" /></div>
                </div>
              )}
              {step === 2 && (
                <div><h2 className="font-serif text-2xl">Describe the issue</h2><p className="mt-2 text-muted-foreground">Describe the condition, when it started, and any prior requests for repair.</p><textarea value={facts} onChange={(e) => setFacts(e.target.value)} className="mt-3 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm leading-7 min-h-[150px]" placeholder="The issue is [description]. It started on [date]. I previously reported it on [date] via [method]…" /></div>
              )}
              {step === 3 && (
                <div><h2 className="font-serif text-2xl">What repairs are you requesting?</h2><p className="mt-2 text-muted-foreground">Be specific about what needs to be fixed and the timeline you expect.</p><textarea value={objective} onChange={(e) => setObjective(e.target.value)} className="mt-3 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm leading-7 min-h-[120px]" placeholder="I am requesting that the following repairs be completed…" /></div>
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
