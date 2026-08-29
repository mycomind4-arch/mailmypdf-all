import { z } from "zod";

/* ═══════════════════════════════════════════════════════════
   VOICE DOMAIN — narration scripts, audio summaries, voice
   interaction models for the Notice Respond workflow.
   
   This layer is platform-agnostic: it produces structured
   narration content that any speech engine (Web Speech API,
   cloud TTS, etc.) can consume.
   ═══════════════════════════════════════════════════════════ */

export const voiceModeSchema = z.enum(["narration", "dictation", "summary", "guided_walkthrough"]);
export type VoiceMode = z.infer<typeof voiceModeSchema>;

export const narrationSegmentSchema = z.object({
  id: z.string(),
  text: z.string(),
  role: z.enum(["heading", "body", "alert", "prompt", "value", "instruction"]),
  priority: z.enum(["critical", "high", "normal", "low"]).default("normal"),
  pauseAfter: z.number().default(400),  // milliseconds
});
export type NarrationSegment = z.infer<typeof narrationSegmentSchema>;

export const narrationScriptSchema = z.object({
  id: z.string(),
  mode: voiceModeSchema,
  title: z.string(),
  segments: z.array(narrationSegmentSchema),
  totalWords: z.number().default(0),
  estimatedSeconds: z.number().default(0),
  createdAt: z.string(),
});
export type NarrationScript = z.infer<typeof narrationScriptSchema>;

export const voiceSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  rate: z.number().min(0.5).max(2.0).default(1.0),
  pitch: z.number().min(0).max(2.0).default(1.0),
  volume: z.number().min(0).max(1.0).default(0.9),
  voiceURI: z.string().optional(),
  autoNarrate: z.boolean().default(false),       // narrate on page load
  narrateFindings: z.boolean().default(true),      // auto-narrate analysis results
  dictationEnabled: z.boolean().default(true),
  preferredGender: z.enum(["male", "female", "any"]).default("any"),
});
export type VoiceSettings = z.infer<typeof voiceSettingsSchema>;

export const dictationResultSchema = z.object({
  id: z.string(),
  transcript: z.string(),
  confidence: z.number().min(0).max(1).default(0),
  isFinal: z.boolean().default(false),
  field: z.string().optional(),  // which form field this dictation targets
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});
export type DictationResult = z.infer<typeof dictationResultSchema>;

export function createVoiceSettings(partial?: Partial<VoiceSettings>): VoiceSettings {
  return voiceSettingsSchema.parse({
    enabled: true,
    rate: 1.0,
    pitch: 1.0,
    volume: 0.9,
    autoNarrate: false,
    narrateFindings: true,
    dictationEnabled: true,
    preferredGender: "any",
    ...partial,
  });
}

export function createSegment(
  text: string,
  role: NarrationSegment["role"] = "body",
  partial?: Partial<NarrationSegment>,
): NarrationSegment {
  return narrationSegmentSchema.parse({
    id: crypto.randomUUID(),
    text,
    role,
    priority: "normal",
    pauseAfter: 400,
    ...partial,
  });
}

/* ── Script builders ── */

export function buildScript(
  mode: VoiceMode,
  title: string,
  segments: NarrationSegment[],
): NarrationScript {
  const totalWords = segments.reduce((sum, s) => sum + s.text.split(/\s+/).filter(Boolean).length, 0);
  const totalPauseMs = segments.reduce((sum, s) => sum + s.pauseAfter, 0);
  // Average speaking rate: ~150 words per minute = 2.5 words/second
  const estimatedSeconds = Math.ceil(totalWords / 2.5 + totalPauseMs / 1000);
  return narrationScriptSchema.parse({
    id: crypto.randomUUID(),
    mode,
    title,
    segments,
    totalWords,
    estimatedSeconds,
    createdAt: new Date().toISOString(),
  });
}

/* ── Analysis narration ── */

export interface AnalysisNarrationInput {
  noticeType?: string;
  noticeTypeLabel?: string;
  agency?: string;
  referenceNumber?: string;
  noticeDate?: string;
  deadlineDate?: string;
  deadlineUrgency?: string;
  deadlineUrgencyLabel?: string;
  factCount: number;
  confirmedFactCount: number;
  evidenceCount: number;
  findingCount: number;
  readinessState?: string;
  readinessScore?: number;
  strategyCount: number;
}

