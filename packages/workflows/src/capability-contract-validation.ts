import type { CapabilitySchema } from "./capability-registry.js";

export type CapabilityContractIssue = {
  path: string;
  code: "type" | "required" | "unknown_property" | "format";
  message: string;
};

function typeMatches(schemaType: CapabilitySchema["type"], value: unknown): boolean {
  if (schemaType === "unknown") return true;
  if (schemaType === "null") return value === null;
  if (schemaType === "array") return Array.isArray(value);
  if (schemaType === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (schemaType === "integer") return typeof value === "number" && Number.isInteger(value);
  return typeof value === schemaType;
}

function formatMatches(format: string | undefined, value: unknown): boolean {
  if (!format || typeof value !== "string") return true;
  if (format === "date-time") return !Number.isNaN(Date.parse(value));
  if (format === "sha256") return /^[a-f0-9]{64}$/i.test(value);
  if (format === "uri") {
    try { new URL(value); return true; } catch { return false; }
  }
  return true;
}

/** Small, dependency-free boundary validator for capability contracts. It is
 * intentionally conservative and leaves domain-specific validation to the
 * owning package. */
export function validateCapabilityValue(
  schema: CapabilitySchema,
  value: unknown,
  path = "$",
): readonly CapabilityContractIssue[] {
  const issues: CapabilityContractIssue[] = [];
  if (!typeMatches(schema.type, value)) {
    return [{ path, code: "type", message: `Expected ${schema.type}.` }];
  }
  if (!formatMatches(schema.format, value)) {
    issues.push({ path, code: "format", message: `Value does not match ${schema.format}.` });
  }
  if (schema.type === "object" && value !== null && typeof value === "object" && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in object)) issues.push({ path: `${path}.${key}`, code: "required", message: "Required property is missing." });
    }
    for (const [key, child] of Object.entries(object)) {
      const childSchema = schema.properties?.[key];
      if (!childSchema) {
        if (schema.additionalProperties === false) issues.push({ path: `${path}.${key}`, code: "unknown_property", message: "Unknown property is not permitted." });
        continue;
      }
      issues.push(...validateCapabilityValue(childSchema, child, `${path}.${key}`));
    }
  }
  if (schema.type === "array" && Array.isArray(value) && schema.items) {
    value.forEach((item, index) => issues.push(...validateCapabilityValue(schema.items!, item, `${path}[${index}]`)));
  }
  return issues;
}

export function assertCapabilityValue(schema: CapabilitySchema, value: unknown, label = "capability value"): void {
  const issues = validateCapabilityValue(schema, value);
  if (issues.length > 0) throw new Error(`${label} failed contract validation: ${issues.map((issue) => `${issue.path} ${issue.message}`).join("; ")}`);
}
