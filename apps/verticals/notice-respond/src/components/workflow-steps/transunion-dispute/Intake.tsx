import { useState } from "react";
import { SectionCard, Field, TextField, TextArea, FileList, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import {
  DISPUTE_CATEGORY_OPTIONS,
  emptyDisputedItem,
  type DisputedItemDraft,
  type TransUnionDisputeIntake,
} from "@/domain/step-workflows/transunion-dispute";

export function IntakeStep({ matter, onUpdateData, onComplete, goToStep }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as TransUnionDisputeIntake;
  const [form, setForm] = useState<TransUnionDisputeIntake>(intake);
  const [items, setItems] = useState<DisputedItemDraft[]>(intake.disputedItems?.length ? intake.disputedItems : [emptyDisputedItem()]);
  const files = ((matter.steps.documents?.data.files as { id: string; name: string }[]) ?? []).slice(0, 5);

  function set<K extends keyof TransUnionDisputeIntake>(key: K, value: TransUnionDisputeIntake[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateItem(id: string, patch: Partial<DisputedItemDraft>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((current) => [...current, emptyDisputedItem()]);
  }

  function removeItem(id: string) {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.id !== id) : current));
  }

  async function handleContinue() {
    await onUpdateData({ ...form, disputedItems: items });
    await onComplete();
  }

  const validItems = items.filter((item) => item.creditorName.trim() && item.category && item.description.trim());
  const requiredFilled = Boolean(form.consumerName && form.consumerAddress) && validItems.length > 0;

  return (
    <>
      <SectionCard
        title="Your information"
        description="This comes from the top of your TransUnion credit report and identifies you to the Consumer Dispute Center. Use the address you want TransUnion to write back to."
        headerAside={<span className="wf-pill wf-pill--warning">Required</span>}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label="Full name" required hint="As it appears on your credit report.">
            <TextField value={form.consumerName ?? ""} placeholder="e.g. Jordan A. Rivera" onChange={(e) => set("consumerName", e.target.value)} />
          </Field>
          <Field label="Mailing address" required hint="Street, city, state, and ZIP.">
            <TextField value={form.consumerAddress ?? ""} placeholder="e.g. 123 Main St, Springfield, IL 62704" onChange={(e) => set("consumerAddress", e.target.value)} />
          </Field>
          <Field label="Report date" hint="Printed near the top of your credit report — helps confirm the 30-day investigation window.">
            <TextField type="date" value={form.reportDate ?? ""} onChange={(e) => set("reportDate", e.target.value)} />
          </Field>
          <Field label="Report or confirmation number" hint="If your report shows one.">
            <TextField value={form.reportNumber ?? ""} placeholder="e.g. TU-2026-0043821" onChange={(e) => set("reportNumber", e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title={`Disputed items (${validItems.length} ready)`}
        description="Add one entry per account or item you're disputing. Pick the category that matches your situation — it determines which FCRA rights and evidence the letter references for that item."
        headerAside={<span className="wf-pill wf-pill--warning">Required</span>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {items.map((item, index) => {
            const categoryOption = DISPUTE_CATEGORY_OPTIONS.find((option) => option.value === item.category);
            return (
              <div key={item.id} style={{ borderTop: index > 0 ? "1px solid var(--wf-color-rule)" : undefined, paddingTop: index > 0 ? "1.1rem" : undefined }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 600 }}>Item {index + 1}</div>
                  {items.length > 1 && (
                    <button type="button" className="wf-btn wf-btn--outline" onClick={() => removeItem(item.id)}>
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.75rem" }}>
                  <Field label="Creditor or account name" required hint="e.g. the name shown next to the tradeline.">
                    <TextField value={item.creditorName} placeholder="e.g. Capital One Bank" onChange={(e) => updateItem(item.id, { creditorName: e.target.value })} />
                  </Field>
                  <Field label="Account number" hint="Copy it as shown, even if partially masked.">
                    <TextField value={item.accountNumber} placeholder="e.g. ****4521" onChange={(e) => updateItem(item.id, { accountNumber: e.target.value })} />
                  </Field>
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <Field label="What's wrong with this item?" required hint="Choosing the closest match tells us what evidence and FCRA rights to reference for this item.">
                    <select className="wf-input" value={item.category} onChange={(e) => updateItem(item.id, { category: e.target.value as DisputedItemDraft["category"] })}>
                      <option value="">Select a category</option>
                      {DISPUTE_CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {categoryOption && (
                    <p style={{ marginTop: "0.4rem", fontSize: "0.78rem", color: "var(--wf-color-stone-light)" }}>Strongest evidence: {categoryOption.evidenceHint}</p>
                  )}
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <Field label="Explain what's wrong" required hint={`Be specific — dates, amounts, and how you know it's wrong. ${item.description.length}/800`}>
                    <TextArea
                      rows={2}
                      maxLength={800}
                      value={item.description}
                      placeholder="e.g. This account shows a $3,200 balance, but I paid it in full on 3/15/2025 and have the confirmation."
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    />
                  </Field>
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <Field label="What should it say instead? (optional)" hint="If you know the correct balance, status, or that it should be removed entirely.">
                    <TextField value={item.correctInformation} placeholder="e.g. Balance should be $0.00 — paid in full" onChange={(e) => updateItem(item.id, { correctInformation: e.target.value })} />
                  </Field>
                </div>
              </div>
            );
          })}
        </div>
        <button type="button" className="wf-btn wf-btn--outline" style={{ marginTop: "1rem" }} onClick={addItem}>
          + Add another disputed item
        </button>
      </SectionCard>

      <SectionCard
        title="Anything else? (optional)"
        description="Skip this if the per-item explanations above cover it — we'll generate a summary from them automatically."
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={!requiredFilled} onClick={handleContinue}>
            Continue Intake →
          </button>
        }
      >
        <Field label="Additional context">
          <TextArea rows={2} value={form.additionalContext ?? ""} placeholder="Anything TransUnion should know that isn't covered by the items above." onChange={(e) => set("additionalContext", e.target.value)} />
        </Field>
        <div style={{ marginTop: "1rem" }}>
          <Field label="What do you want TransUnion to do?" hint="Leave blank to use the default request to investigate and correct or delete each item.">
            <TextArea rows={2} value={form.requestedOutcome ?? ""} placeholder="e.g. Delete the Capital One account entirely and send me an updated report." onChange={(e) => set("requestedOutcome", e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title={`Uploaded documents (${files.length})`}
        headerAside={
          <button type="button" className="wf-btn wf-btn--outline" onClick={() => goToStep("documents")}>
            Upload files
          </button>
        }
      >
        <FileList items={files.map((file) => ({ id: file.id, name: file.name }))} />
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Enter your information" }, { label: "Add every disputed item" }, { label: "Continue to Documents" }]}
        continueLabel="Continue Intake"
        continueDisabled={!requiredFilled}
        onContinue={handleContinue}
      />
    </>
  );
}
