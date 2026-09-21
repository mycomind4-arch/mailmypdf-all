import {
  assessObligationAndValue,
  type ObligationValueAssessment,
  type ValueEvidenceKind,
} from "@mailmypdf/secured-transactions";
import type { ObligationTermField, ObligationTermValue } from "@mailmypdf/identity-capacity";

export type ObligationValueSourceType =
  | "executed-contract"
  | "invoice"
  | "bank-record"
  | "court-order"
  | "agency-notice"
  | "other";

export interface ObligationValueInput {
  obligationId: string;
  creditor: string;
  obligor: string;
  obligationType: string;
  principalAmount?: number;
  currency?: string;
  valueKind?: ValueEvidenceKind;
  valueDescription?: string;
  sourceId: string;
  sourceType: ObligationValueSourceType;
  sourceLabel?: string;
  valueEffect: "supports" | "contradicts";
}

const REQUIRED_FIELDS: readonly ObligationTermField[] = [
  "creditor-entity-id",
  "obligor-entity-id",
  "obligation-type",
];

export function assessObligationValue(input: ObligationValueInput): ObligationValueAssessment {
  const sourceId = input.sourceId.trim();
  const source = {
    id: sourceId,
    sourceType: input.sourceType,
    provenanceLevel: input.sourceType === "other" ? "user_provided" as const : "document_extracted" as const,
  };
  const fields: Array<[ObligationTermField, string]> = [
    ["creditor-entity-id", input.creditor.trim()],
    ["obligor-entity-id", input.obligor.trim()],
    ["obligation-type", input.obligationType.trim()],
  ];
  if (input.principalAmount !== undefined) fields.push(["principal-amount", String(input.principalAmount)]);
  if (input.currency?.trim()) fields.push(["currency", input.currency.trim()]);

  const obligationClaims = sourceId
    ? fields
        .filter(([, value]) => value.length > 0)
        .map(([field, value], index) => ({
          id: `obligation-term-${index + 1}`,
          obligationId: input.obligationId,
          field,
          value: value as ObligationTermValue,
          effect: "supports" as const,
          source,
        }))
    : [];
  const valueClaims = input.valueKind && sourceId
    ? [{
        id: "value-evidence-1",
        kind: input.valueKind,
        effect: input.valueEffect,
        sourceRefs: [sourceId],
        ...(input.principalAmount !== undefined ? { amount: input.principalAmount } : {}),
        ...(input.currency?.trim() ? { currency: input.currency.trim() } : {}),
        ...(input.valueDescription?.trim() ? { description: input.valueDescription.trim() } : {}),
      }]
    : [];

  return assessObligationAndValue({
    obligationId: input.obligationId,
    requiredObligationFields: REQUIRED_FIELDS,
    obligationClaims,
    valueClaims,
  });
}
