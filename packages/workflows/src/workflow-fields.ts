export type WorkflowFieldType =
  | "text"
  | "textarea"
  | "date"
  | "money"
  | "integer"
  | "decimal"
  | "checkbox"
  | "select"
  | "person_name"
  | "postal_address"
  | "email"
  | "phone"
  | "reference";

export type WorkflowFieldOrigin =
  | "user"
  | "extracted_confirmation"
  | "either";

export interface WorkflowFieldOption {
  value: string;
  label: string;
}

export interface WorkflowFieldManifest {
  id: string;
  label: string;
  type: WorkflowFieldType;
  required: boolean;
  origin: WorkflowFieldOrigin;
  hint?: string;
  placeholder?: string;
  sensitive?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: readonly WorkflowFieldOption[];
}

const FIELD_ID = /^[a-z][a-z0-9._-]{1,63}$/;

export function validateWorkflowField(field: WorkflowFieldManifest): string[] {
  const errors: string[] = [];

  if (!FIELD_ID.test(field.id)) {
    errors.push(`field ${field.id || "(empty)"} has invalid id`);
  }
  if (!field.label.trim()) {
    errors.push(`field ${field.id} requires a label`);
  }
  if (
    field.maxLength !== undefined &&
    (!Number.isInteger(field.maxLength) ||
      field.maxLength < 1 ||
      field.maxLength > 100_000)
  ) {
    errors.push(`field ${field.id} has invalid maxLength`);
  }
  if (
    field.min !== undefined &&
    (!Number.isFinite(field.min) ||
      (field.max !== undefined && field.min > field.max))
  ) {
    errors.push(`field ${field.id} has invalid minimum`);
  }
  if (field.max !== undefined && !Number.isFinite(field.max)) {
    errors.push(`field ${field.id} has invalid maximum`);
  }

  if (field.type === "select") {
    if (!field.options || field.options.length < 2) {
      errors.push(`select field ${field.id} requires at least two options`);
    } else {
      const values = field.options.map((option) => option.value);
      if (values.some((value) => !value.trim())) {
        errors.push(`select field ${field.id} contains an empty option value`);
      }
      if (new Set(values).size !== values.length) {
        errors.push(`select field ${field.id} contains duplicate option values`);
      }
    }
  } else if (field.options?.length) {
    errors.push(`field ${field.id} may define options only when type is select`);
  }

  return errors;
}

export function validateWorkflowFields(
  fields: readonly WorkflowFieldManifest[],
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const field of fields) {
    errors.push(...validateWorkflowField(field));
    if (ids.has(field.id)) errors.push(`duplicate workflow field: ${field.id}`);
    ids.add(field.id);
  }

  return errors;
}

type CommonFieldInput = {
  id: string;
  label: string;
  required?: boolean;
  origin?: WorkflowFieldOrigin;
  hint?: string;
  placeholder?: string;
  sensitive?: boolean;
};

function common(
  input: CommonFieldInput,
): Omit<WorkflowFieldManifest, "type"> {
  return {
    id: input.id,
    label: input.label,
    required: input.required ?? false,
    origin: input.origin ?? "user",
    hint: input.hint,
    placeholder: input.placeholder,
    sensitive: input.sensitive,
  };
}

export function personNameField(
  input: CommonFieldInput,
): WorkflowFieldManifest {
  return { ...common(input), type: "person_name", maxLength: 200 };
}

export function postalAddressField(
  input: CommonFieldInput,
): WorkflowFieldManifest {
  return { ...common(input), type: "postal_address" };
}

export function dateField(
  input: CommonFieldInput,
): WorkflowFieldManifest {
  return { ...common(input), type: "date" };
}

export function moneyField(
  input: CommonFieldInput,
): WorkflowFieldManifest {
  return { ...common(input), type: "money", maxLength: 128 };
}

export function referenceNumberField(
  input: CommonFieldInput,
): WorkflowFieldManifest {
  return { ...common(input), type: "reference", maxLength: 200 };
}

export function textField(
  input: CommonFieldInput & { maxLength?: number },
): WorkflowFieldManifest {
  return {
    ...common(input),
    type: "text",
    maxLength: input.maxLength ?? 500,
  };
}

export function longTextField(
  input: CommonFieldInput & { maxLength?: number },
): WorkflowFieldManifest {
  return {
    ...common(input),
    type: "textarea",
    maxLength: input.maxLength ?? 10_000,
  };
}

export function checkboxField(
  input: CommonFieldInput,
): WorkflowFieldManifest {
  return { ...common(input), type: "checkbox" };
}

export function selectField(
  input: CommonFieldInput & { options: readonly WorkflowFieldOption[] },
): WorkflowFieldManifest {
  return { ...common(input), type: "select", options: [...input.options] };
}
