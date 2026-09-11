import {
  createEvidence,
  createEvidencePacket,
  createFact,
  createTimeline,
  createTimelineEvent,
  detectContradictions,
  detectGaps,
  evaluateEvidence,
  conflictingDates,
  computeRiskAssessment,
  sortBySeverity,
  sortedByDate,
  type EvidenceRelation,
  type ProvenanceLevel,
} from "../../../../../packages/intelligence/src/index";
import {
  CAPABILITIES,
  type CapabilityId,
} from "../../../../../packages/workflows/src/capability-registry";
import {
  ADAPTERS,
  type AdapterId,
} from "../../../../../packages/workflows/src/adapter-registry";
import { getAuthorityProvider } from "@/platform/authority-provider";
import type { CompoundWorkflowId } from "@/domain/compound-workflows";
import type {
  CompoundCapabilityRun,
  CompoundCapabilityRunStatus,
} from "@/domain/compound-workflow-runtime";

export type CompoundStructuredFactInput = {
  subject: string;
  predicate: string;
  value: string;
  provenanceLevel?: ProvenanceLevel;
  confidence?: number;
};

export type CompoundTimelineEventInput = {
  eventType: string;
  date?: string;
  dateEnd?: string;
  description?: string;
  provenanceLevel?: ProvenanceLevel;
  confidence?: number;
};

export type CompoundEvidenceInput = {
  claimId: string;
  relation: EvidenceRelation;
  evidenceType: "document" | "fact" | "entity" | "external";
  evidenceId: string;
  explanation?: string;
  provenanceLevel?: ProvenanceLevel;
  confidence?: number;
};

export type CompoundCapabilityExecutionInput = {
  workflowId: CompoundWorkflowId;
  matterId: string;
  phaseId: string;
  capabilityLabel: string;
  context?: string;
  jurisdiction?: string;
  currentDate?: string;
  facts?: readonly CompoundStructuredFactInput[];
  timelineEvents?: readonly CompoundTimelineEventInput[];
  evidence?: readonly CompoundEvidenceInput[];
};

export type CompoundCapabilityBinding = {
  canonicalCapabilityId: CapabilityId;
  adapterId: AdapterId;
  executable:
    | "deterministic"
    | "authority-provider"
    | "not-yet-wired";
  reason: string;
};

function includesAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => value.includes(term));
}

export function resolveCompoundCapabilityBinding(
  workflowId: CompoundWorkflowId,
  capabilityLabel: string,
): CompoundCapabilityBinding {
  const label = capabilityLabel.toLowerCase();

  let canonicalCapabilityId: CapabilityId = "requirements";
  if (includesAny(label, ["timeline", "chronology"])) canonicalCapabilityId = "timeline";
  else if (includesAny(label, ["deadline", "limitation", "calendar"])) canonicalCapabilityId = "deadlines";
  else if (includesAny(label, ["contradiction", "statement comparison", "compare statements"])) canonicalCapabilityId = "contradictions";
  else if (includesAny(label, ["evidence", "proof", "witness", "chain of custody"])) canonicalCapabilityId = "evidence";
  else if (includesAny(label, ["provenance", "source-linked", "source linked"])) canonicalCapabilityId = "provenance";
  else if (includesAny(label, ["risk", "consequence"])) canonicalCapabilityId = "risk";
  else if (includesAny(label, ["authority", "research", "jurisdiction", "statute", "policy", "manual"])) canonicalCapabilityId = "research";
  else if (includesAny(label, ["strategy", "planner", "planning", "handoff", "hearing preparation", "courtroom"])) canonicalCapabilityId = "strategy";
  else if (includesAny(label, ["draft", "notice builder", "packet"])) canonicalCapabilityId = "draft";
  else if (includesAny(label, ["discrepancy", "anomaly", "mismatch"])) canonicalCapabilityId = "discrepancies";
  else if (includesAny(label, ["finding", "issue spotting", "issue map"])) canonicalCapabilityId = "findings";
  else if (includesAny(label, ["triage", "classification"])) canonicalCapabilityId = "classification";
  else if (includesAny(label, ["extract", "inventory", "identity graph", "relationship graph"])) canonicalCapabilityId = "extraction";

  let adapterId: AdapterId;
  if (includesAny(label, ["record", "custodian", "bodycam", "dispatch"])) {
    adapterId = "records";
  } else if (
    workflowId === "government-accusation-defense" ||
    includesAny(label, ["court", "warrant", "search", "seizure", "interrogation", "hearing", "elements", "discovery"])
  ) {
    adapterId = "court-procedure";
  } else if (includesAny(label, ["inspection", "permit", "regulatory", "compliance"])) {
    adapterId = "permits-regulatory";
  } else if (includesAny(label, ["contract", "business", "entity governance"])) {
    adapterId = "business";
  } else {
    adapterId = "government";
  }

  const executable =
    canonicalCapabilityId === "timeline" ||
    canonicalCapabilityId === "contradictions" ||
    canonicalCapabilityId === "evidence" ||
    canonicalCapabilityId === "risk"
      ? "deterministic"
      : canonicalCapabilityId === "research"
        ? "authority-provider"
        : "not-yet-wired";

  return {
    canonicalCapabilityId,
    adapterId,
    executable,
    reason: `${CAPABILITIES[canonicalCapabilityId].name} via ${ADAPTERS[adapterId].name}`,
  };
}