export function buildAnalysisNarration(input: AnalysisNarrationInput): NarrationScript {
  const segments: NarrationSegment[] = [];

  segments.push(createSegment("Notice Analysis Summary", "heading", { pauseAfter: 600 }));

  if (input.noticeTypeLabel) {
    segments.push(createSegment(
      `This appears to be a ${input.noticeTypeLabel}.`,
      "body",
      { priority: "high" },
    ));
  }

  if (input.agency) {
    segments.push(createSegment(`Issued by ${input.agency}.`, "body"));
  }

  if (input.referenceNumber) {
    segments.push(createSegment(`Reference number: ${input.referenceNumber}.`, "value"));
  }

  if (input.noticeDate) {
    segments.push(createSegment(`Notice dated ${input.noticeDate}.`, "value"));
  }

  // Deadline urgency
  if (input.deadlineDate && input.deadlineUrgencyLabel) {
    const urgencySegment = createSegment(
      `Response deadline: ${input.deadlineDate}. Urgency level: ${input.deadlineUrgencyLabel}.`,
      input.deadlineUrgency === "expired" || input.deadlineUrgency === "critical" ? "alert" : "body",
      {
        priority: input.deadlineUrgency === "expired" || input.deadlineUrgency === "critical" ? "critical" : "high",
        pauseAfter: 800,
      },
    );
    segments.push(urgencySegment);
  } else {
    segments.push(createSegment("No response deadline was identified. Verify the deadline manually.", "alert", { priority: "high" }));
  }

  // Facts
  segments.push(createSegment(
    `Extracted ${input.factCount} fact${input.factCount === 1 ? "" : "s"} from the notice. ${input.confirmedFactCount} confirmed.`,
    "body",
  ));

  // Evidence
  segments.push(createSegment(
    input.evidenceCount > 0
      ? `${input.evidenceCount} evidence item${input.evidenceCount === 1 ? "" : "s"} attached.`
      : "No evidence has been attached yet.",
    "body",
  ));

  // Findings
  if (input.findingCount > 0) {
    segments.push(createSegment(
      `Analysis found ${input.findingCount} issue${input.findingCount === 1 ? "" : "s"} requiring attention.`,
      "alert",
      { priority: "high" },
    ));
  }

  // Strategy
  if (input.strategyCount > 0) {
    segments.push(createSegment(
      `${input.strategyCount} response strategy${input.strategyCount === 1 ? "" : "ies"} available.`,
      "body",
    ));
  }

  // Readiness
  if (input.readinessState) {
    const readinessText = input.readinessState === "ready"
      ? "Your case is ready for response generation."
      : input.readinessState === "blocked"
        ? "Your case is blocked. Resolve the blocking issues before proceeding."
        : input.readinessState === "incomplete"
          ? "Your case is incomplete. Several items need attention."
          : input.readinessState === "needs_review"
            ? "Your case needs review. Please verify the extracted information."
            : input.readinessState === "urgent"
              ? "Your case is ready but the deadline is approaching. Act quickly."
              : "Your case is in draft status.";
    segments.push(createSegment(readinessText, "instruction", { pauseAfter: 600 }));
  }

  return buildScript("summary", "Analysis Summary", segments);
}

/* ── Deadline countdown narration ── */

export function buildDeadlineNarration(
  deadlineDate: string,
  daysRemaining: number | null,
  urgencyLabel: string,
): NarrationScript {
  const segments: NarrationSegment[] = [];

  segments.push(createSegment("Deadline Alert", "heading", { pauseAfter: 600 }));

  if (daysRemaining === null) {
    segments.push(createSegment("No deadline has been identified.", "alert", { priority: "critical" }));
    segments.push(createSegment("Check the notice carefully for any response deadline and add it manually.", "instruction"));
  } else if (daysRemaining < 0) {
    segments.push(createSegment(
      `The response deadline of ${deadlineDate} has passed. Contact the issuing agency immediately.`,
      "alert",
      { priority: "critical", pauseAfter: 800 },
    ));
    segments.push(createSegment("A late response may still be accepted. Do not delay.", "instruction", { priority: "high" }));
  } else if (daysRemaining <= 3) {
    segments.push(createSegment(
      `Critical: Only ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining until the deadline on ${deadlineDate}.`,
      "alert",
      { priority: "critical", pauseAfter: 800 },
    ));
    segments.push(createSegment("Respond immediately. Do not wait.", "instruction", { priority: "high" }));
  } else if (daysRemaining <= 14) {
    segments.push(createSegment(
      `Urgent: ${daysRemaining} days remaining until the deadline on ${deadlineDate}.`,
      "alert",
      { priority: "high", pauseAfter: 600 },
    ));
    segments.push(createSegment("Begin preparing your response now.", "instruction"));
  } else if (daysRemaining <= 30) {
    segments.push(createSegment(
      `You have ${daysRemaining} days until the deadline on ${deadlineDate}.`,
      "body",
      { priority: "normal" },
    ));
    segments.push(createSegment("Start gathering your documents and preparing your response.", "instruction"));
  } else {
    segments.push(createSegment(
      `You have ${daysRemaining} days until the deadline on ${deadlineDate}.`,
      "body",
      { priority: "low" },
    ));
    segments.push(createSegment("You have time to prepare a thorough response.", "instruction"));
  }

  return buildScript("narration", "Deadline Alert", segments);
}

