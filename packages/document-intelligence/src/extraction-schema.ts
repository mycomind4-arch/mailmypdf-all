export type ExtractionFieldType =
  | "text"
  | "date"
  | "money"
  | "integer"
  | "decimal"
  | "boolean"
  | "text_list"
  | "postal_address";

export interface ExtractionFieldDefinition {
  id: string;
  label: string;
  type: ExtractionFieldType;
  description: string;
  required: boolean;
  sourceRequired?: boolean;
  allowedValues?: readonly string[];
  maxLength?: number;
}

export interface DocumentExtractionSchema {
  id: string;
  version: number;
  documentKinds: readonly string[];
  fields: readonly ExtractionFieldDefinition[];
  strict?: boolean;
}

export interface ExtractionFieldSource {
  page: number | null;
  excerpt: string;
}

export interface StructuredExtractionField {
  value: unknown;
  confidence: number;
  source?: ExtractionFieldSource | null;
}

export interface StructuredDocumentExtraction {
  schemaId: string;
  fields: Record<string, StructuredExtractionField>;
}

export interface ExtractionValidationIssue {
  fieldId: string | null;
  code:
    | "invalid_schema"
    | "missing_field"
    | "unknown_field"
    | "invalid_field"
    | "invalid_confidence"
    | "missing_source"
    | "invalid_source";
  message: string;
}

export interface ExtractionValidationResult {
  valid: boolean;
  issues: readonly ExtractionValidationIssue[];
  value?: StructuredDocumentExtraction;
}

const FIELD_ID = /^[a-z][a-z0-9._-]{1,63}$/;
const SCHEMA_ID = /^[a-z0-9][a-z0-9._-]{2,127}$/;

function assertFieldDefinition(field: ExtractionFieldDefinition): void {
  if (!FIELD_ID.test(field.id)) {
    throw new Error(`Invalid extraction field id: ${field.id}`);
  }
  if (!field.label.trim() || !field.description.trim()) {
    throw new Error(`Extraction field ${field.id} requires label and description`);
  }
  if (
    field.maxLength !== undefined &&
    (!Number.isInteger(field.maxLength) || field.maxLength < 1 || field.maxLength > 100_000)
  ) {
    throw new Error(`Extraction field ${field.id} has invalid maxLength`);
  }
  if (field.allowedValues?.length) {
    if (field.type !== "text") {
      throw new Error(`Extraction field ${field.id} allowedValues requires text type`);
    }
    if (new Set(field.allowedValues).size !== field.allowedValues.length) {
      throw new Error(`Extraction field ${field.id} has duplicate allowedValues`);
    }
  }
}

export function createDocumentExtractionSchema(
  schema: DocumentExtractionSchema,
): Readonly<DocumentExtractionSchema> {
  if (!SCHEMA_ID.test(schema.id)) {
    throw new Error("Extraction schema id must be a stable 3-128 character id");
  }
  if (!Number.isInteger(schema.version) || schema.version < 1) {
    throw new Error("Extraction schema version must be a positive integer");
  }
  if (schema.fields.length === 0) {
    throw new Error("Extraction schema requires at least one field");
  }

  const ids = new Set<string>();
  for (const field of schema.fields) {
    assertFieldDefinition(field);
    if (ids.has(field.id)) {
      throw new Error(`Duplicate extraction field: ${field.id}`);
    }
    ids.add(field.id);
  }

  return Object.freeze({
    ...schema,
    documentKinds: Object.freeze([...schema.documentKinds]),
    fields: Object.freeze(schema.fields.map((field) => Object.freeze({ ...field }))),
  });
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validPostalAddress(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const address = value as Record<string, unknown>;
  for (const key of ["line1", "city", "state", "postal"] as const) {
    if (typeof address[key] !== "string" || !address[key].trim()) return false;
  }
  if (
    address.line2 !== undefined &&
    address.line2 !== null &&
    typeof address.line2 !== "string"
  ) return false;
  return true;
}

function validateFieldValue(
  definition: ExtractionFieldDefinition,
  value: unknown,
): string | null {
  if (value === null || value === undefined) {
    return definition.required ? "required value is missing" : null;
  }

  switch (definition.type) {
    case "text": {
      if (typeof value !== "string") return "expected text";
      const text = value.trim();
      if (!text) return definition.required ? "required text is empty" : null;
      if (definition.maxLength && text.length > definition.maxLength) {
        return `text exceeds ${definition.maxLength} characters`;
      }
      if (definition.allowedValues?.length && !definition.allowedValues.includes(value)) {
        return `value must be one of: ${definition.allowedValues.join(", ")}`;
      }
      return null;
    }
    case "date":
      return typeof value === "string" && validDate(value)
        ? null
        : "expected ISO calendar date YYYY-MM-DD";
    case "money":
      return typeof value === "string" && value.trim() && value.length <= 128
        ? null
        : "expected the amount exactly as shown in the source";
    case "integer":
      return typeof value === "number" && Number.isSafeInteger(value)
        ? null
        : "expected integer";
    case "decimal":
      return typeof value === "number" && Number.isFinite(value)
        ? null
        : "expected finite number";
    case "boolean":
      return typeof value === "boolean" ? null : "expected boolean";
    case "text_list":
      return Array.isArray(value) &&
        value.length <= 100 &&
        value.every((item) => typeof item === "string" && item.trim().length > 0)
        ? null
        : "expected an array of non-empty strings";
    case "postal_address":
      return validPostalAddress(value) ? null : "expected postal address";
  }
}

function validateSource(
  fieldId: string,
  source: unknown,
): ExtractionValidationIssue | null {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {
      fieldId,
      code: "invalid_source",
      message: `${fieldId} source must contain page and excerpt`,
    };
  }

  const candidate = source as Record<string, unknown>;
  const pageOk =
    candidate.page === null ||
    (Number.isInteger(candidate.page) && Number(candidate.page) >= 1);
  const excerptOk =
    typeof candidate.excerpt === "string" &&
    candidate.excerpt.trim().length > 0 &&
    candidate.excerpt.length <= 500;

  return pageOk && excerptOk
    ? null
    : {
        fieldId,
        code: "invalid_source",
        message: `${fieldId} source page/excerpt is invalid`,
      };
}

