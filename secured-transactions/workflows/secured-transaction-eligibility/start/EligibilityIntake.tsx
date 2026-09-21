import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { ConfirmationPrompt, DraftFileActions, Field, RadioField, SectionCard, StatusPill, StepShell, TextArea, TextField } from "@mailmypdf/workflow-ui";
import {
  answerLabel, assessEligibilityDraft, createEligibilityDraft, eligibilitySummaryText,
  ELIGIBILITY_FIELDS, ELIGIBILITY_REVIEW_LABELS, ELIGIBILITY_STEPS, parseEligibilityDraft,
  type EligibilityAnswerId, type EligibilityDraft, type IntakeField,
} from "../rules/guided-intake";
import { SECURED_TRANSACTION_ELIGIBILITY_GATES, type SecuredTransactionEligibilityGateId } from "../rules/eligibility";

export function SecuredTransactionEligibilityIntake() {
  const [draft, setDraft] = useState(createEligibilityDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusNext = useRef(false);
  const step = ELIGIBILITY_STEPS[stepIndex];
  const review = useMemo(() => assessEligibilityDraft(draft), [draft]);
  const isReview = step.id === "review";
  const hasAnswers = Object.values(draft.answers).some(Boolean) || Object.values(draft.sources).some(Boolean);
  const completedStepIds = ELIGIBILITY_STEPS.filter((entry) => entry.fields.length && entry.fields.every((id) => draft.answers[id]?.trim())).map((entry) => entry.id);

  useEffect(() => {
    if (focusNext.current) { heading.current?.focus(); focusNext.current = false; }
  }, [stepIndex]);

  const navigation = useBlocker({
    shouldBlockFn: () => dirty,
    withResolver: true,
    enableBeforeUnload: dirty,
  });

  function goTo(index: number) {
    focusNext.current = true;
    setStepIndex(Math.max(0, Math.min(index, ELIGIBILITY_STEPS.length - 1)));
  }
  function answer(id: EligibilityAnswerId, value: string) {
    setDraft((previous) => ({ ...previous, answers: { ...previous.answers, [id]: value } }));
    setDirty(true);
  }
  function source(id: SecuredTransactionEligibilityGateId, value: string) {
    setDraft((previous) => ({ ...previous, sources: { ...previous.sources, [id]: value } }));
    setDirty(true);
  }
  function restore(restored: EligibilityDraft) {
    setDraft(restored);
    setDirty(false);
    goTo(0);
  }

  return (
    <div className="wf-guided-intake">
      <ConfirmationPrompt open={navigation.status === "blocked"} title="Keep your draft before leaving" description="Your answers are only on this page unless you kept a downloaded draft. They are not saved to your account. Stay here to keep working, or leave this page." cancelLabel="Stay and keep editing" confirmLabel="Leave this page" onCancel={() => navigation.reset?.()} onConfirm={() => navigation.proceed?.()} />
      <StepShell
        breadcrumb={[{ label: "Secured Transactions", href: "/dashboard/workflows/secured-transactions" }, { label: "Workflow 1 · Eligibility intake" }]}
        title="Let’s understand your transaction"
        subtitle="Workflow 1 of Secured Transactions · Turn your situation into a clear set of facts, records to gather, and questions for review."
        lastSavedLabel={dirty ? "Answers stay on this page · keep a downloaded draft" : "Draft stays on this page unless downloaded"}
        steps={ELIGIBILITY_STEPS.map(({ id, label }) => ({ id, label }))}
        currentStepId={step.id}
        completedStepIds={completedStepIds}
        onStepClick={(id) => goTo(ELIGIBILITY_STEPS.findIndex((entry) => entry.id === id))}
        rail={
          <>
            <SectionCard title="What this step does">
              <p className="wf-intake-note">Organizes your account of the transaction. You can answer in everyday language, choose “I don’t know,” or leave a detail blank.</p>
              <p className="wf-intake-note">Checks on the progress bar mean questions answered—not facts verified.</p>
            </SectionCard>
            <SectionCard title="Keep nearby, if available">
              <ul className="wf-summary-list-items">
                <li>Loan or other obligation agreement</li>
                <li>Payment, delivery, or credit records</li>
                <li>Property description and ownership records</li>
                <li>Security agreement and signing permissions</li>
              </ul>
              <p className="wf-intake-note">You can list records here. File upload and document review are not connected in this intake.</p>
            </SectionCard>
            <SectionCard title="Review-only boundary">
              <StatusPill tone="neutral" label="No filing or payment" />
              <p className="wf-intake-note">This does not establish attachment, enforceability, perfection, priority, or filing permission. Information you enter remains unverified.</p>
            </SectionCard>
          </>
        }
      >
        <div className="wf-card">
          <div className="wf-intake-progress">Section {stepIndex + 1} of {ELIGIBILITY_STEPS.length} · {step.label}</div>
          <h2 ref={heading} tabIndex={-1} className="wf-intake-heading">{step.title}</h2>
          <p className="wf-intake-description">{step.description}</p>
          {!isReview && (
            <div className="wf-intake-fields">
              {step.fields.map((id) => {
                const field: IntakeField = ELIGIBILITY_FIELDS[id];
                if (field.options) return <RadioField key={id} label={field.label} hint={field.hint} options={field.options} value={draft.answers[id] ?? ""} onChange={(value) => answer(id, value)} />;
                const Control = field.multiline ? TextArea : TextField;
                return <Field key={id} label={field.label} hint={field.hint}><Control value={draft.answers[id] ?? ""} maxLength={2500} placeholder={field.placeholder} onChange={(event) => answer(id, event.target.value)} /></Field>;
              })}
              {step.id === "records" && (
                <details className="wf-intake-records">
                  <summary>List records to gather or review (optional)</summary>
                  <p className="wf-intake-note">Enter a document name, date, or page reference. These are your notes—not uploaded files or independently verified evidence. Do not include passwords or sensitive account numbers.</p>
                  <div className="wf-intake-source-fields">
                    {SECURED_TRANSACTION_ELIGIBILITY_GATES.map((id) => <Field key={id} label={`Record for: ${ELIGIBILITY_REVIEW_LABELS[id]}`}><TextField value={draft.sources[id] ?? ""} maxLength={2500} placeholder="Document name, date, and page, if known" onChange={(event) => source(id, event.target.value)} /></Field>)}
                  </div>
                </details>
              )}
              {step.id === "situation" && <div className="wf-intake-callout">You do not have to prove your case to fill this out. Unknowns and disagreements will become a checklist of what needs attention.</div>}
            </div>
          )}
          {isReview && (
            <>
              <div className="wf-intake-callout">
                <strong>{!hasAnswers ? "No details entered yet." : review.items.some((item) => item.status === "disputed") ? "Your account includes a disagreement that needs review." : "Your intake is organized. Supporting evidence still needs review."}</strong>
                <p className="wf-intake-note">{review.items.filter((item) => item.status === "reported").length} of 9 topics have reported details; 0 are independently verified. Missing answers do not stop you from saving this draft.</p>
              </div>
              {ELIGIBILITY_STEPS.filter((entry) => entry.fields.length).map((entry, index) => (
                <section className="wf-intake-review-section" key={entry.id}>
                  <div className="wf-intake-review-heading"><h3>{entry.title}</h3><button type="button" className="wf-btn wf-btn--outline" onClick={() => goTo(index)}>Edit {entry.label.toLowerCase()}</button></div>
                  <dl className="wf-intake-summary">{entry.fields.map((id) => <div key={id}><dt>{ELIGIBILITY_FIELDS[id].label}</dt><dd>{answerLabel(id, draft.answers[id])}</dd></div>)}</dl>
                </section>
              ))}
            </>
          )}
          <div className="wf-intake-navigation">
            <button type="button" className="wf-btn wf-btn--outline" disabled={stepIndex === 0} onClick={() => goTo(stepIndex - 1)}>Back</button>
            {!isReview && <button type="button" className="wf-btn wf-btn--primary" onClick={() => goTo(stepIndex + 1)}>{stepIndex === ELIGIBILITY_STEPS.length - 2 ? "Review my intake" : `Continue to ${ELIGIBILITY_STEPS[stepIndex + 1].label.toLowerCase()}`}</button>}
          </div>
          {!isReview && <p className="wf-intake-note">All details can be edited later. You can continue with unanswered questions.</p>}
        </div>
        {isReview && (
          <SectionCard title="What needs attention next" description="Reported details are not verified evidence. Each topic stays open until its sources and applicable rules are reviewed.">
            {review.items.map((item) => (
              <section className="wf-intake-review-item" key={item.id}>
                <h3>{item.label}</h3>
                <StatusPill tone={item.status === "disputed" ? "danger" : item.status === "missing" ? "warning" : "neutral"} label={item.status === "disputed" ? "Disagreement reported" : item.status === "missing" ? "More information needed" : "Reported · not verified"} />
                <p className="wf-intake-note">{item.next}</p>
                <p className="wf-intake-note">Record reference: {item.source || "None listed yet"}</p>
              </section>
            ))}
            <div className="wf-intake-callout">Next in the sequence: workflow 2, names and signing authority. That screen has not yet been rebuilt, and this draft is not automatically passed into it.</div>
          </SectionCard>
        )}
        <SectionCard title="Keep your progress">
          <DraftFileActions draft={draft} filename="secured-transactions-workflow-1-draft" parse={parseEligibilityDraft} onRestore={restore} hasUnsavedChanges={dirty} summaryText={isReview ? eligibilitySummaryText(draft) : undefined} />
        </SectionCard>
      </StepShell>
    </div>
  );
}

export default SecuredTransactionEligibilityIntake;
