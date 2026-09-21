import { useEffect, useId, useRef } from "react";

export interface ConfirmationPromptProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** In-page confirmation: native dialog focus trapping without window.confirm. */
export function ConfirmationPrompt({ open, title, description, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmationPromptProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  return (
    <dialog ref={dialog} className="wf-confirmation-prompt" role="alertdialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={(event) => { event.preventDefault(); onCancel(); }}>
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`}>{description}</p>
      <div className="wf-intake-actions">
        <button type="button" className="wf-btn wf-btn--primary" autoFocus onClick={onCancel}>{cancelLabel}</button>
        <button type="button" className="wf-btn wf-btn--outline" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}
