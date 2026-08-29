import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  createVoiceSettings,
  createSegment,
  buildScript,
  buildAnalysisNarration,
  buildDeadlineNarration,
  buildWalkthroughNarration,
  buildStrategyNarration,
  scriptToPlainText,
  filterByPriority,
} from "../src/domain/voice.ts";

describe("Voice Domain", () => {
  describe("Voice Settings", () => {
    it("creates default settings", () => {
      const settings = createVoiceSettings();
      assert.equal(settings.enabled, true);
      assert.equal(settings.rate, 1.0);
      assert.equal(settings.pitch, 1.0);
      assert.equal(settings.volume, 0.9);
      assert.equal(settings.autoNarrate, false);
      assert.equal(settings.narrateFindings, true);
      assert.equal(settings.dictationEnabled, true);
      assert.equal(settings.preferredGender, "any");
    });

    it("accepts partial overrides", () => {
      const settings = createVoiceSettings({ rate: 1.5, pitch: 0.8, autoNarrate: true });
      assert.equal(settings.rate, 1.5);
      assert.equal(settings.pitch, 0.8);
      assert.equal(settings.autoNarrate, true);
      assert.equal(settings.volume, 0.9); // default preserved
    });
  });

  describe("Narration Segments", () => {
    it("creates a segment with defaults", () => {
      const seg = createSegment("Hello world", "body");
      assert.equal(seg.text, "Hello world");
      assert.equal(seg.role, "body");
      assert.equal(seg.priority, "normal");
      assert.equal(seg.pauseAfter, 400);
      assert.ok(seg.id);
    });

    it("creates a segment with overrides", () => {
      const seg = createSegment("Alert!", "alert", { priority: "critical", pauseAfter: 1000 });
      assert.equal(seg.text, "Alert!");
      assert.equal(seg.role, "alert");
      assert.equal(seg.priority, "critical");
      assert.equal(seg.pauseAfter, 1000);
    });
  });

  describe("Script Builder", () => {
    it("builds a script with word count and estimated duration", () => {
      const segments = [
        createSegment("This is a test sentence.", "body"),
        createSegment("Another sentence here.", "body"),
      ];
      const script = buildScript("narration", "Test Script", segments);
      assert.equal(script.mode, "narration");
      assert.equal(script.title, "Test Script");
      assert.equal(script.segments.length, 2);
      assert.ok(script.totalWords > 0);
      assert.ok(script.estimatedSeconds > 0);
      assert.ok(script.id);
      assert.ok(script.createdAt);
    });

    it("calculates word count correctly", () => {
      const segments = [
        createSegment("one two three four five", "body"),
      ];
      const script = buildScript("narration", "Word Count", segments);
      assert.equal(script.totalWords, 5);
    });

    it("estimates duration based on speaking rate", () => {
      const segments = [
        createSegment("one two three four five six seven eight nine ten", "body"),
      ];
      const script = buildScript("narration", "Duration", segments);
      // 10 words at 2.5 words/sec = 4 seconds
      assert.ok(script.estimatedSeconds >= 4);
    });
  });

  describe("Analysis Narration", () => {
    it("builds narration for a complete analysis", () => {
      const input = {
        noticeType: "irs_cp2000",
        noticeTypeLabel: "IRS CP2000 Notice",
        agency: "IRS",
        referenceNumber: "CP2000-12345",
        noticeDate: "2026-07-15",
        deadlineDate: "2026-09-15",
        deadlineUrgency: "urgent",
        deadlineUrgencyLabel: "Urgent",
        factCount: 8,
        confirmedFactCount: 5,
        evidenceCount: 2,
        findingCount: 1,
        readinessState: "needs_review",
        readinessScore: 65,
        strategyCount: 4,
      };
      const script = buildAnalysisNarration(input);
      assert.equal(script.mode, "summary");
      assert.equal(script.title, "Analysis Summary");
      assert.ok(script.segments.length > 5);

      const text = scriptToPlainText(script);
      assert.match(text, /IRS CP2000/);
      assert.match(text, /IRS/);
      assert.match(text, /CP2000-12345/);
      assert.match(text, /2026-07-15/);
      assert.match(text, /2026-09-15/);
      assert.match(text, /Urgent/);
      assert.match(text, /8 fact/);
      assert.match(text, /2 evidence/);
      assert.match(text, /1 issue/);
      assert.match(text, /4 response/);
      assert.match(text, /needs review/i);
    });

    it("includes critical alert for expired deadline", () => {
      const input = {
        noticeType: "irs_cp2000",
        noticeTypeLabel: "IRS CP2000",
        agency: "IRS",
        deadlineDate: "2026-01-01",
        deadlineUrgency: "expired",
        deadlineUrgencyLabel: "Expired",
        factCount: 5,
        confirmedFactCount: 0,
        evidenceCount: 0,
        findingCount: 0,
        readinessState: "blocked",
        strategyCount: 1,
      };
      const script = buildAnalysisNarration(input);
      const alertSegments = script.segments.filter((s) => s.role === "alert");
      assert.ok(alertSegments.length > 0);
      const criticalSegments = script.segments.filter((s) => s.priority === "critical");
      assert.ok(criticalSegments.length > 0);
    });

    it("handles missing deadline gracefully", () => {
      const input = {
        noticeType: "other",
        factCount: 0,
        confirmedFactCount: 0,
        evidenceCount: 0,
        findingCount: 0,
        readinessState: "draft",
        strategyCount: 0,
      };
      const script = buildAnalysisNarration(input);
      const text = scriptToPlainText(script);
      assert.match(text, /deadline/i);
    });

    it("reads readiness state correctly", () => {
      const states = ["ready", "blocked", "incomplete", "needs_review", "urgent", "draft"];
      for (const state of states) {
        const input = {
          factCount: 1,
          confirmedFactCount: 0,
          evidenceCount: 0,
          findingCount: 0,
          readinessState: state,
          strategyCount: 0,
        };
        const script = buildAnalysisNarration(input);
        const text = scriptToPlainText(script);
        assert.ok(text.length > 50, `Should produce narration for state ${state}`);
      }
    });
  });

  describe("Deadline Narration", () => {
    it("builds narration for expired deadline", () => {
      const script = buildDeadlineNarration("2026-01-01", -5, "Expired");
      const text = scriptToPlainText(script);
      assert.match(text, /passed/i);
      assert.match(text, /2026-01-01/);
      assert.match(text, /immediately/i);
      const critical = script.segments.filter((s) => s.priority === "critical");
      assert.ok(critical.length > 0);
    });

    it("builds narration for critical deadline (1-3 days)", () => {
      const script = buildDeadlineNarration("2026-09-01", 2, "Critical");
      const text = scriptToPlainText(script);
      assert.match(text, /Critical/i);
      assert.match(text, /2 day/);
      assert.match(text, /immediately/i);
    });

    it("builds narration for urgent deadline (4-14 days)", () => {
      const script = buildDeadlineNarration("2026-09-15", 10, "Urgent");
      const text = scriptToPlainText(script);
      assert.match(text, /Urgent/i);
      assert.match(text, /10 day/);
      assert.match(text, /preparing/i);
    });

    it("builds narration for soon deadline (15-30 days)", () => {
      const script = buildDeadlineNarration("2026-10-01", 25, "Soon");
      const text = scriptToPlainText(script);
      assert.match(text, /25 day/);
    });

    it("builds narration for comfortable deadline (30+ days)", () => {
      const script = buildDeadlineNarration("2026-12-31", 60, "On track");
      const text = scriptToPlainText(script);
      assert.match(text, /60 day/);
      assert.match(text, /thorough/i);
    });

    it("builds narration for missing deadline", () => {
      const script = buildDeadlineNarration("", null, "Unknown");
      const text = scriptToPlainText(script);
      assert.match(text, /No deadline/i);
    });
  });

  describe("Walkthrough Narration", () => {
    it("narrates the current step", () => {
      const steps = [
        { stepNumber: 1, title: "Input", description: "Paste your notice.", isCurrent: false, isComplete: true },
        { stepNumber: 2, title: "Analysis", description: "Review the extracted information.", isCurrent: true, isComplete: false },
        { stepNumber: 3, title: "Strategy", description: "Choose a strategy.", isCurrent: false, isComplete: false },
        { stepNumber: 4, title: "Draft", description: "Review the draft.", isCurrent: false, isComplete: false },
      ];
      const script = buildWalkthroughNarration(steps);
      const text = scriptToPlainText(script);
      assert.match(text, /Step 2/);
      assert.match(text, /Analysis/);
      assert.match(text, /Review the extracted/);
      assert.match(text, /Coming up/);
      assert.match(text, /Step 3/);
    });

    it("lists upcoming steps", () => {
      const steps = [
        { stepNumber: 1, title: "Input", description: "Paste.", isCurrent: true, isComplete: false },
        { stepNumber: 2, title: "Analysis", description: "Review.", isCurrent: false, isComplete: false },
        { stepNumber: 3, title: "Strategy", description: "Choose.", isCurrent: false, isComplete: false },
        { stepNumber: 4, title: "Draft", description: "Review.", isCurrent: false, isComplete: false },
        { stepNumber: 5, title: "Mail", description: "Send.", isCurrent: false, isComplete: false },
      ];
      const script = buildWalkthroughNarration(steps);
      const text = scriptToPlainText(script);
      assert.match(text, /Step 2/);
      assert.match(text, /Step 3/);
      assert.match(text, /Step 4/);
      assert.match(text, /1 more step/); // step 5
    });
  });

  describe("Strategy Narration", () => {
    it("builds narration for a strategy with risks and prerequisites", () => {
      const input = {
        label: "Dispute Factual Allegation",
        description: "Present facts and evidence that contradict the agency's allegations.",
        reason: "Contradictions were found in the notice.",
        confidence: "high",
        risks: ["Disputing without evidence may weaken your position."],
        prerequisites: ["Review all contradictions", "Confirm evidence supports the dispute"],
      };
      const script = buildStrategyNarration(input);
      const text = scriptToPlainText(script);
      assert.match(text, /Dispute Factual Allegation/);
      assert.match(text, /Contradict/i);
      assert.match(text, /Contradictions were found/);
      assert.match(text, /high/i);
      assert.match(text, /Prerequisites/);
      assert.match(text, /Review all contradictions/);
      assert.match(text, /Risks/);
      assert.match(text, /weaken your position/);
    });

    it("handles strategy with no risks or prerequisites", () => {
      const input = {
        label: "Comply with the Notice",
        description: "Take the action requested.",
        reason: "",
        confidence: "medium",
        risks: [],
        prerequisites: [],
      };
      const script = buildStrategyNarration(input);
      const text = scriptToPlainText(script);
      assert.match(text, /Comply/);
      assert.doesNotMatch(text, /Prerequisites/);
      assert.doesNotMatch(text, /Risks/);
    });
  });

  describe("Script Utilities", () => {
    it("converts script to plain text", () => {
      const segments = [
        createSegment("Hello.", "heading"),
        createSegment("World.", "body"),
      ];
      const script = buildScript("narration", "Test", segments);
      const text = scriptToPlainText(script);
      assert.equal(text, "Hello. World.");
    });

    it("filters by priority", () => {
      const segments = [
        createSegment("Critical item.", "alert", { priority: "critical" }),
        createSegment("Normal item.", "body", { priority: "normal" }),
        createSegment("Low item.", "body", { priority: "low" }),
      ];
      const script = buildScript("narration", "Test", segments);

      const criticalOnly = filterByPriority(script, "critical");
      assert.equal(criticalOnly.segments.length, 1);
      assert.match(criticalOnly.segments[0].text, /Critical/);

      const highAndUp = filterByPriority(script, "high");
      assert.equal(highAndUp.segments.length, 1);

      const all = filterByPriority(script, "low");
      assert.equal(all.segments.length, 3);
    });
  });
});
