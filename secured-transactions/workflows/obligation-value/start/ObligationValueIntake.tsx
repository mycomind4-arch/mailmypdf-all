import { useMemo, useState } from "react";
import {
  FindingsPanel,
  ReadinessChecklist,
  StatusPill,
  StepShell,
  type StatusPillTone,
  type WorkflowFinding,
} from "@mailmypdf/workflow-ui";
import type { ValueEvidenceKind } from "@mailmypdf/secured-transactions";
import { assessObligationValue, type ObligationValueInput, type ObligationValueSourceType } from "../rules/assessment";

type FormState = Omit<ObligationValueInput, "principalAmount" | "sourceLabel"> & { principalAmount: string; sourceLabel: string };

const INITIAL_FORM: FormState = {
  obligationId: "obligation-1",
  creditor: "",
  obligor: "",
  obligationType: "",
  principalAmount: "",
  currency: "USD",
  valueKind: undefined,
  valueDescription: "",
  sourceId: "",
  sourceType: "executed-contract",
  sourceLabel: "",
  valueEffect: "supports",
};

const VALUE_OPTIONS: readonly { value: ValueEvidenceKind; label: string }[] = [
  { value: "money-advanced", label: "Money was advanced or paid" },
  { value: "goods-delivered", label: "Goods were delivered" },
  { value: "services-rendered", label: "Services were provided" },
  { value: "existing-obligation", label: "An existing obligation was carried forward" },
  { value: "commitment", label: "Someone made a commitment to provide value" },
  { value: "other", label: "Something else" },
];

const SOURCE_OPTIONS: readonly { value: ObligationValueSourceType; label: string }[] = [
  { value: "executed-contract", label: "Signed agreement or contract" },
  { value: "bank-record", label: "Bank or payment record" },
  { value: "invoice", label: "Invoice" },
  { value: "court-order", label: "Court order" },
  { value: "agency-notice", label: "Agency notice" },
  { value: "other", label: "Other record" },
];

function statusTone(status: "ready-for-further-analysis" | "human-review-required" | "blocked"): StatusPillTone {
  return status === "ready-for-further-analysis" ? "success" : status === "human-review-required" ? "warning" : "danger";
}

function statusLabel(status: "ready-for-further-analysis" | "human-review-required" | "blocked") {
  return status === "ready-for-further-analysis" ? "Ready for further analysis" : status === "human-review-required" ? "Human review required" : "More information needed";
}