function provenance(level?: ProvenanceLevel): {
  level: ProvenanceLevel;
} {
  return { level: level ?? "user_provided" };
}

function buildFacts(input: CompoundCapabilityExecutionInput) {
  return (input.facts ?? []).map((fact) =>
    createFact({
      subject: fact.subject,
      predicate: fact.predicate,
      value: fact.value,
      provenance: provenance(fact.provenanceLevel),
      confidence: fact.confidence,
    }),
  );
}

function buildTimeline(input: CompoundCapabilityExecutionInput) {
  const events = (input.timelineEvents ?? []).map((event) =>
    createTimelineEvent({
      caseId: input.matterId,
      eventType: event.eventType,
      date: event.date,
      dateEnd: event.dateEnd,
      description: event.description,
      provenance: provenance(event.provenanceLevel),
      confidence: event.confidence,
    }),
  );
  return createTimeline(input.matterId, events);
}

function buildEvidence(input: CompoundCapabilityExecutionInput) {
  return (input.evidence ?? []).map((item) =>
    createEvidence({
      claimId: item.claimId,
      relation: item.relation,
      evidenceType: item.evidenceType,
      evidenceId: item.evidenceId,
      explanation: item.explanation,
      provenance: provenance(item.provenanceLevel),
      confidence: item.confidence,
    }),
  );
}

function resultRun(
  input: CompoundCapabilityExecutionInput,
  binding: CompoundCapabilityBinding,
  status: CompoundCapabilityRunStatus,
  provider: string,
  output: unknown,
  messages: readonly string[],
): CompoundCapabilityRun {
  return {
    id: crypto.randomUUID(),
    phaseId: input.phaseId,
    capabilityLabel: input.capabilityLabel,
    canonicalCapabilityId: binding.canonicalCapabilityId,
    adapterId: binding.adapterId,
    status,
    provider,
    provenance:
      binding.executable === "deterministic"
        ? "system_generated"
        : "externally_sourced",
    output,
    messages,
    executedAt: new Date().toISOString(),
  };
}

