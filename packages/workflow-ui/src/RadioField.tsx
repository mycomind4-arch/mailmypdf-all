import { useId } from "react";

export interface RadioFieldProps {
  label: string;
  hint?: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}

/** Native radios provide keyboard/arrow-key behavior and an explicit unknown choice. */
export function RadioField({ label, hint, value, options, onChange }: RadioFieldProps) {
  const id = useId();
  return (
    <fieldset className="wf-radio-field" aria-describedby={hint ? `${id}-hint` : undefined}>
      <legend className="wf-field-label">{label}</legend>
      {hint && <p className="wf-field-hint" id={`${id}-hint`}>{hint}</p>}
      <div className="wf-radio-options">
        {options.map((option) => (
          <label key={option.value} className={`wf-radio-option${value === option.value ? " is-selected" : ""}`}>
            <input type="radio" name={id} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
