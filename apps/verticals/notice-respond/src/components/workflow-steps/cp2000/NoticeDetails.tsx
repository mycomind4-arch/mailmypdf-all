import { useState } from "react";
import { SectionCard, Field, TextField, TextArea, StatusPill, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import { getCombinedCP2000Data, buildCP2000Extraction, type CP2000Data } from "@/domain/step-workflows/cp2000";
import { analyzeCP2000Discrepancies } from "@/domain/cp2000-discrepancy";

const SEVERITY_TONE: Record<string, "success" | "warning" | "info"> = { high: "warning", medium: "info", low: "success" };

export function NoticeDetailsStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const combined = getCombinedCP2000Data(matter);
  const [form, setForm] = useState<CP2000Data>((matter.steps["notice-details"]?.data ?? {}) as CP2000Data);
  const merged = { ...combined, ...form };

  function set<K extends keyof CP2000Data>(key: K, value: CP2000Data[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    await onUpdateData(form);
  }
  async function handleContinue() {
    await onUpdateData(form);
    await onComplete();
  }

  const { discrepancies } = analyzeCP2000Discrepancies({ extraction: buildCP2000Extraction(merged) });

  const requiredReviewed = Boolean(merged.noticeNumber && merged.irsResponseAddress);

  return (
    <>
      <SectionCard
        title="Notice details"
        description="Review the notice details carefully so your response is built on the correct notice information."
        headerAside={<span className="wf-pill wf-pill--warning">Required review</span>}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={!requiredReviewed} onClick={handleContinue}>
            Continue to Documents →
          </button>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label="Notice number" required>
            <TextField value={merged.noticeNumber ?? ""} placeholder="CP2000-2024-12345-A" onChange={(e) => set("noticeNumber", e.target.value)} />
          </Field>
          <Field label="SSN (last 4 shown)">
            <TextField value={merged.ssnLast4 ?? ""} maxLength={4} placeholder="4821" onChange={(e) => set("ssnLast4", e.target.value)} />
          </Field>
          <Field label="Reported by IRS source(s)">
            <TextField value={merged.reportedBySource ?? ""} placeholder="1099-MISC, Bank reporting" onChange={(e) => set("reportedBySource", e.target.value)} />
          </Field>
          <Field label="Income you reported">
            <TextField value={merged.reportedIncome ?? ""} placeholder="$45,000" onChange={(e) => set("reportedIncome", e.target.value)} />
          </Field>
          <Field label="Income reported to the IRS">
            <TextField value={merged.irsReportedIncome ?? ""} placeholder="$52,000" onChange={(e) => set("irsReportedIncome", e.target.value)} />
          </Field>
          <Field label="Tax return originally filed">
            <TextField type="date" value={merged.taxReturnFiledDate ?? ""} onChange={(e) => set("taxReturnFiledDate", e.target.value)} />
          </Field>
          <Field label="IRS response address" required hint="Copy exactly from your notice — this is where your response is mailed.">
            <TextArea rows={2} value={merged.irsResponseAddress ?? ""} placeholder={"IRS — Automated Underreporter\nP.O. Box 9019\nHoltsville, NY 11742-9019"} onChange={(e) => set("irsResponseAddress", e.target.value)} />
          </Field>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Field label="IRS explanation summary">
            <TextArea rows={3} value={merged.irsExplanationSummary ?? ""} onChange={(e) => set("irsExplanationSummary", e.target.value)} />
          </Field>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Field label="Additional notes (optional)" hint={`${(merged.additionalNotes ?? "").length}/500`}>
            <TextArea rows={2} maxLength={500} value={merged.additionalNotes ?? ""} onChange={(e) => set("additionalNotes", e.target.value)} />
          </Field>
        </div>
        <div style={{ marginTop: "0.75rem" }}>
          <button type="button" className="wf-btn wf-btn--outline" onClick={handleSave}>Save notice details</button>
        </div>
      </SectionCard>

      <SectionCard title={`Detected mismatch items (${discrepancies.length})`} description="These are the key items the discrepancy engine identified from your notice details.">
        {discrepancies.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--wf-color-stone)" }}>Fill in the tax year, proposed change amount, and reported source above to detect mismatch items.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {discrepancies.map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", padding: "0.6rem 0", borderTop: "1px solid var(--wf-color-rule)" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{d.description}</div>
                {d.difference && <div style={{ fontSize: "0.8rem", color: "var(--wf-color-stone)" }}>Difference: {d.difference}</div>}
              </div>
              <StatusPill tone={SEVERITY_TONE[d.confidence] ?? "info"} label={d.confidence === "high" ? "Needs review" : d.confidence === "medium" ? "Review" : "Opportunity"} />
            </div>
          ))}
        </div>
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Confirm notice number" }, { label: "Confirm response address" }, { label: "Continue to Documents" }]}
        continueLabel="Continue to Documents"
        continueDisabled={!requiredReviewed}
        onContinue={handleContinue}
      />
    </>
  );
}
