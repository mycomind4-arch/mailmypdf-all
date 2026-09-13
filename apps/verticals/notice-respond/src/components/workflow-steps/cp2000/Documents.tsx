import { SectionCard, Dropzone, FileList, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import { putDocumentBytes, deleteDocumentBytes } from "@/lib/supabase-document-store";

type DocumentFile = { id: string; name: string; category: string };

const RECOMMENDED_CATEGORIES = [
  "The CP2000 notice itself (all pages)",
  "Tax return for the year in question (Form 1040)",
  "W-2s, 1099s, or other information returns",
  "IRS account transcript",
  "Prior correspondence with the IRS",
];

export function DocumentsStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const files = (matter.steps.documents?.data.files as DocumentFile[]) ?? [];

  async function handleFiles(newFiles: File[]) {
    const added: DocumentFile[] = newFiles.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      category: "Uncategorized",
    }));
    await Promise.all(newFiles.map(async (file, index) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      await putDocumentBytes(matter.id, added[index].id, bytes, {
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
      });
    }));
    await onUpdateData({ files: [...files, ...added] });
  }

  async function handleRemove(id: string) {
    await deleteDocumentBytes(matter.id, id);
    await onUpdateData({ files: files.filter((file) => file.id !== id) });
  }

  const hasNotice = files.some((f) => /notice/i.test(f.category) || /cp2000|notice/i.test(f.name));

  return (
    <>
      <SectionCard
        title="Document collection"
        description="Upload every page of your CP2000 notice first, then add the tax records that support your position."
        headerAside={files.length === 0 ? <span className="wf-pill wf-pill--warning">Recommended</span> : undefined}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={files.length === 0} onClick={onComplete}>
            Continue to Analysis →
          </button>
        }
      >
        <Dropzone onFiles={handleFiles} hint="Supported formats: PDF, JPG, PNG (max 25 MB each)" />
        {!hasNotice && files.length > 0 && (
          <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--wf-color-warning, #b45309)" }}>
            We don't see the CP2000 notice itself among your uploads yet — tag one as "notice" so it's clearly identified in your mailing package.
          </p>
        )}
        <div style={{ marginTop: "1.25rem" }}>
          <div className="wf-card-eyebrow">Recommended documents for CP2000</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
            {RECOMMENDED_CATEGORIES.map((category) => (
              <span key={category} className="wf-pill wf-pill--neutral">{category}</span>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title={`Uploaded documents (${files.length})`}>
        <FileList items={files.map((file) => ({ id: file.id, name: file.name, category: file.category }))} onRemove={handleRemove} />
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Upload the notice" }, { label: "Add supporting records" }, { label: "Continue to Analysis" }]}
        continueLabel="Continue to Analysis"
        continueDisabled={files.length === 0}
        onContinue={onComplete}
      />
    </>
  );
}
