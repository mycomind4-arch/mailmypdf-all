import { useRef, useState, type DragEvent } from "react";

export interface DropzoneProps {
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
}

/**
 * Presentational drag-and-drop upload shell. Owns no storage — just turns a
 * drop/pick into a `File[]` callback; the caller decides where files go.
 */
export function Dropzone({ onFiles, label = "Drag and drop files here", hint, accept, multiple = true }: DropzoneProps) {
  const [isOver, setIsOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsOver(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length) onFiles(files);
  }

  return (
    <div
      className={`wf-dropzone ${isOver ? "wf-dropzone--over" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
    >
      <div className="wf-dropzone-icon" aria-hidden="true">
        ⬆
      </div>
      <div className="wf-dropzone-label">{label}</div>
      <button type="button" className="wf-btn wf-btn--primary" onClick={() => inputRef.current?.click()}>
        Upload files
      </button>
      {hint && <p className="wf-dropzone-hint">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        className="wf-sr-only"
        accept={accept}
        multiple={multiple}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) onFiles(files);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}
