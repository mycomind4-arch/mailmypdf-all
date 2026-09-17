import { SectionCard, Dropzone, FileList, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "@mailmypdf/workflow-ui";

type DocumentFile = { id: string; name: string; category: string };

const RECOMMENDED_CATEGORIES = [
  "Decision Notice",
  "Appeal Instructions",
  "Correspondence",
  "Supporting Records",
  "Prior Filings",
  "Cited Authority",
  "Evidence Exhibits",
];

export function DocumentsStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
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
        description="Upload the administrative decision notice and any supporting records. These documents will be used to verify the governing procedure and included in your mailing package as exhibits."
        headerAside={files.length === 0 ? <span className="wf-pill wf-pill--warning">Recommended</span> : undefined}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={files.length === 0} onClick={onComplete}>
            Continue to Analyze →
          </button>
        }
      >
        <Dropzone
          onFiles={handleFiles}
          hint="Supported formats: PDF, JPG, PNG, DOC, DOCX (max 25 MB each)"
        />
        <div style={{ marginTop: "1.25rem" }}>
          <div className="wf-card-eyebrow">Recommended document categories</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
            {RECOMMENDED_CATEGORIES.map((category) => (
              <span key={category} className="wf-pill wf-pill--neutral">
                {category}
              </span>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title={`Uploaded documents (${files.length})`}>
        <FileList
          items={files.map((file) => ({ id: file.id, name: file.name, category: file.category }))}
          onRemove={handleRemove}
        />
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Upload the decision notice" }, { label: "Categorize files" }, { label: "Continue to Analyze" }]}
        continueLabel="Continue to Analyze"
        continueDisabled={files.length === 0}
        onContinue={onComplete}
      />
    </>
  );
}