export async function executeCompoundCapability(
  input: CompoundCapabilityExecutionInput,
): Promise<CompoundCapabilityRun> {
  const binding = resolveCompoundCapabilityBinding(
    input.workflowId,
    input.capabilityLabel,
  );

  try {
    if (binding.canonicalCapabilityId === "timeline") {
      if (!input.timelineEvents?.length) {
        return resultRun(
          input,
          binding,
          "blocked",
          "@mailmypdf/intelligence",
          null,
          ["Timeline execution requires at least one structured event. No dates were invented."],
        );
      }
      const timeline = buildTimeline(input);
      const ordered = sortedByDate(timeline);
      return resultRun(
        input,
        binding,
        "completed",
        "@mailmypdf/intelligence",
        {
          events: ordered,
          gaps: detectGaps(timeline),
          dateConflicts: conflictingDates(timeline),
        },
        [`Reconstructed ${ordered.length} source-linked timeline event(s).`],
      );
    }

    if (binding.canonicalCapabilityId === "contradictions") {
      if (!input.facts || input.facts.length < 2) {
        return resultRun(
          input,
          binding,
          "blocked",
          "@mailmypdf/intelligence",
          null,
          ["Contradiction detection requires at least two structured facts."],
        );
      }
      const facts = buildFacts(input);
      const contradictions = sortBySeverity(
        detectContradictions(facts, { level: "rule_derived", ruleId: "compound-workflow-contradiction-detection" }),
      );
      return resultRun(
        input,
        binding,
        "completed",
        "@mailmypdf/intelligence",
        { facts, contradictions },
        [`Compared ${facts.length} fact(s); found ${contradictions.length} potential or confirmed contradiction(s).`],
      );
    }

    if (binding.canonicalCapabilityId === "evidence") {
      if (!input.evidence?.length) {
        return resultRun(
          input,
          binding,
          "blocked",
          "@mailmypdf/intelligence",
          null,
          ["Evidence evaluation requires structured evidence items."],
        );
      }
      const evidence = buildEvidence(input);
      const claimIds = [...new Set(evidence.map((item) => String(item.claimId)))];
      const evaluations = claimIds.map((claimId) => {
        const packet = createEvidencePacket(
          claimId,
          evidence.filter((item) => String(item.claimId) === claimId),
        );
        return { claimId, evaluation: evaluateEvidence(packet) };
      });
      return resultRun(
        input,
        binding,
        "completed",
        "@mailmypdf/intelligence",
        { evidence, evaluations },
        [`Evaluated ${evidence.length} evidence item(s) across ${claimIds.length} claim(s).`],
      );
    }

    if (binding.canonicalCapabilityId === "risk") {
      const facts = buildFacts(input);
      const contradictions =
        facts.length >= 2
          ? detectContradictions(facts, {
              level: "rule_derived",
              ruleId: "compound-workflow-risk-contradiction-detection",
            })
          : [];
      const timeline = buildTimeline(input);
      const evidence = buildEvidence(input);
      const assessment = computeRiskAssessment({
        caseId: input.matterId,
        findings: [],
        contradictions,
        evidenceItems: evidence,
        timelineEvents: timeline.events,
      });
      return resultRun(
        input,
        binding,
        "completed",
        "@mailmypdf/intelligence",
        assessment,
        [`Deterministic risk assessment: ${assessment.overallRisk} (${assessment.riskScore}/100).`],
      );
    }

    if (binding.canonicalCapabilityId === "research") {
      const provider = getAuthorityProvider();
      const authority = await provider.research({
        workflowId: input.workflowId,
        context: input.context?.trim() || input.capabilityLabel,
        jurisdiction: input.jurisdiction,
      });

      return resultRun(
        input,
        binding,
        authority.researchPerformed ? "completed" : "blocked",
        `authority:${provider.name}`,
        authority,
        [authority.disclaimer],
      );
    }

    return resultRun(
      input,
      binding,
      "blocked",
      "canonical-binding-only",
      {
        capability: CAPABILITIES[binding.canonicalCapabilityId],
        adapter: ADAPTERS[binding.adapterId],
      },
      [
        `The capability is mapped to the canonical platform contract but its executable adapter is not wired into compound orchestration yet: ${binding.reason}.`,
      ],
    );
  } catch (error) {
    return resultRun(
      input,
      binding,
      "failed",
      binding.executable === "deterministic"
        ? "@mailmypdf/intelligence"
        : "compound-capability-executor",
      null,
      [error instanceof Error ? error.message : String(error)],
    );
  }
}