export function ObligationValueIntake() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const result = useMemo(() => assessObligationValue({
    ...form,
    principalAmount: form.principalAmount.trim() ? Number(form.principalAmount) : undefined,
  }), [form]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  const readinessItems = [
    { id: "obligation", label: "Creditor, obligor, and obligation are identified", done: Boolean(form.creditor.trim() && form.obligor.trim() && form.obligationType.trim()) },
    { id: "value", label: "The claimed value basis is described", done: Boolean(form.valueKind) },
    { id: "source", label: "A supporting record is identified", done: Boolean(form.sourceId.trim()) },
  ];

  const findings: WorkflowFinding[] = [
    {
      id: "obligation",
      title: "Obligation terms",
      category: "Obligation resolution",
      description: result.obligation.reasons.join(" "),
      sourceLabel: form.sourceLabel.trim() || form.sourceId.trim() || undefined,
      detail: <StatusPill tone={result.obligation.missingRequiredFields.length ? "warning" : "success"} label={result.obligation.disposition} />,
    },
    {
      id: "value",
      title: "Value evidence",
      category: "Evidence sufficiency",
      description: result.valueEvidence.reasons.join(" "),
      sourceLabel: result.valueEvidence.sourceRefs.join(", ") || undefined,
      detail: <StatusPill tone={result.valueEvidence.status === "supported" ? "success" : result.valueEvidence.requiresHumanReview ? "warning" : "neutral"} label={result.valueEvidence.status} />,
    },
    {
      id: "legal-boundary",
      title: "Legal boundary",
      category: "Important limit",
      description: "This workflow organizes source-backed facts. It does not independently decide whether a jurisdiction-specific legal definition of value is satisfied.",
      detail: <StatusPill tone="info" label="Review required" />,
    },
  ];

  return (
    <StepShell
      breadcrumb={[{ label: "Secured Transactions", href: "/secured-transactions" }, { label: "Obligation & Value" }]}
      title="Obligation & Value"
      subtitle="Describe the obligation and the value record in ordinary language. The shared engine keeps unsupported or contradictory evidence visible."
      steps={[{ id: "intake", label: "Obligation and value intake" }]}
      currentStepId="intake"
      completedStepIds={[]}
      rail={
        <>
          <ReadinessChecklist title="What we need" items={readinessItems} />
          <div className="wf-card">
            <div className="wf-card-eyebrow">Current result</div>
            <StatusPill tone={statusTone(result.status)} label={statusLabel(result.status)} />
            <p className="wf-finding-description">
              {result.status === "ready-for-further-analysis" && "The supplied records support an initial evidence assessment. Human review is still required before relying on it in later work."}
              {result.status === "human-review-required" && "The records conflict or need interpretation. Keep the issue visible for human review."}
              {result.status === "blocked" && "Add the missing obligation, value, or source information. The workflow will not fill it in."}
            </p>
          </div>
        </>
      }
    >
      <div className="wf-card">
        <div className="wf-card-eyebrow">Start with the obligation</div>
        <h2 className="wf-finding-title">What was promised, owed, or exchanged?</h2>
        <p className="wf-finding-description">Use names or IDs from the supporting record. You do not need to know the legal classification yet.</p>
        <div className="wf-form-grid">
          <label className="wf-form-label">
            Who is supposed to receive payment or performance?
            <input className="wf-form-control" value={form.creditor} onChange={(event) => update("creditor", event.target.value)} placeholder="Creditor or secured party" />
          </label>
          <label className="wf-form-label">
            Who owes or promises performance?
            <input className="wf-form-control" value={form.obligor} onChange={(event) => update("obligor", event.target.value)} placeholder="Obligor or debtor" />
          </label>
          <label className="wf-form-label">
            What is the obligation called in the record?
            <input className="wf-form-control" value={form.obligationType} onChange={(event) => update("obligationType", event.target.value)} placeholder="Example: loan repayment" />
          </label>
          <label className="wf-form-label">
            Principal amount (optional)
            <input className="wf-form-control" inputMode="decimal" value={form.principalAmount} onChange={(event) => update("principalAmount", event.target.value)} placeholder="Example: 5000" />
          </label>
          <label className="wf-form-label">
            Currency
            <input className="wf-form-control" value={form.currency} onChange={(event) => update("currency", event.target.value)} placeholder="USD" />
          </label>
        </div>
      </div>

      <div className="wf-card">
        <div className="wf-card-eyebrow">Value record</div>
        <h2 className="wf-finding-title">What supports the value side of the transaction?</h2>
        <div className="wf-form-grid">
          <label className="wf-form-label">
            What happened?
            <select className="wf-form-control" value={form.valueKind ?? ""} onChange={(event) => update("valueKind", (event.target.value || undefined) as ValueEvidenceKind | undefined)}>
              <option value="">I’m not sure yet</option>
              {VALUE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="wf-form-label">
            Does the record support or contradict that claim?
            <select className="wf-form-control" value={form.valueEffect} onChange={(event) => update("valueEffect", event.target.value as FormState["valueEffect"])}>
              <option value="supports">Supports it</option>
              <option value="contradicts">Contradicts it</option>
            </select>
          </label>
          <label className="wf-form-label">
            Short description (optional)
            <input className="wf-form-control" value={form.valueDescription} onChange={(event) => update("valueDescription", event.target.value)} placeholder="Example: funds were transferred at signing" />
          </label>
        </div>
      </div>

      <div className="wf-card">
        <div className="wf-card-eyebrow">Evidence</div>
        <h2 className="wf-finding-title">Which record should we check?</h2>
        <div className="wf-form-grid">
          <label className="wf-form-label">
            Record name or reference
            <input className="wf-form-control" value={form.sourceId} onChange={(event) => update("sourceId", event.target.value)} placeholder="Example: signed agreement dated March 4" />
          </label>
          <label className="wf-form-label">
            Record type
            <select className="wf-form-control" value={form.sourceType} onChange={(event) => update("sourceType", event.target.value as ObligationValueSourceType)}>
              {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="wf-form-label">
            Note about the record (optional)
            <input className="wf-form-control" value={form.sourceLabel} onChange={(event) => update("sourceLabel", event.target.value)} placeholder="Example: signed by both parties" />
          </label>
        </div>
      </div>

      <FindingsPanel title="Shared-engine findings" description="These findings organize evidence and gaps. They do not independently decide enforceability or the legal definition of value." findings={findings} />
    </StepShell>
  );
}

export default ObligationValueIntake;
