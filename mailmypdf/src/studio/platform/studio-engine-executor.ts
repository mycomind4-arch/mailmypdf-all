import { z } from "zod";
import { normalizeName, compareNormalizedNames } from "@mailmypdf/identity-capacity";
import { scanRecoveryTransactions } from "@mailmypdf/intelligence";
import type { RecoveryTransaction } from "@mailmypdf/intelligence";
import { buildExhibitIndex, renderExhibitIndex } from "@mailmypdf/packet-builder";
import {
  evaluateSecuredTransactionEligibility,
  SECURED_TRANSACTION_ELIGIBILITY_GATES,
  type SecuredTransactionEligibilityInput,
} from "@mailmypdf/secured-transactions";
import { studioRunnableEngines } from "../domain/studio-capability-catalog";

const shortText = z.string().trim().min(1).max(250);
const nameInput = z.object({
  name: shortText,
  compareTo: shortText.optional(),
}).strict();

const transaction = z.object({
  id: shortText,
  accountId: shortText,
  merchant: shortText,
  amountMinor: z.number().int().positive().safe(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  postedAt: z.string().datetime({ offset: true }),
  state: z.enum(["settled", "pending", "reversed"]),
  kind: z.enum(["debit", "credit"]),
  invoiceId: shortText.optional(),
  reversesTransactionId: shortText.optional(),
}).strict();
const recoveryInput = z.object({
  transactions: z.array(transaction).min(1).max(500),
  duplicateWindowHours: z.number().int().min(1).max(168).optional(),
}).strict();

const exhibitInput = z.object({
  items: z.array(z.object({
    evidenceId: shortText,
    label: shortText,
    pageRef: z.string().max(100).optional(),
    description: z.string().max(1000).optional(),
    include: z.boolean().optional(),
  }).strict()).min(1).max(60),
}).strict();

const eligibilityEvidence = z.object({
  status: z.enum(["verified", "unverified", "contradicted"]),
  sourceRefs: z.array(shortText).max(40),
  note: z.string().max(1000).optional(),
}).strict();
const eligibilityInput = z.object({
  evidence: z.record(eligibilityEvidence),
}).strict();

export class StudioEngineInputError extends Error {}

export type StudioEngineExecution = {
  engineId: string;
  packageName: string;
  executed: true;
  sideEffects: "none";
  output: unknown;
  limitations: readonly string[];
};

/**
 * Explicit allowlist of deterministic, side-effect-free engines.
 * Never reflect arbitrary package exports or execute caller-supplied code.
 */
export function executeStudioEngine(engineId: string, rawInput: unknown): StudioEngineExecution {
  const engine = studioRunnableEngines.find((entry) => entry.id === engineId);
  if (!engine) throw new StudioEngineInputError("No direct Studio executor is registered for that capability.");

  if (typeof rawInput !== "object" || rawInput === null || Array.isArray(rawInput)) {
    throw new StudioEngineInputError("Engine input must be a JSON object.");
  }

  try {
    switch (engineId) {
      case "studio.name-normalization": {
        const input = nameInput.parse(rawInput);
        return {
          engineId, packageName: engine.packageName, executed: true, sideEffects: "none",
          output: { normalized: normalizeName(input.name), comparison: input.compareTo ? compareNormalizedNames(input.name, input.compareTo) : null },
          limitations: ["Name-form comparison is not evidence of legal identity or ownership."],
        };
      }
      case "studio.recovery-scan": {
        const input = recoveryInput.parse(rawInput);
        return {
          engineId, packageName: engine.packageName, executed: true, sideEffects: "none",
          output: scanRecoveryTransactions(input.transactions as RecoveryTransaction[], { duplicateWindowHours: input.duplicateWindowHours }),
          limitations: ["Potential duplicate charges are not guaranteed refunds or established entitlements."],
        };
      }
      case "studio.exhibit-index": {
        const input = exhibitInput.parse(rawInput);
        const index = buildExhibitIndex(input.items);
        return {
          engineId, packageName: engine.packageName, executed: true, sideEffects: "none",
          output: { entries: index, text: renderExhibitIndex(index) },
          limitations: ["No PDF was produced, approved, filed, or mailed."],
        };
      }
      case "studio.secured-eligibility": {
        const input = eligibilityInput.parse(rawInput);
        const allowed = new Set<string>(SECURED_TRANSACTION_ELIGIBILITY_GATES);
        if (Object.keys(input.evidence).some((id) => !allowed.has(id))) {
          throw new StudioEngineInputError("Unknown secured-transaction gate ID.");
        }
        return {
          engineId, packageName: engine.packageName, executed: true, sideEffects: "none",
          output: evaluateSecuredTransactionEligibility(input.evidence as SecuredTransactionEligibilityInput),
          limitations: ["Readiness screening does not establish attachment, perfection, priority, or filing authorization."],
        };
      }
      default:
        throw new StudioEngineInputError("Studio executor is not available.");
    }
  } catch (error) {
    if (error instanceof StudioEngineInputError) throw error;
    if (error instanceof z.ZodError) {
      throw new StudioEngineInputError(error.issues.map((issue) => issue.path.join(".") + ": " + issue.message).join("; ").slice(0, 1200));
    }
    // Package validators must not be transformed into successful results.
    throw error;
  }
}
