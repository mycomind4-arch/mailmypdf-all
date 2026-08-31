/**
 * DocumentUpload — shared component for evidence/document upload.
 * 
 * Provides two inputs:
 * 1. A drag-drop zone for PDF/image files (stored as base64 in browser state)
 * 2. A text paste area for document text (passed to AI for analysis)
 * 
 * File names are auto-added to the evidence list. Pasted text is passed
 * to the analyze endpoint to improve AI analysis quality.
 */

import { useRef, useState } from "react";

export type UploadedFile = {
  name: string;
  sizeBytes: number;
  dataBase64: string;
  contentType: string;
};

export function DocumentUpload({
  documentText,
  onTextChange,
  files,
  onFilesChange,
  accent,
}: {
  documentText: string;
  onTextChange: (text: string) => void;
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  accent: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    setError("");
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      // Max 10MB per file
      if (f.size > 10 * 1024 * 1024) {
        setError(`${f.name} is too large (max 10MB).`);
        continue;
      }
      // Accept PDFs and images
      const validTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "image/gif",
        "image/tiff",
      ];
      if (!validTypes.includes(f.type)) {
        setError(`${f.name} is not a supported type. Use PDF, PNG, JPG, or TIFF.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1] || "";
        newFiles.push({
          name: f.name,
          sizeBytes: f.size,
          dataBase64: base64,
          contentType: f.type,
        });
        // Push when all files processed
        if (newFiles.length > 0 && newFiles.length === fileList.length - [...fileList].filter(x => x.size > 10 * 1024 * 1024 || !validTypes.includes(x.type)).length) {
          onFilesChange([...files, ...newFiles]);
        }
      };
      reader.onerror = () => setError(`Could not read ${f.name}.`);
      reader.readAsDataURL(f);
    }
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      {/* File upload dropzone */}
      <div>
        <span className="text-sm font-medium">Upload supporting documents (optional)</span>
        <p className="mt-0.5 text-xs text-[#17201d]/50">PDF, PNG, JPG, or TIFF. Max 10MB each. These get mailed with your letter.</p>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`mt-2 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition ${dragging ? "border-current" : "border-[#17201d]/20 hover:border-[#17201d]/40"}`}
          style={dragging ? { borderColor: accent, background: accent + "08" } : {}}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.tiff,application/pdf,image/*"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <p className="text-sm text-[#17201d]/50">Drag & drop files here, or click to browse</p>
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {files.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg border border-[#17201d]/10 bg-[#f6f4ef] px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#17201d]/40">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="font-medium">{f.name}</span>
                  <span className="text-xs text-[#17201d]/40">{(f.sizeBytes / 1024).toFixed(0)} KB</span>
                </span>
                <button onClick={() => removeFile(i)} className="text-[#17201d]/40 hover:text-red-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Document text paste area */}
      <div>
        <label className="block">
          <span className="text-sm font-medium">Paste document text (optional)</span>
          <p className="mt-0.5 text-xs text-[#17201d]/50">Paste text from notices, contracts, or correspondence. AI uses this to improve your letter.</p>
          <textarea
            value={documentText}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Paste the relevant text from your documents here…"
            rows={4}
            maxLength={50000}
            className="mt-2 w-full resize-y rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 font-mono text-xs leading-5"
          />
        </label>
      </div>
    </div>
  );
}
