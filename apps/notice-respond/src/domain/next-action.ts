import { z } from "zod";

/* ═══════════════════════════════════════════════════════════
   NEXT BEST ACTION ENGINE
   Prioritized action queue with what, why, and impact.
   No fake urgency — honest prioritization.
   ═══════════════════════════════════════════════════════════ */

export const actionPrioritySchema = z.enum(["critical", "high", "medium", "low"]);
export type ActionPriority = z.infer<typeof actionPrioritySchema>;

export const nextActionSchema = z.object({
  id: z.string(),
  priority: actionPrioritySchema,
  title: z.string(),
  what: z.string(),
  why: z.string(),
  impact: z.string(),
  category: z.enum(["deadline", "evidence", "fact", "contradiction", "missing_info", "response", "review", "mailing"]),
  status: z.enum(["pending", "in_progress", "completed", "dismissed"]).default("pending"),
  relatedObjectId: z.string().optional(),
  createdAt: z.string(),
});
export type NextAction = z.infer<typeof nextActionSchema>;

export function createAction(params: {
  priority: ActionPriority;
  title: string;
  what: string;
  why: string;
  impact: string;
  category: NextAction["category"];
  relatedObjectId?: string;
}): NextAction {
  return nextActionSchema.parse({
    id: crypto.randomUUID(),
    priority: params.priority,
    title: params.title,
    what: params.what,
    why: params.why,
    impact: params.impact,
    category: params.category,
    status: "pending",
    relatedObjectId: params.relatedObjectId,
    createdAt: new Date().toISOString(),
  });
}

/* ── Generate action queue ── */

export interface ActionQueueInput {
  readinessState: string;
  readinessScore: number;
  deadlineUrgency?: string;
  deadlineDaysRemaining?: number | null;
  contradictions: { status: string; severity: string; field: string; description: string }[];
  missingInfo: { status: string; impact: string; label: string; whyItMatters: string; field: string }[];
  facts: { confidence: string; userConfirmed: boolean; label: string }[];
  evidenceCount: number;
  hasDraft: boolean;
  draftPlaceholders: number;
}

export function generateActionQueue(input: ActionQueueInput): NextAction[] {
  const actions: NextAction[] = [];

  /* ── Blocking missing info → critical ── */
  for (const item of input.missingInfo.filter((m) => m.status === "missing" && m.impact === "blocking")) {
    actions.push(createAction({
      priority: "critical",
      title: item.label,
      what: `Provide: ${item.label}`,
      why: item.whyItMatters,
      impact: "Blocking — case cannot proceed without this information.",
      category: "missing_info",
      relatedObjectId: item.field,
    }));
  }

  /* ── Unresolved critical contradictions → critical ── */
  for (const c of input.contradictions.filter((c) => c.status === "unresolved" && c.severity === "critical")) {
    actions.push(createAction({
      priority: "critical",
      title: `Resolve contradiction: ${c.field}`,
      what: `Review conflicting values for "${c.field}" and select the correct one.`,
      why: c.description,
      impact: "Unresolved contradictions may produce an incorrect response.",
      category: "contradiction",
      relatedObjectId: c.field,
    }));
  }

  /* ── Deadline expired → critical ── */
  if (input.deadlineUrgency === "expired") {
    actions.push(createAction({
      priority: "critical",
      title: "Contact the issuing agency immediately",
      what: "The response deadline has passed. Contact the agency to determine if a late response is still possible.",
      why: "The deadline has expired. Late responses may not be accepted.",
      impact: "Your rights may be at risk. Act immediately.",
      category: "deadline",
    }));
  }

  /* ── Deadline critical (1-3 days) → high ── */
  if (input.deadlineUrgency === "critical" && input.deadlineDaysRemaining !== null && input.deadlineDaysRemaining! > 0) {
    actions.push(createAction({
      priority: "high",
      title: `Respond within ${input.deadlineDaysRemaining} day(s)`,
      what: "The deadline is imminent. Generate and send your response immediately.",
      why: `Only ${input.deadlineDaysRemaining} day(s) remaining.`,
      impact: "Missing this deadline could forfeit your rights.",
      category: "deadline",
    }));
  }

  /* ── Unverified high-impact facts → high ── */
  const unverifiedImportantFacts = input.facts.filter(
    (f) => !f.userConfirmed && f.confidence !== "high" && /amount|date|deadline|agency|reference/i.test(f.label),
  );
  for (const f of unverifiedImportantFacts) {
    actions.push(createAction({
      priority: "high",
      title: `Verify: ${f.label}`,
      what: `Confirm the extracted value for "${f.label}" against the source document.`,
      why: `This fact was extracted with ${f.confidence} confidence and is important for the response.`,
      impact: "An incorrect value could weaken your response or cause errors.",
      category: "fact",
    }));
  }

  /* ── Unresolved high-severity contradictions → high ── */
  for (const c of input.contradictions.filter((c) => c.status === "unresolved" && c.severity === "high")) {
    actions.push(createAction({
      priority: "high",
      title: `Resolve: ${c.field}`,
      what: `Review the conflicting information for "${c.field}".`,
      why: c.description,
      impact: "Contradictions may undermine the credibility of your response.",
      category: "contradiction",
    }));
  }

  /* ── Non-blocking missing info → medium ── */
  for (const item of input.missingInfo.filter((m) => m.status === "missing" && m.impact !== "blocking")) {
    actions.push(createAction({
      priority: "medium",
      title: item.label,
      what: `Provide: ${item.label}`,
      why: item.whyItMatters,
      impact: "Not blocking, but resolving this strengthens the case.",
      category: "missing_info",
      relatedObjectId: item.field,
    }));
  }

  /* ── No evidence → medium ── */
  if (input.evidenceCount === 0) {
    actions.push(createAction({
      priority: "medium",
      title: "Attach supporting evidence",
      what: "Upload documents that support your position (receipts, forms, prior correspondence).",
      why: "Evidence strengthens your response and may be required for disputes.",
      impact: "A response with evidence is more likely to succeed.",
      category: "evidence",
    }));
  }

  /* ── Draft with placeholders → high ── */
  if (input.hasDraft && input.draftPlaceholders > 0) {
    actions.push(createAction({
      priority: "high",
      title: `Resolve ${input.draftPlaceholders} placeholder(s) in draft`,
      what: "Review and fill in the placeholder items marked [brackets] in the response draft.",
      why: "Placeholders represent missing information that must be resolved before sending.",
      impact: "A draft with placeholders is not ready to send.",
      category: "response",
    }));
  }

  /* ── No draft → medium ── */
  if (!input.hasDraft && input.readinessScore >= 50) {
    actions.push(createAction({
      priority: "medium",
      title: "Generate response draft",
      what: "Select a response strategy and generate a draft letter.",
      why: "The case has enough information to begin drafting.",
      impact: "Generating the draft moves the case toward completion.",
      category: "response",
    }));
  }

  /* ── Sort by priority ── */
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return actions;
}

export const PRIORITY_META: Record<ActionPriority, { label: string; color: string }> = {
  critical: { label: "Critical", color: "red" },
  high: { label: "High Priority", color: "amber" },
  medium: { label: "Medium Priority", color: "blue" },
  low: { label: "Low Priority", color: "gray" },
};
