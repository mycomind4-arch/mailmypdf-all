import { describe, expect, it } from "vitest";
import {
  executeCompoundCapability,
  resolveCompoundCapabilityBinding,
} from "./compound-capability-executor";

describe("compound capability executor", () => {
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

  it("blocks authority work honestly when no live authority provider is configured", async () => {
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
    expect(result.provider).toBe("authority:null");
  });
});
