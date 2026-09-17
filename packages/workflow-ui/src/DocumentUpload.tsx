import { useState } from "react";
import { Dropzone } from "./Dropzone";
import { FileList } from "./FileList";
import { SectionCard } from "./SectionCard";

export interface DocumentUploadItem {
  id: string;
  name: string;
  sizeBytes?: number;
  status?: string;
  category?: string;
}

export interface DocumentUploadProps {
  title?: string;
  description?: string;
  label?: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  items?: DocumentUploadItem[];
  onUpload: (files: File[]) => Promise<void> | void;
  onRemove?: (id: string) => Promise<void> | void;
}

function sizeLabel(bytes?: number): string | undefined {
  if (bytes === undefined) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Shared workflow document upload surface.
 *
 * Storage, authorization and malware scanning deliberately remain runtime-owned.
 * This component only owns the upload interaction, async/error state and the
 * document list. Callers should connect onUpload to the secure document vault.
 */
export function DocumentUpload({
  title = "Documents",
  description = "Add the documents this workflow needs. Uploaded files remain reviewable before they are used or mailed.",
  label = "Drag and drop files here",
  hint = "Files are validated and scanned before workflow use.",
  accept = ".pdf,.png,.jpg,.jpeg,.tif,.tiff,application/pdf,image/png,image/jpeg,image/tiff",
  multiple = true,
  disabled = false,
  items = [],
  onUpload,
  onRemove,
}: DocumentUploadProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: File[]) {
    if (disabled || !files.length) return;
    setBusy(true);
    setError(null);
    try {
      await onUpload(files);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Document upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!onRemove || disabled || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onRemove(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to remove the document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard
      title={title}
      description={description}
      headerAside={busy ? <span className="wf-pill wf-pill--info">Working…</span> : undefined}
    >
      <Dropzone
        onFiles={(files) => void upload(files)}
        label={busy ? "Uploading…" : label}
        hint={hint}
        accept={accept}
        multiple={multiple}
      />
      {error && <div className="wf-callout wf-callout--danger">{error}</div>}
      <FileList
        items={items.map((item) => ({
          id: item.id,
          name: item.name,
          meta: [sizeLabel(item.sizeBytes), item.status].filter(Boolean).join(" · ") || undefined,
          category: item.category,
        }))}
        onRemove={onRemove ? (id) => void remove(id) : undefined}
      />
    </SectionCard>
  );
}
