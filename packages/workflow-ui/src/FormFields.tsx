import type { ReactNode, TextareaHTMLAttributes, InputHTMLAttributes } from "react";

export interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

/** Label + hint wrapper around any form control. */
export function Field({ label, required, hint, children }: FieldProps) {
  return (
    <label className="wf-field">
      <span className="wf-field-label">
        {label}
        {required && <span className="wf-field-required"> *</span>}
      </span>
      {children}
      {hint && <span className="wf-field-hint">{hint}</span>}
    </label>
  );
}

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={["wf-input", props.className].filter(Boolean).join(" ")} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={["wf-textarea", props.className].filter(Boolean).join(" ")} />;
}

export interface CheckboxFieldProps {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="wf-checkbox-field">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
