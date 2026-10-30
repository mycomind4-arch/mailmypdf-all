import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Field,
  SectionCard,
  StatusPill,
  StepShell,
  TextArea,
  TextField,
} from "@mailmypdf/workflow-ui";
import {
  debtValidationTimingNote,
  draftDebtValidationLetter,
  validateDebtValidationIntake,
  type DebtValidationIntake,
} from "../domain";
import {
  changeLocalRecipient,
  confirmLocalRecipient,
  emptyDebtValidationIntake,
  replaceLocalNotice,
  revokeLocalRecipientConfirmation,
} from "../local-review";
import { debtValidationStepWorkflow } from "../step-workflow";

/**
 * Offline, browser-only draft review. This is intentionally NOT a server
 * approval, stored PDF preview, payment checkout, or mailing authorization.
 * A selected notice never leaves this page.
 */
export function DebtValidationStart() {
  const [intake, setIntake] = useState<DebtValidationIntake>(emptyDebtValidationIntake);
  const [stepIndex, setStepIndex] = useState(0);
  const [noticeFileName, setNoticeFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [letterDate, setLetterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const fileGeneration = useRef(0);
  const steps = debtValidationStepWorkflow.steps;
  const step = steps[stepIndex]!;
  const blockers = useMemo(() => validateDebtValidationIntake(intake), [intake]);
  const letter = useMemo(() => {
    if (blockers.length) return null;
    try {
      return draftDebtValidationLetter(intake, letterDate);
    } catch {
      return null;
    }
  }, [blockers, intake, letterDate]);

  function update(patch: Partial<DebtValidationIntake>) {
    setIntake((current) => revokeLocalRecipientConfirmation({ ...current, ...patch }));
    setConfirmError("");
  }

  function changeAddress(patch: { noticeResponseAddress?: string; collectorResponseAddress?: string }) {
    setIntake((current) => changeLocalRecipient(current, patch));
    setConfirmError("");
  }

  async function selectNotice(file: File | undefined) {
    const generation = ++fileGeneration.current;
    setFileError("");
    setNoticeFileName("");
    setIntake((current) => replaceLocalNotice(current, { documentId: "", sha256: "" }));
    if (!file) return;
    if (file.size === 0 || file.size > 12 * 1024 * 1024
      || !(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
      setFileError("Choose a nonempty PDF notice no larger than 12 MB.");
      return;
    }
    try {
      const bytes = await file.arrayBuffer();
      const hash = await crypto.subtle.digest("SHA-256", bytes);
      if (generation !== fileGeneration.current) return;
      const sha256 = Array.from(new Uint8Array(hash))
        .map((byte) => byte.toString(16).padStart(2, "0")).join("");
      setIntake((current) => replaceLocalNotice(current, {
        documentId: "local:" + sha256,
        sha256,
      }));
      setNoticeFileName(file.name);
    } catch {
      if (generation === fileGeneration.current) setFileError("The notice could not be read. Select it again.");
    }
  }

  function confirm() {
    try {
      setIntake(confirmLocalRecipient(intake));
      setConfirmError("");
    } catch {
      setConfirmError("Complete all required fields and verify that both collector addresses match the notice.");
    }
  }

  function saveText() {
    if (!letter) return;
    const url = URL.createObjectURL(new Blob([letter], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "debt-validation-draft.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <StepShell
      breadcrumb={[
        { label: "Dispute Mail", href: "/dispute-mail" },
        { label: "Debt Validation", href: "/dispute-mail/workflows/debt-validation" },
        { label: step.label },
      ]}
      title="Debt validation letter — draft review"
      subtitle="Work from the actual collector notice. This local preview does not submit a dispute or send physical mail."
      lastSavedLabel="Browser-only draft · not saved to an account"
      steps={steps.map(({ id, label }) => ({ id, label }))}
      currentStepId={step.id}
      completedStepIds={[]}
      onStepClick={(id) => setStepIndex(Math.max(0, steps.findIndex((item) => item.id === id)))}
      rail={
        <SectionCard title="Mailing readiness">
          <StatusPill tone="neutral" label="Draft-only" />
          <p className="wf-intake-note">
            The selected PDF stays in your browser. There is no authenticated matter,
            stored PDF packet, address verification service, approval, checkout or mailing on this page.
          </p>
          <p className="wf-intake-note">
            Do not assume a printed dispute date proves legal timeliness. Confirm applicable law and the actual notice.
          </p>
        </SectionCard>
      }
    >
      <div className="wf-card">
        <p className="wf-intake-progress">Step {stepIndex + 1} of {steps.length} · {step.label}</p>
        {step.id === "notice" && (
          <>
            <h2 className="wf-intake-heading">Controlling collection notice</h2>
            <p className="wf-intake-description">
              Select the actual PDF notice for a local SHA-256 fingerprint. Manually transcribe its
              postal response destination; this page does not extract or verify the address from the PDF.
            </p>
            <Field label="Collection notice PDF (local only)">
              <input type="file" accept="application/pdf,.pdf" onChange={(event) => {
                void selectNotice(event.target.files?.[0]);
              }} />
            </Field>
            {noticeFileName && <p className="wf-intake-note">Selected: {noticeFileName}</p>}
            {fileError && <p role="alert">{fileError}</p>}
            <Field label="Collector response mailing address shown on the notice">
              <TextArea value={intake.noticeResponseAddress} maxLength={500} rows={4}
                onChange={(event) => changeAddress({ noticeResponseAddress: event.target.value })} />
            </Field>
            <Field label="Collector mailing address you intend to use">
              <TextArea value={intake.collectorResponseAddress} maxLength={500} rows={4}
                onChange={(event) => changeAddress({ collectorResponseAddress: event.target.value })} />
            </Field>
            <Field label="Notice date (optional, only if printed)">
              <TextField type="date" value={intake.noticeDate ?? ""}
                onChange={(event) => update({ noticeDate: event.target.value || null })} />
            </Field>
            <Field label="Printed dispute deadline (optional; not a legal determination)">
              <TextField type="date" value={intake.noticeDisputeDeadline ?? ""}
                onChange={(event) => update({ noticeDisputeDeadline: event.target.value || null })} />
            </Field>
          </>
        )}
        {step.id === "dispute" && (
          <>
            <h2 className="wf-intake-heading">Your written dispute</h2>
            <Field label="Your full name">
              <TextField value={intake.consumerName} maxLength={200}
                onChange={(event) => update({ consumerName: event.target.value })} />
            </Field>
            <Field label="Your complete return mailing address">
              <TextArea value={intake.consumerMailingAddress} maxLength={500} rows={3}
                onChange={(event) => update({ consumerMailingAddress: event.target.value })} />
            </Field>
            <Field label="Debt collector's name">
              <TextField value={intake.collectorName} maxLength={200}
                onChange={(event) => update({ collectorName: event.target.value })} />
            </Field>
            <Field label="Account or notice reference">
              <TextField value={intake.accountReference} maxLength={100}
                onChange={(event) => update({ accountReference: event.target.value })} />
            </Field>
            <Field label="What you dispute and why">
              <TextArea value={intake.disputeExplanation} maxLength={3000} rows={6}
                onChange={(event) => update({ disputeExplanation: event.target.value })} />
            </Field>
            <label className="wf-checkbox-field">
              <input type="checkbox" checked={intake.requestOriginalCreditor}
                onChange={(event) => update({ requestOriginalCreditor: event.target.checked })} />
              <span>Also request the original creditor's name and mailing address, if different</span>
            </label>
          </>
        )}
        {step.id === "review" && (
          <>
            <h2 className="wf-intake-heading">Confirm destination and review the letter</h2>
            <p className="wf-intake-description">{debtValidationTimingNote(intake)}</p>
            <p className="wf-intake-note">
              Compare the destination against the actual controlling notice. Selecting the file
              and typing an address are not independent evidence of its accuracy.
            </p>
            <p className="wf-intake-note"><strong>Destination:</strong><br />
              {intake.collectorResponseAddress || "Not entered"}</p>
            <label className="wf-checkbox-field">
              <input type="checkbox" checked={intake.recipientConfirmed}
                onChange={(event) => {
                  if (event.target.checked) confirm();
                  else setIntake((current) => revokeLocalRecipientConfirmation(current));
                }} />
              <span>I personally checked this exact postal address against the controlling notice.</span>
            </label>
            {confirmError && <p role="alert">{confirmError}</p>}
            {blockers.length > 0 && (
              <SectionCard title="Before a draft can be shown">
                <ul className="wf-summary-list-items">
                  {blockers.map((blocker) => <li key={blocker.code}>{blocker.message}</li>)}
                </ul>
              </SectionCard>
            )}
            <Field label="Letter date">
              <TextField type="date" value={letterDate}
                onChange={(event) => setLetterDate(event.target.value)} />
            </Field>
            {letter && (
              <SectionCard title="Review-only letter draft">
                <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{letter}</pre>
                <button type="button" className="wf-btn wf-btn--outline" onClick={saveText}>
                  Save text draft
                </button>
                <p className="wf-intake-note">
                  Text only — not a PDF mailing packet. There is no approval, payment or provider submission.
                </p>
              </SectionCard>
            )}
          </>
        )}
        <div className="wf-intake-actions">
          {stepIndex > 0 && <button type="button" className="wf-btn wf-btn--outline"
            onClick={() => setStepIndex(stepIndex - 1)}>Previous</button>}
          {stepIndex < steps.length - 1 && <button type="button" className="wf-btn"
            onClick={() => setStepIndex(stepIndex + 1)}>Next</button>}
        </div>
      </div>
    </StepShell>
  );
}

export const Route = createFileRoute("/dispute-mail/workflows/debt-validation/start/")({
  component: DebtValidationStart,
});

export default DebtValidationStart;
