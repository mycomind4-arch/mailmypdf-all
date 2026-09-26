import { useMemo, useState } from "react";
import type { StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import { Field, SectionCard, StatusPill, StepShell, TextArea, TextField } from "@mailmypdf/workflow-ui";

type WorkflowId = "pre-filing-lien-priority-search" | "priority-strategy" | "security-agreement-generation";

const DEFINITIONS: Record<WorkflowId, StepWorkflowDefinition> = {
  "pre-filing-lien-priority-search": {
    id: "pre-filing-lien-priority-search",
    title: "Pre-Filing Lien & Priority Search",
    steps: [
      { id: "matter", label: "Matter" },
      { id: "records", label: "Records" },
      { id: "review", label: "Review" },
    ],
  },
  "priority-strategy": {
    id: "priority-strategy",
    title: "Priority Strategy",
    steps: [
      { id: "matter", label: "Matter" },
      { id: "interests", label: "Competing interests" },
      { id: "review", label: "Review" },
    ],
  },
  "security-agreement-generation": {
    id: "security-agreement-generation",
    title: "Security Agreement Generation",
    steps: [
      { id: "parties", label: "Parties" },
      { id: "collateral", label: "Collateral" },
      { id: "review", label: "Review" },
    ],
  },
};

const COPY: Record<WorkflowId, { subtitle: string; firstLabel: string; firstHint: string; secondLabel: string; secondHint: string; output: string }> = {
  "pre-filing-lien-priority-search": {
    subtitle: "Organize search identities and source records before any priority analysis.",
    firstLabel: "Authoritative debtor name",
    firstHint: "Use the name shown by the strongest available source. Search variants stay separate from the legal name.",
    secondLabel: "Records or search notes",
    secondHint: "List filing numbers, jurisdictions, dates, provider limits, and source references. A no-hit search is not proof that no competing interest exists.",
    output: "A reviewable search plan and source-linked coverage summary",
  },
  "priority-strategy": {
    subtitle: "Normalize competing interests and expose missing fields before a rule comparison is attempted.",
    firstLabel: "Subject interest and jurisdiction",
    firstHint: "Describe the interest you want reviewed and the jurisdiction attached to the source record.",
    secondLabel: "Competing-interest records",
    secondHint: "Include claimant, interest kind, event date, status, external record id, and a source reference for each record.",
    output: "A completeness assessment; this workflow does not certify legal priority",
  },
  "security-agreement-generation": {
    subtitle: "Assemble a source-linked draft only after parties, obligation, collateral, and authentication evidence are identified.",
    firstLabel: "Parties and obligation findings",
    firstHint: "Enter finding identifiers or source references. Names typed here remain reported facts until independently reviewed.",
    secondLabel: "Collateral description and source notes",
    secondHint: "Use the agreement's actual description and identify the source and authentication evidence supporting it.",
    output: "A draft for human review; it is not an executed or legally sufficient agreement",
  },
};

export function SecuredTransactionReviewIntake({ workflowId }: { workflowId: WorkflowId }) {
  const definition = DEFINITIONS[workflowId];
  const copy = COPY[workflowId];
  const [stepIndex, setStepIndex] = useState(0);
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const current = definition.steps[stepIndex]!;
  const isReview = current.id === "review";
  const completed = useMemo(() => definition.steps.filter((step) => step.id !== "review" && (step.id === definition.steps[0]?.id ? first : second).trim()).map((step) => step.id), [definition.steps, first, second]);

  return (
    <StepShell
      breadcrumb={[{ label: "Secured Transactions", href: "/secured-transactions" }, { label: definition.title }]}
      title={definition.title}
      subtitle={copy.subtitle}
      lastSavedLabel="Review-only draft · not saved to an account"
      steps={definition.steps}
      currentStepId={current.id}
      completedStepIds={completed}
      onStepClick={(id) => setStepIndex(definition.steps.findIndex((step) => step.id === id))}
      rail={(
        <>
          <SectionCard title="Current boundary">
            <StatusPill tone="neutral" label="Human review required" />
            <p className="wf-intake-note">Reported details are not verified evidence. No filing, payment, mailing, or legal conclusion is produced from this screen.</p>
          </SectionCard>
          <SectionCard title="Expected output">
            <p className="wf-intake-note">{copy.output}.</p>
          </SectionCard>
        </>
      )}
    >
      <SectionCard title={isReview ? "Review before continuing" : current.label} description={isReview ? "Check the exact reported inputs and identify what still needs source review." : current.id === definition.steps[0]?.id ? copy.firstHint : copy.secondHint}>
        {!isReview && current.id === definition.steps[0]?.id && (
          <Field label={copy.firstLabel} required>
            <TextField value={first} maxLength={2000} onChange={(event) => setFirst(event.target.value)} />
          </Field>
        )}
        {!isReview && current.id !== definition.steps[0]?.id && (
          <Field label={copy.secondLabel} hint="Do not include passwords, payment credentials, or unnecessary sensitive identifiers.">
            <TextArea value={second} maxLength={5000} rows={8} onChange={(event) => setSecond(event.target.value)} />
          </Field>
        )}
        {isReview && (
          <div className="wf-intake-review-section">
            <h3>Reported input</h3>
            <dl className="wf-intake-summary">
              <div><dt>{copy.firstLabel}</dt><dd>{first || "Not provided"}</dd></div>
              <div><dt>{copy.secondLabel}</dt><dd>{second || "Not provided"}</dd></div>
            </dl>
            <div className="wf-intake-callout">The next implementation step is account-backed persistence and source-document review. Until then, this is a local review draft.</div>
          </div>
        )}
        <div className="wf-intake-navigation">
          <button type="button" className="wf-btn wf-btn--outline" disabled={stepIndex === 0} onClick={() => setStepIndex((value) => value - 1)}>Back</button>
          {stepIndex < definition.steps.length - 1 && <button type="button" className="wf-btn wf-btn--primary" onClick={() => setStepIndex((value) => value + 1)}>Continue</button>}
        </div>
      </SectionCard>
    </StepShell>
  );
}

export default SecuredTransactionReviewIntake;
