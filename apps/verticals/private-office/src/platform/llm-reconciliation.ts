/**
 * LLM Reconciliation Layer
 *
 * Reconciles outputs from multiple LLM providers into a canonical
 * representation that clearly distinguishes:
 *   - agreement (confirmed)
 *   - disagreement (conflicting)
 *   - uncertainty (requires_verification)
 *   - unsupported assertions (unsupported)
 *   - provider-specific claims (provider_specific)
 *
 * Does NOT simply majority-vote raw text. Instead, it extracts structured
 * claims from each provider and reconciles them.
 *
 * Also handles FACT PROTECTION: LLM output never overwrites user-provided
 * facts. Conflicts are surfaced as explicit findings.
 */

import type {
  LLMProviderId,
  ProviderClaim,
  ReconciledClaim,
  ReconciliationResult,
} from "./llm-types";
import type { LLMExtractedFact } from "./llm-schemas";
import type { MatterFinding } from "@/domain/gold-standard";

// ── Fact Protection ──────────────────────────────────────────────────────

export interface FactConflict {
  label: string;
  userValue: string;
  llmValue: string;
  llmProvider: LLMProviderId;
  llmModel: string;
  status: "requires_verification";
}

/**
 * Compare user-provided facts with LLM-extracted facts.
 * Never overwrites user-provided values. Surfaces conflicts explicitly.
 *
 * Returns:
 *   - facts that are new (not in user-provided) → can be added with llm_generated provenance
 *   - facts that conflict with user-provided → must be surfaced as conflicts
 *   - facts that agree with user-provided → confirmation
 */
export function reconcileFacts(
  userFacts: Array<{ label: string; value: string }>,
  llmFacts: LLMExtractedFact[],
  llmProvider: LLMProviderId,
  llmModel: string,
): {
  newFacts: LLMExtractedFact[];
  conflicts: FactConflict[];
  confirmedFacts: Array<{ label: string; value: string }>;
} {
  const userFactMap = new Map(
    userFacts.map((f) => [normalizeLabel(f.label), f.value]),
  );

  const newFacts: LLMExtractedFact[] = [];
  const conflicts: FactConflict[] = [];
  const confirmedFacts: Array<{ label: string; value: string }> = [];

  for (const llmFact of llmFacts) {
    const normalized = normalizeLabel(llmFact.label);
    const userValue = userFactMap.get(normalized);

    if (userValue === undefined) {
      // New fact from LLM — not in user-provided, safe to add
      newFacts.push(llmFact);
    } else if (
      normalizeValue(userValue) === normalizeValue(llmFact.value)
    ) {
      // Agreement — confirm
      confirmedFacts.push({ label: llmFact.label, value: llmFact.value });
    } else {
      // CONFLICT — user said one thing, LLM said another
      conflicts.push({
        label: llmFact.label,
        userValue,
        llmValue: llmFact.value,
        llmProvider,
        llmModel,
        status: "requires_verification",
      });
    }
  }

  return { newFacts, conflicts, confirmedFacts };
}

/**
 * Convert fact conflicts into MatterFindings for the deterministic engine.
 */
export function conflictsToFindings(conflicts: FactConflict[]): MatterFinding[] {
  return conflicts.map((conflict, idx) => ({
    id: `fact-conflict-${idx}`,
    state: "requires_verification" as const,
    title: `Fact conflict: ${conflict.label}`,
    detail: `User provided "${conflict.userValue}" but ${conflict.llmProvider}/${conflict.llmModel} extracted "${conflict.llmValue}". Verify the correct value.`,
    severity: "high" as const,
    sourceExcerpt: `user_provided: ${conflict.userValue} | llm_generated: ${conflict.llmValue}`,
  }));
}

// ── Multi-Provider Claim Reconciliation ──────────────────────────────────

/**
 * Reconcile claims from multiple providers.
 *
 * Claims are compared by normalized content. If all providers agree,
 * the claim is "confirmed". If they disagree, the claim is "conflicting".
 * If only one provider makes a claim, it's "provider_specific".
 */
