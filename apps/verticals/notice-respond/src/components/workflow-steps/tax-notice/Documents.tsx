import { SectionCard, Dropzone, FileList, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import { getCombinedIntake } from "@/domain/step-workflows/tax-notice";
import { putDocumentBytes, deleteDocumentBytes } from "@/lib/supabase-document-store";

type DocumentFile = { id: string; name: string; category: string };

const BASE_CATEGORIES = ["The notice itself (all pages)", "Prior correspondence with the agency", "Proof of identity"];

const CATEGORY_HINTS: Record<string, string[]> = {
  math_error: ["The tax return the correction relates to", "Documents showing the figure you reported was correct"],
  proposed_assessment: ["W-2s, 1099s, or other third-party statements for the tax year", "The filed return for the tax year in question"],
  collection: ["Proof of payments already made", "Financial information (if requesting a payment plan or Offer in Compromise)"],
  audit: ["The specific records requested in the audit notice", "Receipts, logs, or statements supporting the items being examined"],
  other: ["Any records that support your position"],
};

export function DocumentsStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const files = (matter.steps.documents?.data.files as DocumentFile[]) ?? [];
  const data = getCombinedIntake(matter);
  const recommended = [...BASE_CATEGORIES, ...(CATEGORY_HINTS[data.noticeCategory ?? "other"] ?? CATEGORY_HINTS.other)];

  async function handleFiles(newFiles: File[]) {
    const added: DocumentFile[] = newFiles.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      category: "Uncategorized",
    }));
    // The real bytes are only available here, at upload time — persist them
    // now (see document-bytes-store.ts) so the Mail step's packet preview
    // has something real to render, not just this file's name.
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

  const hasNotice = files.some((f) => /notice|letter/i.test(f.category) || /notice|letter/i.test(f.name));

  return (
    <>
      <SectionCard
        title="Document collection"
        description="Upload every page of the notice first — the deadline, response instructions, and payment options are often printed on pages beyond the first. Then add anything that supports your facts."
        headerAside={files.length === 0 ? <span className="wf-pill wf-pill--warning">Recommended</span> : undefined}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={files.length === 0} onClick={onComplete}>
            Continue to Strategy →
          </button>
        }
      >
        <Dropzone onFiles={handleFiles} hint="Supported formats: PDF, JPG, PNG (max 25 MB each)" />
        {!hasNotice && files.length > 0 && (
          <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--wf-color-warning, #b45309)" }}>
            We don't see the notice itself among your uploads yet — tag one as "The notice itself" so it's clearly identified in your mailing package.
          </p>
        )}
        <div style={{ marginTop: "1.25rem" }}>
          <div className="wf-card-eyebrow">Recommended document categories for this notice type</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
            {recommended.map((category) => (
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
        steps={[{ label: "Upload the notice" }, { label: "Add supporting records" }, { label: "Continue to Strategy" }]}
        continueLabel="Continue to Strategy"
        continueDisabled={files.length === 0}
        onContinue={onComplete}
      />
    </>
  );
}
