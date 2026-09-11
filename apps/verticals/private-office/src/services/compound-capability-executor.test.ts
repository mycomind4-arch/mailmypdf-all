import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LLMAdapter } from "@/platform/llm-adapter";
import { _resetAdapters, _setAdapter } from "@/platform/llm-router";
import { _resetLLMConfig } from "@/platform/llm-config";
import {
  _resetAuthorityProvider,
  _setAuthorityProvider,
  type AuthorityProvider,
} from "@/platform/authority-provider";
import {
  executeCompoundCapability,
  resolveCompoundCapabilityBinding,
} from "./compound-capability-executor";

const providerEnvKeys = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_AI_API_KEY",
  "LLM_PROVIDER",
] as const;
const originalProviderEnv = Object.fromEntries(
  providerEnvKeys.map((key) => [key, process.env[key]]),
);

function clearProviderEnv() {
  for (const key of providerEnvKeys) delete process.env[key];
  _resetLLMConfig();
  _resetAdapters();
}

function mockAdapter(content: string): LLMAdapter {
  return {
    provider: "anthropic",
    async generate() {
      return {
        content,
        provenance: {
          provider: "anthropic",
          model: "claude-test",
          generatedAt: "2026-09-11T04:30:00.000Z",
          inputHash: "a".repeat(64),
        },
      };
    },
  };
}