export function validateStructuredExtraction(
  schema: DocumentExtractionSchema,
  input: unknown,
): ExtractionValidationResult {
  const issues: ExtractionValidationIssue[] = [];

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      valid: false,
      issues: [{ fieldId: null, code: "invalid_schema", message: "Extraction result must be an object" }],
    };
  }

  const candidate = input as Partial<StructuredDocumentExtraction>;
  if (candidate.schemaId !== schema.id) {
    issues.push({
      fieldId: null,
      code: "invalid_schema",
      message: `Expected schemaId ${schema.id}`,
    });
  }
  if (!candidate.fields || typeof candidate.fields !== "object" || Array.isArray(candidate.fields)) {
    issues.push({
      fieldId: null,
      code: "invalid_schema",
      message: "Extraction result fields must be an object",
    });
    return { valid: false, issues };
  }

  const definitions = new Map(schema.fields.map((field) => [field.id, field] as const));

  for (const definition of schema.fields) {
    const field = candidate.fields[definition.id];
    if (!field) {
      if (definition.required) {
        issues.push({
          fieldId: definition.id,
          code: "missing_field",
          message: `Missing required extraction field ${definition.id}`,
        });
      }
      continue;
    }

    if (
      typeof field !== "object" ||
      !Number.isFinite(field.confidence) ||
      field.confidence < 0 ||
      field.confidence > 1
    ) {
      issues.push({
        fieldId: definition.id,
        code: "invalid_confidence",
        message: `${definition.id} confidence must be between 0 and 1`,
      });
      continue;
    }

    const valueError = validateFieldValue(definition, field.value);
    if (valueError) {
      issues.push({
        fieldId: definition.id,
        code: "invalid_field",
        message: `${definition.id}: ${valueError}`,
      });
    }

    const hasValue = field.value !== null && field.value !== undefined;
    if (hasValue && definition.sourceRequired !== false) {
      if (!field.source) {
        issues.push({
          fieldId: definition.id,
          code: "missing_source",
          message: `${definition.id} requires source evidence`,
        });
      } else {
        const sourceIssue = validateSource(definition.id, field.source);
        if (sourceIssue) issues.push(sourceIssue);
      }
    } else if (field.source) {
      const sourceIssue = validateSource(definition.id, field.source);
      if (sourceIssue) issues.push(sourceIssue);
    }
  }

  if (schema.strict !== false) {
    for (const fieldId of Object.keys(candidate.fields)) {
      if (!definitions.has(fieldId)) {
        issues.push({
          fieldId,
          code: "unknown_field",
          message: `Unknown extraction field ${fieldId}`,
        });
      }
    }
  }

  return issues.length
    ? { valid: false, issues }
    : { valid: true, issues: [], value: candidate as StructuredDocumentExtraction };
}

export class ExtractionSchemaRegistry {
  private readonly schemas = new Map<string, Readonly<DocumentExtractionSchema>>();

  register(schema: DocumentExtractionSchema): this {
    const validated = createDocumentExtractionSchema(schema);
    if (this.schemas.has(validated.id)) {
      throw new Error(`Extraction schema already registered: ${validated.id}`);
    }
    this.schemas.set(validated.id, validated);
    return this;
  }

  has(id: string): boolean {
    return this.schemas.has(id);
  }

  get(id: string): Readonly<DocumentExtractionSchema> {
    const schema = this.schemas.get(id);
    if (!schema) throw new Error(`Unknown extraction schema: ${id}`);
    return schema;
  }

  list(): readonly Readonly<DocumentExtractionSchema>[] {
    return [...this.schemas.values()];
  }
}

export function buildExtractionInstruction(
  schema: DocumentExtractionSchema,
): string {
  const fields = schema.fields
    .map((field) => {
      const allowed = field.allowedValues?.length
        ? ` Allowed values: ${field.allowedValues.join(", ")}.`
        : "";
      return `- ${field.id} (${field.type}, ${field.required ? "required" : "optional"}): ${field.description}.${allowed}`;
    })
    .join("\n");

  return [
    `Extract values using schemaId "${schema.id}".`,
    "Do not infer a value that is not supported by the document. Use null for missing optional values.",
    "For every non-null value, return confidence from 0 to 1 and source { page, excerpt } using the smallest useful source excerpt.",
    "Return no fields that are not defined by the schema.",
    "Fields:",
    fields,
  ].join("\n");
}
