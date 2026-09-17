import type { OfficialFormDefinition, OfficialFormDocument } from "./definition";

export function missingRequiredOfficialForms<Kind extends string>(
  documents: readonly OfficialFormDocument[],
  requiredForms: readonly OfficialFormDefinition<Kind>[],
): OfficialFormDefinition<Kind>[] {
  return requiredForms.filter(
    (form) =>
      !documents.some(
        (document) =>
          document.evidence_kind === form.kind &&
          document.included &&
          document.usable &&
          document.security_status === "clean",
      ),
  );
}

export function hasRequiredOfficialForms<Kind extends string>(
  documents: readonly OfficialFormDocument[],
  requiredForms: readonly OfficialFormDefinition<Kind>[],
): boolean {
  return requiredForms.length > 0 && missingRequiredOfficialForms(documents, requiredForms).length === 0;
}

export function assertRequiredOfficialForms<Kind extends string>(
  documents: readonly OfficialFormDocument[],
  requiredForms: readonly OfficialFormDefinition<Kind>[],
): void {
  const missing = missingRequiredOfficialForms(documents, requiredForms);
  if (!requiredForms.length) throw new Error("No official forms were resolved for this workflow state.");
  if (missing.length) {
    throw new Error(`Required official forms are missing or not clean/included: ${missing.map((form) => form.formNumber).join(", ")}`);
  }
}
