import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  generateActionQueue,
  PRIORITY_META,
} from "../src/domain/next-action.ts";

describe("Next Best Action Engine", () => {
  it("generates actions for a case with blocking missing info", () => {
    const actions = generateActionQueue({
      readinessState: "blocked",
      readinessScore: 20,
      missingInfo: [
        { status: "missing", impact: "blocking", label: "Response deadline", whyItMatters: "Determines urgency", field: "deadline" },
      ],
      contradictions: [],
      facts: [],
      evidenceCount: 0,
      hasDraft: false,
      draftPlaceholders: 0,
    });
    assert.ok(actions.length > 0);
    assert.equal(actions[0].priority, "critical");
    assert.match(actions[0].title, /deadline/i);
    assert.match(actions[0].impact, /Blocking/);
  });

  it("generates critical action for expired deadline", () => {
    const actions = generateActionQueue({
      readinessState: "blocked",
      readinessScore: 10,
      deadlineUrgency: "expired",
      deadlineDaysRemaining: -5,
      missingInfo: [],
      contradictions: [],
      facts: [],
      evidenceCount: 0,
      hasDraft: false,
      draftPlaceholders: 0,
    });
    assert.ok(actions.some((a) => a.priority === "critical" && a.category === "deadline"));
  });

  it("generates high action for critical deadline (1-3 days)", () => {
    const actions = generateActionQueue({
      readinessState: "urgent",
      readinessScore: 60,
      deadlineUrgency: "critical",
      deadlineDaysRemaining: 2,
      missingInfo: [],
      contradictions: [],
      facts: [],
      evidenceCount: 1,
      hasDraft: false,
      draftPlaceholders: 0,
    });
    const deadlineAction = actions.find((a) => a.category === "deadline");
    assert.ok(deadlineAction);
    assert.equal(deadlineAction.priority, "high");
    assert.match(deadlineAction.title, /2 day/);
  });

  it("generates actions for unresolved contradictions", () => {
    const actions = generateActionQueue({
      readinessState: "needs_review",
      readinessScore: 50,
      missingInfo: [],
      contradictions: [
        { status: "unresolved", severity: "critical", field: "notice_date", description: "Two different dates found" },
      ],
      facts: [],
      evidenceCount: 1,
      hasDraft: false,
      draftPlaceholders: 0,
    });
    assert.ok(actions.some((a) => a.priority === "critical" && a.category === "contradiction"));
  });

  it("generates fact verification actions", () => {
    const actions = generateActionQueue({
      readinessState: "needs_review",
      readinessScore: 50,
      missingInfo: [],
      contradictions: [],
      facts: [
        { confidence: "medium", userConfirmed: false, label: "Amount Owed" },
      ],
      evidenceCount: 1,
      hasDraft: false,
      draftPlaceholders: 0,
    });
    assert.ok(actions.some((a) => a.category === "fact" && a.title.includes("Amount Owed")));
  });

  it("suggests evidence upload when none attached", () => {
    const actions = generateActionQueue({
      readinessState: "incomplete",
      readinessScore: 30,
      missingInfo: [],
      contradictions: [],
      facts: [],
      evidenceCount: 0,
      hasDraft: false,
      draftPlaceholders: 0,
    });
    assert.ok(actions.some((a) => a.category === "evidence"));
  });

  it("flags draft placeholders as high priority", () => {
    const actions = generateActionQueue({
      readinessState: "needs_review",
      readinessScore: 60,
      missingInfo: [],
      contradictions: [],
      facts: [],
      evidenceCount: 1,
      hasDraft: true,
      draftPlaceholders: 3,
    });
    const responseAction = actions.find((a) => a.category === "response");
    assert.ok(responseAction);
    assert.equal(responseAction.priority, "high");
    assert.match(responseAction.title, /3 placeholder/);
  });

  it("sorts actions by priority", () => {
    const actions = generateActionQueue({
      readinessState: "blocked",
      readinessScore: 10,
      missingInfo: [
        { status: "missing", impact: "blocking", label: "Agency", whyItMatters: "Needed", field: "agency" },
        { status: "missing", impact: "medium", label: "Evidence", whyItMatters: "Helpful", field: "evidence" },
      ],
      contradictions: [],
      facts: [],
      evidenceCount: 0,
      hasDraft: false,
      draftPlaceholders: 0,
    });
    const priorities = actions.map((a) => a.priority);
    assert.ok(priorities.indexOf("critical") <= priorities.indexOf("medium"));
  });

  it("has metadata for all priority levels", () => {
    assert.ok(PRIORITY_META.critical);
    assert.ok(PRIORITY_META.high);
    assert.ok(PRIORITY_META.medium);
    assert.ok(PRIORITY_META.low);
  });

  it("generates no actions for a complete ready case", () => {
    const actions = generateActionQueue({
      readinessState: "ready",
      readinessScore: 100,
      deadlineUrgency: "comfortable",
      deadlineDaysRemaining: 60,
      missingInfo: [],
      contradictions: [],
      facts: [],
      evidenceCount: 3,
      hasDraft: true,
      draftPlaceholders: 0,
    });
    assert.equal(actions.length, 0);
  });
});