describe("compound capability executor", () => {
  beforeEach(() => {
    clearProviderEnv();
  });

  afterEach(() => {
    clearProviderEnv();
    for (const key of providerEnvKeys) {
      const value = originalProviderEnv[key];
      if (value !== undefined) process.env[key] = value;
    }
    _resetLLMConfig();
    _resetAdapters();
    _resetAuthorityProvider();
  });
  it("maps timeline work to the canonical timeline capability", () => {
    const binding = resolveCompoundCapabilityBinding(
      "government-accusation-defense",
      "timeline reconstruction",
    );
    expect(binding.canonicalCapabilityId).toBe("timeline");
    expect(binding.adapterId).toBe("court-procedure");
    expect(binding.executable).toBe("deterministic");
  });

  it("uses the records adapter for public-record work", () => {
    const binding = resolveCompoundCapabilityBinding(
      "government-accountability-investigation",
      "public records request",
    );
    expect(binding.adapterId).toBe("records");
  });

  it("reconstructs a deterministic timeline without inventing dates", async () => {
    const result = await executeCompoundCapability({
      workflowId: "government-accountability-investigation",
      matterId: "matter-1",
      phaseId: "reconstruct-events",
      capabilityLabel: "timeline reconstruction",
      timelineEvents: [
        {
          eventType: "agency_notice",
          date: "2026-09-01",
          description: "Notice received",
          provenanceLevel: "user_provided",
        },
        {
          eventType: "hearing",
          date: "2026-09-20",
          description: "Hearing date stated in notice",
          provenanceLevel: "document_extracted",
        },
      ],
    });
    expect(result.status).toBe("completed");
    expect(result.provider).toBe("@mailmypdf/intelligence");
    const output = result.output as { events: Array<{ date: string }> };
    expect(output.events.map((event) => event.date)).toEqual([
      "2026-09-01",
      "2026-09-20",
    ]);
  });

  it("refuses to invent a timeline when no events are supplied", async () => {
    const result = await executeCompoundCapability({
      workflowId: "government-accountability-investigation",
      matterId: "matter-1",
      phaseId: "reconstruct-events",
      capabilityLabel: "timeline reconstruction",
    });
    expect(result.status).toBe("blocked");
    expect(result.messages.join(" ")).toMatch(/requires at least one structured event/i);
  });

  it("blocks deadline computation without an explicit rule", async () => {
    const result = await executeCompoundCapability({
      workflowId: "government-accusation-defense",
      matterId: "matter-1",
      phaseId: "triage-authority",
      capabilityLabel: "deadline extraction",
      timelineEvents: [
        {
          eventType: "notice_received",
          date: "2026-09-01",
          provenanceLevel: "document_extracted",
        },
      ],
    });
    expect(result.canonicalCapabilityId).toBe("deadlines");
    expect(result.status).toBe("blocked");
    expect(result.messages.join(" ")).toMatch(/will not invent a legal deadline rule/i);
  });

  it("computes a deadline only from an explicit rule and matching trigger", async () => {
    const result = await executeCompoundCapability({
      workflowId: "government-accusation-defense",
      matterId: "matter-1",
      phaseId: "triage-authority",
      capabilityLabel: "deadline extraction",
      currentDate: "2026-09-10",
      timelineEvents: [
        {
          eventType: "notice_received",
          date: "2026-09-01",
          provenanceLevel: "document_extracted",
        },
      ],
      deadlineRules: [
        {
          name: "response-window",
          description: "Test response window",
          triggerEventType: "notice_received",
          days: 30,
          calendarType: "calendar",
          deadlineEventType: "response_due",
          authority: "user-supplied test authority",
          provenanceLevel: "user_provided",
        },
      ],
    });
    expect(result.status).toBe("completed");
    const output = result.output as {
      deadlines: Array<{ result: { date: string }; status: string }>;
      authorityVerified: boolean;
    };
    expect(output.deadlines[0]?.result.date).toBe("2026-10-01");
    expect(output.authorityVerified).toBe(false);
  });

  it("does not treat a client-labeled external deadline rule as verified authority without a source reference", async () => {
    const result = await executeCompoundCapability({
      workflowId: "government-accusation-defense",
      matterId: "matter-1",
      phaseId: "triage-authority",
      capabilityLabel: "deadline extraction",
      verifiedByActorId: "user-123",
      timelineEvents: [
        {
          eventType: "notice_received",
          date: "2026-09-01",
          provenanceLevel: "document_extracted",
        },
      ],
      deadlineRules: [
        {
          name: "response-window",
          description: "Client-labeled external rule",
          triggerEventType: "notice_received",
          days: 30,
          calendarType: "calendar",
          deadlineEventType: "response_due",
          authority: "claimed external authority",
          provenanceLevel: "external_source",
        },
      ],
    });
    expect(result.status).toBe("completed");
    const output = result.output as { authorityVerified: boolean };
    expect(output.authorityVerified).toBe(false);
  });

  it("detects conflicting structured facts", async () => {
    const result = await executeCompoundCapability({
      workflowId: "government-accusation-defense",
      matterId: "matter-1",
      phaseId: "timeline-contradictions",
      capabilityLabel: "contradiction analyzer",
      facts: [
        {
          subject: "hearing",
          predicate: "hearing_date",
          value: "2026-09-20",
          provenanceLevel: "document_extracted",
        },
        {
          subject: "hearing",
          predicate: "hearing_date",
          value: "2026-09-22",
          provenanceLevel: "user_provided",
        },
      ],
    });
    expect(result.status).toBe("completed");
    const output = result.output as { contradictions: unknown[] };
    expect(output.contradictions).toHaveLength(1);
  });

  it("marks evidence human-verified only after explicit authenticated verification", async () => {
    const result = await executeCompoundCapability({
      workflowId: "government-accusation-defense",
      matterId: "matter-1",
      phaseId: "proof-elements",
      capabilityLabel: "evidence matrix",
      verifyEvidenceInputs: true,
      verifiedByActorId: "user-123",
      evidence: [
        {
          claimId: "claim-1",
          relation: "supports",
          evidenceType: "document",
          evidenceId: "notice-pdf",
          explanation: "Reviewed source notice",
        },
      ],
    });

    expect(result.status).toBe("completed");
    const output = result.output as {
      evidence: Array<{
        verified: boolean;
        provenance: { level: string; verifiedBy?: string };
      }>;
    };
    expect(output.evidence[0]?.verified).toBe(true);
    expect(output.evidence[0]?.provenance.level).toBe("human_verified");
    expect(output.evidence[0]?.provenance.verifiedBy).toBe("user-123");
  });

  it("stores schema-valid AI classification as inferred, never verified", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    _resetLLMConfig();
    _setAdapter(
      "anthropic",
      mockAdapter(
        JSON.stringify({
          type: "agency enforcement notice",
          confidence: 0.91,
          reasoning: "The supplied context describes an agency notice.",
          provenance: "llm_generated",
        }),
      ),
    );

    const result = await executeCompoundCapability({
      workflowId: "government-accusation-defense",
      matterId: "matter-1",
      phaseId: "triage-authority",
      capabilityLabel: "accusation triage",
      context: "An agency issued a notice concerning the property.",
    });

    expect(result.status).toBe("completed");
    expect(result.provenance).toBe("ai_inferred");
    expect(result.provider).toContain("llm:anthropic:claude-test");
  });

  it("rejects malformed AI output instead of entering it into domain state", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    _resetLLMConfig();
    _setAdapter("anthropic", mockAdapter("not-json"));

    const result = await executeCompoundCapability({
      workflowId: "government-accusation-defense",
      matterId: "matter-1",
      phaseId: "triage-authority",
      capabilityLabel: "accusation triage",
      context: "Supplied matter context.",
    });

    expect(result.status).toBe("failed");
    expect(result.output).toBeNull();
    expect(result.messages.join(" ")).toMatch(/schema validation/i);
  });

  it("blocks advisory AI cleanly when no provider is configured", async () => {
    const result = await executeCompoundCapability({
      workflowId: "government-accusation-defense",
      matterId: "matter-1",
      phaseId: "triage-authority",
      capabilityLabel: "accusation triage",
      context: "Supplied matter context.",
    });

    expect(result.status).toBe("blocked");
    expect(result.provider).toBe("llm:none");
  });

  it("blocks authority work honestly when no official source URL is supplied", async () => {
    const result = await executeCompoundCapability({
      workflowId: "government-accountability-investigation",
      matterId: "matter-1",
      phaseId: "agency-authority",
      capabilityLabel: "authority audit",
      context: "Determine the asserted agency authority.",
      jurisdiction: "California",
    });
    expect(result.canonicalCapabilityId).toBe("research");
    expect(result.status).toBe("blocked");
    expect(result.provider).toBe("authority:official-source");
    expect(result.provenance).toBe("system_generated");
  });

  it("passes explicit source URLs through the authority provider", async () => {
    let receivedUrls: readonly string[] | undefined;
    const provider: AuthorityProvider = {
      name: "test-authority",
      async research(request) {
        receivedUrls = request.sourceUrls;
        return {
          researchPerformed: true,
          citations: [
            {
              title: "Official source",
              type: "guidance",
              reference: "https://agency.ca.gov/rule",
              summary: "Retrieved source",
              url: "https://agency.ca.gov/rule",
            },
          ],
          failures: [],
          disclaimer: "Source retrieved.",
          provenance: "externally_sourced",
        };
      },
    };
    _setAuthorityProvider(provider);

    const result = await executeCompoundCapability({
      workflowId: "government-accountability-investigation",
      matterId: "matter-1",
      phaseId: "agency-authority",
      capabilityLabel: "authority audit",
      context: "Determine the asserted agency authority.",
      sourceUrls: ["https://agency.ca.gov/rule"],
    });

    expect(receivedUrls).toEqual(["https://agency.ca.gov/rule"]);
    expect(result.status).toBe("completed");
    expect(result.provenance).toBe("externally_sourced");
  });

  it("blocks risk assessment when there is not enough intelligence to assess", async () => {
    const result = await executeCompoundCapability({
      workflowId: "government-accusation-defense",
      matterId: "matter-1",
      phaseId: "triage-authority",
      capabilityLabel: "consequence classification",
    });
    expect(result.canonicalCapabilityId).toBe("risk");
    expect(result.status).toBe("blocked");
    expect((result.output as { overallRisk: string }).overallRisk).toBe("unknown");
  });
});
