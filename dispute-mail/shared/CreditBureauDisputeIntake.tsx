import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import {
  ConfirmationPrompt,
  DraftFileActions,
  Field,
  RadioField,
  SectionCard,
  StatusPill,
  StepShell,
  TextArea,
  TextField,
} from "@mailmypdf/workflow-ui";
import type { StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import {
  BUREAU_CONFIGS,
  DISPUTE_CATEGORY_OPTIONS,
  analyzeDisputedItems,
  buildCreditDisputeDraftParams,
  emptyDisputedItem,
  generateCreditDisputeDraft,
  getCreditDisputeReadiness,
  type BureauConfig,
  type CreditDisputeIntake,
  type DisputedItemDraft,
} from "./credit-dispute";

/**
 * Shared execution UI for the three credit-bureau dispute workflows
 * (equifax-dispute, experian-dispute, transunion-dispute). Ported from the
 * legacy `apps/verticals/notice-respond` matter engine + step components
 * (Intake/Documents/Analyze/Draft/Review/Mail) and adapted into a single
 * self-contained page in the shape established by
 * `secured-transactions/workflows/secured-transaction-eligibility/start/EligibilityIntake.tsx`
 * — a local-state, multi-section flow built on @mailmypdf/step-workflow's
 * step UI primitives (StepShell/Stepper/Field/DraftFileActions), driven by
 * the workflow's own ported `StepWorkflowDefinition` (step ids/labels,
 * `requiresApprovalBeforeStep`), rather than a bespoke one-off component.
 *
 * Like the eligibility intake, this is not yet connected to account-backed
 * persistence, document upload/verification, payment, or mailing — those
 * remain server-side integrations to wire up next. Progress is kept only on
 * this page unless the user downloads/reopens a JSON draft.
 */
export interface CreditBureauDisputeIntakeProps {
  bureauId: BureauConfig["id"];
  workflow: StepWorkflowDefinition;
  breadcrumbLabel: string;
  backHref: string;
}

type Draft = CreditDisputeIntake & { documentCategories: string[] };

function createDraft(): Draft {
  return {
    consumerName: "",
    consumerAddress: "",
    reportDate: "",
    reportNumber: "",
    disputedBefore: false,
    disputedItems: [emptyDisputedItem()],
    additionalContext: "",
    requestedOutcome: "",
    documentCategories: [],
  };
}

function parseDraft(text: string): Draft {
  const parsed = JSON.parse(text) as Partial<Draft>;
  return { ...createDraft(), ...parsed };
}

export function CreditBureauDisputeIntake({ bureauId, workflow, breadcrumbLabel, backHref }: CreditBureauDisputeIntakeProps) {
  const config = BUREAU_CONFIGS[bureauId];
  const [draft, setDraft] = useState<Draft>(createDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusNext = useRef(false);
  const step = workflow.steps[stepIndex];

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
    setStepIndex(Math.max(0, Math.min(index, workflow.steps.length - 1)));
  }

  function update(patch: Partial<Draft>) {
    setDraft((previous) => ({ ...previous, ...patch }));
    setDirty(true);
  }

  function updateItem(id: string, patch: Partial<DisputedItemDraft>) {
    update({ disputedItems: (draft.disputedItems ?? []).map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  }

  function addItem() {
    update({ disputedItems: [...(draft.disputedItems ?? []), emptyDisputedItem()] });
  }

  function removeItem(id: string) {
    update({ disputedItems: (draft.disputedItems ?? []).filter((item) => item.id !== id) });
  }

  function toggleDocumentCategory(category: string) {
    const current = draft.documentCategories ?? [];
    update({
      documentCategories: current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category],
    });
  }

  function restore(restored: Draft) {
    setDraft(restored);
    setDirty(false);
    goTo(0);
  }

  const readiness = useMemo(() => getCreditDisputeReadiness(draft), [draft]);
  const analysis = useMemo(
    () => analyzeDisputedItems(draft.disputedItems ?? [], draft.documentCategories ?? []),
    [draft.disputedItems, draft.documentCategories],
  );
  const draftParams = useMemo(() => buildCreditDisputeDraftParams(bureauId, draft), [bureauId, draft]);
  const letterText = useMemo(() => generateCreditDisputeDraft(draftParams), [draftParams]);
  const completedStepIds = workflow.steps
    .filter((_, index) => index < stepIndex)
    .map((entry) => entry.id);
  const requiresApproval = workflow.requiresApprovalBeforeStep === step.id;
  const [approved, setApproved] = useState(false);

  const documentOptions = ["Credit report", "Proof of identity", "Statement / payment record", "Identity theft or police report", "Prior correspondence"];

  return (
    <div className="wf-guided-intake">
      <ConfirmationPrompt
        open={navigation.status === "blocked"}
        title="Keep your draft before leaving"
        description="Your answers are only on this page unless you kept a downloaded draft. They are not saved to your account. Stay here to keep working, or leave this page."
        cancelLabel="Stay and keep editing"
        confirmLabel="Leave this page"
        onCancel={() => navigation.reset?.()}
        onConfirm={() => navigation.proceed?.()}
      />
      <StepShell
        breadcrumb={[{ label: "Dispute Mail", href: "/dispute-mail" }, { label: breadcrumbLabel, href: backHref }, { label: step.label }]}
        title={`${config.displayName} Dispute`}
        subtitle="Organize each disputed item, your evidence, and a specific FCRA dispute letter — mailed with proof of delivery."
        lastSavedLabel={dirty ? "Answers stay on this page · keep a downloaded draft" : "Draft stays on this page unless downloaded"}
        steps={workflow.steps.map(({ id, label }) => ({ id, label }))}
        currentStepId={step.id}
        completedStepIds={completedStepIds}
        onStepClick={(id) => goTo(workflow.steps.findIndex((entry) => entry.id === id))}
        rail={
          <>
            <SectionCard title="Readiness checklist">
              <ul className="wf-summary-list-items">
                {readiness.map((item) => (
                  <li key={item.id}>
                    <StatusPill tone={item.done ? "success" : "neutral"} label={item.done ? "Done" : "Needed"} /> {item.label}
                  </li>
                ))}
              </ul>
            </SectionCard>
            <SectionCard title={`Where this goes`}>
              <p className="wf-intake-note">{config.mailingAddress.org}</p>
              <p className="wf-intake-note">{config.mailingAddress.line1}{config.mailingAddress.line2 ? `, ${config.mailingAddress.line2}` : ""}</p>
              <p className="wf-intake-note">{config.mailingAddress.city}, {config.mailingAddress.state} {config.mailingAddress.zip}</p>
              <p className="wf-intake-note">Phone: {config.phone}</p>
            </SectionCard>
            <SectionCard title="Review-only boundary">
              <StatusPill tone="neutral" label="No filing, payment, or mailing yet" />
              <p className="wf-intake-note">This organizes your dispute and drafts a letter. Mailing, payment, and account-backed matter persistence are not connected on this page.</p>
            </SectionCard>
          </>
        }
      >
        <div className="wf-card">
          <div className="wf-intake-progress">Step {stepIndex + 1} of {workflow.steps.length} · {step.label}</div>

          {step.id === "intake" && (
            <>
              <h2 ref={heading} tabIndex={-1} className="wf-intake-heading">Your information and disputed items</h2>
              <p className="wf-intake-description">Enter your name and address, then add every account or item on your {config.displayName} report you are disputing. Each item gets its own FCRA dispute category.</p>
              <div className="wf-intake-fields">
                <Field label="Your full name"><TextField value={draft.consumerName ?? ""} maxLength={200} onChange={(e) => update({ consumerName: e.target.value })} /></Field>
                <Field label="Your mailing address"><TextField value={draft.consumerAddress ?? ""} maxLength={300} onChange={(e) => update({ consumerAddress: e.target.value })} /></Field>
                <Field label="Report date (if known)"><TextField value={draft.reportDate ?? ""} maxLength={40} onChange={(e) => update({ reportDate: e.target.value })} /></Field>
                <Field label="Report number (if known)"><TextField value={draft.reportNumber ?? ""} maxLength={60} onChange={(e) => update({ reportNumber: e.target.value })} /></Field>
              </div>
              <div className="wf-intake-callout">Disputed items</div>
              {(draft.disputedItems ?? []).map((item, index) => (
                <section className="wf-intake-review-section" key={item.id}>
                  <div className="wf-intake-review-heading">
                    <h3>Item {index + 1}</h3>
                    {(draft.disputedItems ?? []).length > 1 && (
                      <button type="button" className="wf-btn wf-btn--outline" onClick={() => removeItem(item.id)}>Remove</button>
                    )}
                  </div>
                  <div className="wf-intake-fields">
                    <Field label="Creditor / account name"><TextField value={item.creditorName} maxLength={200} onChange={(e) => updateItem(item.id, { creditorName: e.target.value })} /></Field>
                    <Field label="Account number"><TextField value={item.accountNumber} maxLength={60} onChange={(e) => updateItem(item.id, { accountNumber: e.target.value })} /></Field>
                    <RadioField
                      label="What's wrong with this item?"
                      options={DISPUTE_CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                      value={item.category}
                      onChange={(value) => updateItem(item.id, { category: value as DisputedItemDraft["category"] })}
                    />
                    <Field label="Explain what's wrong" hint={DISPUTE_CATEGORY_OPTIONS.find((o) => o.value === item.category)?.evidenceHint}>
                      <TextArea value={item.description} maxLength={2000} onChange={(e) => updateItem(item.id, { description: e.target.value })} />
                    </Field>
                    <Field label="Correct information (if known)"><TextArea value={item.correctInformation} maxLength={1000} onChange={(e) => updateItem(item.id, { correctInformation: e.target.value })} /></Field>
                  </div>
                </section>
              ))}
              <button type="button" className="wf-btn wf-btn--outline" onClick={addItem}>Add another disputed item</button>
              <Field label="Additional context (optional)"><TextArea value={draft.additionalContext ?? ""} maxLength={4000} onChange={(e) => update({ additionalContext: e.target.value })} /></Field>
              <Field label="What do you want the bureau to do? (optional)"><TextArea value={draft.requestedOutcome ?? ""} maxLength={2000} onChange={(e) => update({ requestedOutcome: e.target.value })} /></Field>
            </>
          )}

          {step.id === "documents" && (
            <>
              <h2 ref={heading} tabIndex={-1} className="wf-intake-heading">Documents</h2>
              <p className="wf-intake-description">Note which supporting documents you have. File upload is not connected on this page yet — these are your own notes about what you'll enclose.</p>
              <div className="wf-intake-fields">
                {documentOptions.map((category) => (
                  <label key={category} className="wf-checkbox-field">
                    <input type="checkbox" checked={(draft.documentCategories ?? []).includes(category)} onChange={() => toggleDocumentCategory(category)} />
                    <span>{category}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {step.id === "analyze" && (
            <>
              <h2 ref={heading} tabIndex={-1} className="wf-intake-heading">Analyze</h2>
              <p className="wf-intake-description">Each disputed item is checked against what its FCRA category actually needs to hold up in a {config.displayName} reinvestigation.</p>
              {analysis.map((entry) => (
                <section className="wf-intake-review-section" key={entry.item.id}>
                  <div className="wf-intake-review-heading">
                    <h3>{entry.item.creditorName || "Untitled item"}</h3>
                    <StatusPill
                      tone={entry.strength === "strong" ? "success" : entry.strength === "needs_more" ? "warning" : "neutral"}
                      label={entry.strength === "strong" ? "Strong" : entry.strength === "needs_more" ? "Needs more evidence" : "Incomplete"}
                    />
                  </div>
                  <p className="wf-intake-note">{entry.categoryLabel}</p>
                  {entry.gap && <p className="wf-intake-note">{entry.gap}</p>}
                </section>
              ))}
            </>
          )}

          {step.id === "draft" && (
            <>
              <h2 ref={heading} tabIndex={-1} className="wf-intake-heading">Draft letter</h2>
              <p className="wf-intake-description">Generated from your intake, referencing FCRA Section 611 and the exact items above.</p>
              <pre className="wf-intake-note" style={{ whiteSpace: "pre-wrap" }}>{letterText}</pre>
            </>
          )}

          {step.id === "review" && (
            <>
              <h2 ref={heading} tabIndex={-1} className="wf-intake-heading">Review</h2>
              <p className="wf-intake-description">Confirm the letter is accurate before mailing. Nothing is sent until you approve.</p>
              <label className="wf-checkbox-field">
                <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
                <span>I reviewed the exact letter above and it is accurate.</span>
              </label>
            </>
          )}

          {step.id === "mail" && (
            <>
              <h2 ref={heading} tabIndex={-1} className="wf-intake-heading">Mail</h2>
              {requiresApproval && !approved ? (
                <p className="wf-intake-note">Approval is required on the Review step before mailing can proceed.</p>
              ) : (
                <p className="wf-intake-note">Mailing, payment, and proof-of-delivery tracking are not connected on this page yet.</p>
              )}
            </>
          )}

          <div className="wf-intake-navigation">
            <button type="button" className="wf-btn wf-btn--outline" disabled={stepIndex === 0} onClick={() => goTo(stepIndex - 1)}>Back</button>
            {stepIndex < workflow.steps.length - 1 && (
              <button type="button" className="wf-btn wf-btn--primary" onClick={() => goTo(stepIndex + 1)}>
                Continue to {workflow.steps[stepIndex + 1].label.toLowerCase()}
              </button>
            )}
          </div>
        </div>

        <SectionCard title="Keep your progress">
          <DraftFileActions
            draft={draft}
            filename={`${workflow.id}-draft`}
            parse={parseDraft}
            onRestore={restore}
            hasUnsavedChanges={dirty}
            summaryText={letterText}
          />
        </SectionCard>
      </StepShell>
    </div>
  );
}

export default CreditBureauDisputeIntake;
