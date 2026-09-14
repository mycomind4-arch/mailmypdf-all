import { useState } from "react";
import { SectionCard, Field, TextArea, TextField, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import {
  KNOWN_NOTICE_OPTIONS,
  KNOWN_NOTICE_OPTIONS_BY_VALUE,
  suggestDedicatedWorkflow,
  suggestNoticeTypeOption,
  type TaxNoticeIntake,
} from "@/domain/step-workflows/tax-notice";

/**
 * The step that makes this a real router, not a one-size-fits-all template:
 * pick (or let pasted notice text suggest) which of ten real IRS/state
 * notice types this is, and — when it matches CP2000, CP14, CP504, or
 * CP523 — recommend the dedicated, more thorough workflow this app already
 * has for that exact notice, before continuing generically.
 */
export function IdentifyStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const data = (matter.steps.identify?.data ?? {}) as TaxNoticeIntake;
  const [pastedText, setPastedText] = useState(data.pastedNoticeText ?? "");
  const [selected, setSelected] = useState(data.noticeTypeOption ?? "");
  const [noticeNumber, setNoticeNumber] = useState(data.noticeNumber ?? "");
  const [noticeDate, setNoticeDate] = useState(data.noticeDate ?? "");
  const [taxYear, setTaxYear] = useState(data.taxYear ?? "");
  const [amountAtIssue, setAmountAtIssue] = useState(data.amountAtIssue ?? "");
  const [responseDeadline, setResponseDeadline] = useState(data.responseDeadline ?? "");

  const combinedTextForDetection = [pastedText, noticeNumber].filter(Boolean).join(" ");
  const dedicatedSuggestion = suggestDedicatedWorkflow(combinedTextForDetection);
  const autoSuggested = !selected ? suggestNoticeTypeOption(combinedTextForDetection) : null;
  const effectiveSelection = selected || autoSuggested || "";
  const selectedOption = effectiveSelection ? KNOWN_NOTICE_OPTIONS_BY_VALUE[effectiveSelection] : undefined;

  async function handleContinue() {
    const option = KNOWN_NOTICE_OPTIONS_BY_VALUE[effectiveSelection];
    await onUpdateData({
      pastedNoticeText: pastedText,
      noticeTypeOption: effectiveSelection,
      noticeCategory: option?.category,
      noticeNumber,
      noticeDate,
      taxYear,
      amountAtIssue,
      responseDeadline,
    });
    await onComplete();
  }

  const requiredFilled = Boolean(effectiveSelection);

  return (
    <>
      <SectionCard
        title="What does your notice say?"
        description="Paste the text of your notice (or just its notice number, like “CP2000”) and we'll try to match it below — or skip this and pick the closest match yourself. Nothing you paste here is shared outside this matter."
      >
        <Field label="Notice text or number (optional)" hint="Paste as much or as little as you have — even just the notice number helps.">
          <TextArea rows={3} value={pastedText} placeholder="e.g. Internal Revenue Service, CP2000, ..." onChange={(e) => setPastedText(e.target.value)} />
        </Field>
        {dedicatedSuggestion && (
          <div className="wf-card" style={{ background: "var(--wf-color-info-bg, #eef4ff)", marginTop: "1rem" }}>
            <div style={{ fontWeight: 600 }}>This looks like a {dedicatedSuggestion.label.replace(" workflow", "")}</div>
            <p style={{ margin: "0.4rem 0 0.75rem", fontSize: "0.85rem", color: "var(--wf-color-stone)" }}>
              Notice Respond has a dedicated workflow built specifically for this notice, with deeper analysis of your exact situation. You can still continue here if you'd rather, but we recommend the specialized tool.
            </p>
            <a href={dedicatedSuggestion.path} className="wf-btn wf-btn--primary" style={{ display: "inline-flex" }}>
              Go to the {dedicatedSuggestion.label} →
            </a>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Select the closest match"
        description="This determines the deadline and rights information we show you next. If you're not sure, pick “I'm not sure” — you can change this later."
        headerAside={<span className="wf-pill wf-pill--warning">Required</span>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {KNOWN_NOTICE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="wf-card"
              style={{
                display: "flex",
                gap: "0.6rem",
                alignItems: "flex-start",
                cursor: "pointer",
                border: effectiveSelection === option.value ? "1.5px solid var(--wf-color-navy, #1e293b)" : undefined,
              }}
            >
              <input type="radio" name="noticeTypeOption" checked={effectiveSelection === option.value} onChange={() => setSelected(option.value)} style={{ marginTop: "0.2rem" }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{option.label}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--wf-color-stone-light)" }}>{option.agencyHint}</div>
              </div>
            </label>
          ))}
        </div>
      </SectionCard>

      {selectedOption && (
        <SectionCard title="What this means for you" headerAside={<span className="wf-pill wf-pill--info">{selectedOption.agencyHint}</span>}>
          <div className="wf-card-eyebrow">Deadline</div>
          <p style={{ marginTop: "0.4rem", fontSize: "0.85rem", color: "var(--wf-color-stone)" }}>{selectedOption.deadlineGuidance}</p>
          <div className="wf-card-eyebrow" style={{ marginTop: "1rem" }}>Your rights</div>
          <ul style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {selectedOption.rightsGuidance.map((right) => (
              <li key={right} style={{ fontSize: "0.82rem", color: "var(--wf-color-stone)" }}>{right}</li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard
        title="Notice details"
        description="Copy these exactly as they appear on your notice — they're used to confirm the correct deadline and to reference your notice in the response."
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={!requiredFilled} onClick={handleContinue}>
            Continue Identify →
          </button>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label="Notice / reference number">
            <TextField value={noticeNumber} placeholder="e.g. CP2000" onChange={(e) => setNoticeNumber(e.target.value)} />
          </Field>
          <Field label="Notice date">
            <TextField type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} />
          </Field>
          <Field label="Tax year">
            <TextField value={taxYear} placeholder="e.g. 2024" onChange={(e) => setTaxYear(e.target.value)} />
          </Field>
          <Field label="Amount at issue (if any)">
            <TextField value={amountAtIssue} placeholder="e.g. $1,240.00" onChange={(e) => setAmountAtIssue(e.target.value)} />
          </Field>
          <Field label="Response deadline" hint="Strongly recommended: the exact date printed on your notice — do not guess. Leave blank only if your notice truly doesn't show one.">
            <TextField type="date" value={responseDeadline} onChange={(e) => setResponseDeadline(e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Match your notice type" }, { label: "Enter the notice details" }, { label: "Continue to Intake" }]}
        continueLabel="Continue to Intake"
        continueDisabled={!requiredFilled}
        onContinue={handleContinue}
      />
    </>
  );
}
