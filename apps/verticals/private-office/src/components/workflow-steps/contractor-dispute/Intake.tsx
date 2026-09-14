import { useState } from "react";
import { SectionCard, Field, TextField, TextArea, FileList, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { ContractorDisputeIntake } from "@/domain/step-workflows/contractor-dispute";

export function IntakeStep({ matter, onUpdateData, onComplete, goToStep }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as ContractorDisputeIntake;
  const [form, setForm] = useState<ContractorDisputeIntake>(intake);
  const files = ((matter.steps.documents?.data.files as { id: string; name: string }[]) ?? []).slice(0, 5);

  function set<K extends keyof ContractorDisputeIntake>(key: K, value: ContractorDisputeIntake[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleContinue() {
    await onUpdateData(form);
    await onComplete();
  }

  const requiredFilled = Boolean(form.propertyAddress && form.contractorName && form.disputeSummary && form.requestedResolution);

  return (
    <>
      <SectionCard
        title="Matter intake"
        description="Tell us about your property, the contractor, and the dispute. This information will be used to generate your notice and organize your evidence."
        headerAside={<span className="wf-pill wf-pill--warning">Required fields</span>}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={!requiredFilled} onClick={handleContinue}>
            Continue Intake →
          </button>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label="Property address" required>
            <TextField value={form.propertyAddress ?? ""} onChange={(e) => set("propertyAddress", e.target.value)} />
          </Field>
          <Field label="Contractor name" required>
            <TextField value={form.contractorName ?? ""} onChange={(e) => set("contractorName", e.target.value)} />
          </Field>
          <Field label="Agreement type">
            <TextField
              value={form.agreementType ?? ""}
              placeholder="Written contract"
              onChange={(e) => set("agreementType", e.target.value)}
            />
          </Field>
          <Field label="Date agreement signed">
            <TextField type="date" value={form.dateAgreementSigned ?? ""} onChange={(e) => set("dateAgreementSigned", e.target.value)} />
          </Field>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Field label="Dispute summary" required hint={`${(form.disputeSummary ?? "").length}/1000`}>
            <TextArea
              rows={3}
              maxLength={1000}
              value={form.disputeSummary ?? ""}
              onChange={(e) => set("disputeSummary", e.target.value)}
            />
          </Field>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Field label="Requested resolution" required hint={`${(form.requestedResolution ?? "").length}/1000`}>
            <TextArea
              rows={2}
              maxLength={1000}
              value={form.requestedResolution ?? ""}
              onChange={(e) => set("requestedResolution", e.target.value)}
            />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
          <Field label="Date work began">
            <TextField type="date" value={form.dateWorkBegan ?? ""} onChange={(e) => set("dateWorkBegan", e.target.value)} />
          </Field>
          <Field label="Date issue discovered">
            <TextField type="date" value={form.dateIssueDiscovered ?? ""} onChange={(e) => set("dateIssueDiscovered", e.target.value)} />
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
        steps={[{ label: "Fill required fields" }, { label: "Add key documents" }, { label: "Continue to Documents" }]}
        continueLabel="Continue Intake"
        continueDisabled={!requiredFilled}
        onContinue={handleContinue}
      />
    </>
  );
}
