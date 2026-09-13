import { SectionCard, Dropzone, FileList, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { NoidResponseIntake } from "@/domain/step-workflows/noid-response";
import { getFormProfile } from "@/domain/form-adapters";

type DocumentFile = { id: string; name: string; category: string };

export function DocumentsStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as NoidResponseIntake;
  const profile = intake.formType ? getFormProfile(intake.formType) : undefined;
  const files = (matter.steps.documents?.data.files as DocumentFile[]) ?? [];

  async function handleFiles(newFiles: File[]) {
    const added: DocumentFile[] = newFiles.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      category: "Uncategorized",
    }));
    await onUpdateData({ files: [...files, ...added] });
  }

  async function handleRemove(id: string) {
    await onUpdateData({ files: files.filter((file) => file.id !== id) });
  }

  return (
    <>
      <SectionCard
        title="Document collection"
        description="Upload the NOID notice and every document that supports your response. These will be organized as exhibits in your final response package."
        headerAside={files.length === 0 ? <span className="wf-pill wf-pill--warning">Recommended</span> : undefined}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={files.length === 0} onClick={onComplete}>
            Continue to Analyze →
          </button>
        }
      >
        <Dropzone onFiles={handleFiles} hint="Supported formats: PDF, JPG, PNG, DOC, DOCX (max 25 MB each)" />
        {profile && (
          <div style={{ marginTop: "1.25rem" }}>
            <div className="wf-card-eyebrow">Recommended document categories for {profile.formType}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
              <span className="wf-pill wf-pill--neutral">NOID notice</span>
              {profile.evidenceCategories.map((category) => (
                <span key={category.category} className="wf-pill wf-pill--neutral">
                  {category.description}
                </span>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title={`Uploaded documents (${files.length})`}>
        <FileList
          items={files.map((file) => ({ id: file.id, name: file.name, category: file.category }))}
          onRemove={handleRemove}
        />
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Upload the NOID notice" }, { label: "Upload supporting evidence" }, { label: "Continue to Analyze" }]}
        continueLabel="Continue to Analyze"
        continueDisabled={files.length === 0}
        onContinue={onComplete}
      />
    </>
  );
}