export function reconcileClaims(
  providerClaims: Array<{ provider: LLMProviderId; model: string; claims: string[] }>,
): ReconciliationResult {
  const claimMap = new Map<
    string,
    { claim: string; providers: ProviderClaim[] }
  >();

  for (const { provider, model, claims } of providerClaims) {
    for (const claim of claims) {
      const normalized = normalizeValue(claim);
      if (!claimMap.has(normalized)) {
        claimMap.set(normalized, { claim, providers: [] });
      }
      claimMap.get(normalized)!.providers.push({
        provider,
        model,
        claim,
        confidence: 1.0, // Individual provider confidence not available at this level
      });
    }
  }

  const reconciledClaims: ReconciledClaim[] = [];
  let conflictsDetected = false;
  let unanimous = true;
  const totalProviders = providerClaims.length;

  for (const [, { claim, providers }] of claimMap) {
    const agreeingProviderIds = providers.map((p) => p.provider);
    const conflictingProviderIds = totalProviders > 1
      ? providerClaims
          .filter((pc) => !agreeingProviderIds.includes(pc.provider))
          .map((pc) => pc.provider)
      : [];

    let status: ReconciledClaim["status"];
    if (conflictingProviderIds.length > 0) {
      status = "conflicting";
      conflictsDetected = true;
      unanimous = false;
    } else if (providers.length === totalProviders && totalProviders > 1) {
      status = "confirmed";
    } else if (providers.length === 1) {
      status = "provider_specific";
      unanimous = false;
    } else {
      status = "requires_verification";
      unanimous = false;
    }

    reconciledClaims.push({
      claim,
      status,
      confidence: providers.length / totalProviders,
      agreeingProviders: agreeingProviderIds,
      conflictingProviders: conflictingProviderIds,
      allClaims: providers,
    });
  }

  return {
    claims: reconciledClaims,
    unanimous,
    conflictsDetected,
    providersConsulted: providerClaims.map((p) => p.provider),
  };
}

// ── Timeline Reconciliation ─────────────────────────────────────────────

export interface ReconciledTimelineEvent {
  event: string;
  date?: string;
  description: string;
  source: string;
  confidence: number;
  verificationStatus: "confirmed" | "conflicting" | "requires_verification";
  sources: Array<{ source: string; date?: string }>;
}

/**
 * Reconcile timeline events from multiple sources:
 *   - deterministic (regex) extraction
 *   - LLM extraction
 *   - user-provided facts
 *
 * Events with the same date are grouped. Conflicting dates for the same
 * event are flagged.
 */
export function reconcileTimeline(
  sources: Array<{
    source: string;
    events: Array<{ event: string; date?: string; description: string }>;
  }>,
): ReconciledTimelineEvent[] {
  const eventMap = new Map<
    string,
    ReconciledTimelineEvent
  >();

  for (const { source, events } of sources) {
    for (const event of events) {
      const key = normalizeValue(event.event);
      const existing = eventMap.get(key);

      if (!existing) {
        eventMap.set(key, {
          event: event.event,
          date: event.date,
          description: event.description,
          source,
          confidence: 0.5,
          verificationStatus: "requires_verification",
          sources: [{ source, date: event.date }],
        });
      } else {
        existing.sources.push({ source, date: event.date });
        // If dates conflict, mark as conflicting
        if (
          event.date &&
          existing.date &&
          normalizeValue(event.date) !== normalizeValue(existing.date)
        ) {
          existing.verificationStatus = "conflicting";
        } else if (
          existing.verificationStatus === "requires_verification" &&
          existing.sources.length >= 2
        ) {
          // Two sources agree
          existing.verificationStatus = "confirmed";
          existing.confidence = 0.8;
        }
      }
    }
  }

  return Array.from(eventMap.values());
}

// ── Helpers ─────────────────────────────────────────────────────────────

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeValue(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}
