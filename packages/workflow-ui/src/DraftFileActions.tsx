import { useRef, useState } from "react";
import { ConfirmationPrompt } from "./ConfirmationPrompt";

export interface DraftFileActionsProps<T> {
  draft: T;
  filename: string;
  parse: (text: string) => T;
  onRestore: (draft: T) => void;
  hasUnsavedChanges: boolean;
  onDownload?: () => void;
  /** This is an explicit local-file flow, never an account/cloud save. */
  summaryText?: string;
}

function download(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  // Preserve the form even in embedded browsers that ignore the download attribute.
  anchor.target = "_blank";
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DraftFileActions<T>({ draft, filename, parse, onRestore, hasUnsavedChanges, onDownload, summaryText }: DraftFileActionsProps<T>) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingRestore, setPendingRestore] = useState<{ draft: T } | null>(null);
  const dirty = useRef(hasUnsavedChanges);
  dirty.current = hasUnsavedChanges;

  function applyRestore(restored: T) {
    onRestore(restored);
    setPendingRestore(null);
    setMessage("Draft opened. Its answers are still user-reported and have not been verified.");
  }

  function save(summary: boolean) {
    setError("");
    try {
      download(summary ? summaryText ?? "" : JSON.stringify(draft, null, 2), `${filename}.${summary ? "txt" : "json"}`, summary ? "text/plain;charset=utf-8" : "application/json");
      if (!summary) onDownload?.();
      setMessage(summary ? "Summary download started. Use the JSON draft to reopen your answers." : "Draft download started. Keep the JSON file to reopen your answers. It is not saved to your account.");
    } catch {
      setError("The download could not start. Your answers are still on this page. Please try again.");
    }
  }

  async function restore(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      // Allow multibyte text in drafts whose schema bounds the character count.
      if (file.size > 512000) throw new Error("Choose a draft file under 512 KB.");
      const restored = parse(await file.text());
      // Recheck after reading: the user may have edited while the file loaded.
      if (dirty.current) setPendingRestore({ draft: restored });
      else applyRestore(restored);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not open this draft. Your answers have not been changed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section className="wf-draft-actions" aria-label="Draft files" aria-busy={busy}>
      <div className="wf-intake-actions">
        <button type="button" className="wf-btn wf-btn--outline" onClick={() => save(false)} disabled={busy}>Download draft</button>
        <button type="button" className="wf-btn wf-btn--outline" onClick={() => input.current?.click()} disabled={busy}>{busy ? "Opening draft…" : "Open saved draft"}</button>
        {summaryText !== undefined && <button type="button" className="wf-btn wf-btn--outline" onClick={() => save(true)} disabled={busy}>Download summary</button>}
        <input ref={input} type="file" accept=".json,application/json" className="wf-sr-only" tabIndex={-1} aria-label="Choose a saved JSON draft" onChange={(event) => void restore(event.target.files?.[0])} />
      </div>
      <p className="wf-intake-note">Local files only. Not saved to your account. Draft files contain your answers—store them privately.</p>
      <p className="wf-intake-note" role="status">{message}</p>
      {error && <p className="wf-intake-error" role="alert">{error}</p>}
      <ConfirmationPrompt open={pendingRestore !== null} title="Replace the current answers?" description="The saved draft will replace the answers on this page. Cancel and download your current draft first if you want to keep both." cancelLabel="Keep current answers" confirmLabel="Replace with saved draft" onCancel={() => setPendingRestore(null)} onConfirm={() => { if (pendingRestore) applyRestore(pendingRestore.draft); }} />
    </section>
  );
}