/* ── Guided walkthrough narration ── */

export interface WalkthroughStep {
  stepNumber: number;
  title: string;
  description: string;
  isCurrent: boolean;
  isComplete: boolean;
}

export function buildWalkthroughNarration(steps: WalkthroughStep[]): NarrationScript {
  const segments: NarrationSegment[] = [];

  segments.push(createSegment("Guided Walkthrough", "heading", { pauseAfter: 600 }));

  const current = steps.find((s) => s.isCurrent);

  if (current) {
    segments.push(createSegment(`Step ${current.stepNumber}: ${current.title}`, "heading", { pauseAfter: 600 }));
    segments.push(createSegment(current.description, "instruction", { pauseAfter: 800 }));
  }

  // Upcoming steps
  const upcoming = steps.filter((s) => !s.isComplete && !s.isCurrent);
  if (upcoming.length > 0) {
    segments.push(createSegment("Coming up:", "body", { pauseAfter: 300 }));
    for (const step of upcoming.slice(0, 3)) {
      segments.push(createSegment(`Step ${step.stepNumber}: ${step.title}.`, "body", { priority: "low", pauseAfter: 300 }));
    }
    if (upcoming.length > 3) {
      segments.push(createSegment(`And ${upcoming.length - 3} more step${upcoming.length - 3 === 1 ? "" : "s"}.`, "body", { priority: "low" }));
    }
  }

  return buildScript("guided_walkthrough", "Guided Walkthrough", segments);
}

/* ── Strategy narration ── */

export interface StrategyNarrationInput {
  label: string;
  description: string;
  reason: string;
  confidence: string;
  risks: string[];
  prerequisites: string[];
}

export function buildStrategyNarration(input: StrategyNarrationInput): NarrationScript {
  const segments: NarrationSegment[] = [];

  segments.push(createSegment("Strategy Option", "heading", { pauseAfter: 600 }));
  segments.push(createSegment(input.label, "heading", { pauseAfter: 400 }));
  segments.push(createSegment(input.description, "body", { pauseAfter: 600 }));

  segments.push(createSegment(`Confidence: ${input.confidence}.`, "value", { pauseAfter: 300 }));

  if (input.reason) {
    segments.push(createSegment(`Reason: ${input.reason}`, "body", { pauseAfter: 500 }));
  }

  if (input.prerequisites.length > 0) {
    segments.push(createSegment("Prerequisites:", "body", { pauseAfter: 200 }));
    for (const prereq of input.prerequisites) {
      segments.push(createSegment(prereq, "instruction", { priority: "low", pauseAfter: 250 }));
    }
  }

  if (input.risks.length > 0) {
    segments.push(createSegment("Risks to consider:", "alert", { priority: "high", pauseAfter: 300 }));
    for (const risk of input.risks) {
      segments.push(createSegment(risk, "body", { priority: "high", pauseAfter: 250 }));
    }
  }

  return buildScript("narration", "Strategy Option", segments);
}

/* ── Plain text extraction (for any TTS engine) ── */

export function scriptToPlainText(script: NarrationScript): string {
  return script.segments.map((s) => s.text).join(" ");
}

/* ── Filter by priority ── */

export function filterByPriority(script: NarrationScript, minPriority: "critical" | "high" | "normal" | "low"): NarrationScript {
  const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
  const threshold = priorityOrder[minPriority];
  const filtered = script.segments.filter((s) => priorityOrder[s.priority] <= threshold);
  return buildScript(script.mode, script.title, filtered);
}
