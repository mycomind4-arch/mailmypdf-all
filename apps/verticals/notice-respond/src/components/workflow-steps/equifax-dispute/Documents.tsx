import { SectionCard, Dropzone, FileList, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";

type DocumentFile = { id: string; name: string; category: string };

const RECOMMENDED_CATEGORIES = [
  "Equifax Credit Report",
  "Proof of Identity (ID or license)",
  "Proof of Address (utility bill)",
  "Account Statements",
  "Payment Records / Receipts",
  "Prior Dispute Correspondence",
  "Police Report / FTC Identity Theft Report",
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

  const hasReport = files.some((f) => /report/i.test(f.category) || /report/i.test(f.name));

  return (
    <>
      <SectionCard
        title="Document collection"
        description="Upload your Equifax credit report first — it's what confirms the report date and the items you're disputing. Then add proof of identity and anything that supports your disputed items (statements, payment records, a police report for identity theft)."
        headerAside={files.length === 0 ? <span className="wf-pill wf-pill--warning">Recommended</span> : undefined}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={files.length === 0} onClick={onComplete}>
            Continue to Analyze →
          </button>
        }
      >
        <Dropzone onFiles={handleFiles} hint="Supported formats: PDF, JPG, PNG (max 25 MB each)" />
        {!hasReport && files.length > 0 && (
          <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--wf-color-warning, #b45309)" }}>
            We don't see a credit report among your uploads yet — rename or tag one as "Equifax Credit Report" so it's clearly identified in your mailing package.
          </p>
        )}
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
        <FileList items={files.map((file) => ({ id: file.id, name: file.name, category: file.category }))} onRemove={handleRemove} />
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Upload your credit report" }, { label: "Add proof of identity" }, { label: "Continue to Analyze" }]}
        continueLabel="Continue to Analyze"
        continueDisabled={files.length === 0}
        onContinue={onComplete}
      />
    </>
  );
}
