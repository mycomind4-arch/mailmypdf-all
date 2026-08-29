import { z } from "zod";
import type { WorkflowProfile } from "./workflow-profiles";

export const matterFindingStateSchema = z.enum([
  "confirmed",
  "discrepancy",
  "missing",
  "ambiguous",
  "requires_verification",
  "unsupported",
]);
export type MatterFindingState = z.infer<typeof matterFindingStateSchema>;

export const matterFindingSchema = z.object({
  id: z.string(),
  state: matterFindingStateSchema,
  title: z.string(),
  detail: z.string(),
  sourceExcerpt: z.string().optional(),
  severity: z.enum(["high", "medium", "low"]),
});
export type MatterFinding = z.infer<typeof matterFindingSchema>;

export const evidenceItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.enum([
    "missing",
    "requested",
    "provided",
    "verified",
    "rejected",
    "not_applicable",
  ]),
  supportsFindingIds: z.array(z.string()).default([]),
});
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;

export const matterAnalysisSchema = z.object({
  documentId: z.string(),
  classification: z.object({
    type: z.string(),
    confidence: z.number().min(0).max(1),
  }),
  facts: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      sourceExcerpt: z.string().optional(),
      provenance: z
        .enum([
          "user_provided",
          "extracted",
          "inferred",
          "verified",
          "ai_suggested",
          "llm_generated",
          "externally_sourced",
        ])
        .default("user_provided"),
    }),
  ),
  findings: z.array(matterFindingSchema),
  evidence: z.array(evidenceItemSchema),
  timeline: z.array(
    z.object({
      event: z.string(),
      date: z.string().optional(),
      description: z.string(),
      sourceExcerpt: z.string().optional(),
    }),
  ),
  strategy: z.array(z.string()),
  blockingIssues: z.array(z.string()),
  risks: z.array(
    z.object({
      title: z.string(),
      severity: z.enum(["high", "medium", "low"]),
      detail: z.string(),
    }),
  ),
  generationProvenance: z
    .object({
      provider: z.string(),
      model: z.string(),
      generatedAt: z.string(),
      inputHash: z.string(),
    })
    .nullable()
    .default(null),
});
export type MatterAnalysis = z.infer<typeof matterAnalysisSchema>;

function missingFinding(
  id: string,
  title: string,
  detail: string,
): MatterFinding {
  return { id, state: "missing", title, detail, severity: "high" };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toCamelCase(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, char: string) => char.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "");
}

export function analyzeMatterWorkflowInput(input: {
  documentId: string;
  text: string;
  profile: WorkflowProfile;
  workflowFacts?: Record<string, string | undefined>;
  evidenceStatuses?: Record<string, EvidenceItem["status"]>;
  objective?: string;
}): MatterAnalysis {
  const text = input.text.trim();
  const factsInput = input.workflowFacts ?? {};
  const evidenceStatuses = input.evidenceStatuses ?? {};
  const objective = input.objective?.trim() ?? "";
  const findings: MatterFinding[] = [];
  const evidence: EvidenceItem[] = [];
  const blockingIssues: string[] = [];
  const timeline: MatterAnalysis["timeline"] = [];
  const risks: MatterAnalysis["risks"] = [];

  if (!text) {
    findings.push(
      missingFinding(
        "source-text",
        "Source document missing",
        "A source document must be available before findings can be grounded.",
      ),
    );
    blockingIssues.push("Source document text is required.");
  }

  // Extract date-like patterns from text for timeline
  if (text) {
    const datePatterns = [
      /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g,
      /\b(\w+ \d{1,2},? \d{4})\b/g,
      /\b(\d{4}-\d{2}-\d{2})\b/g,
    ];
    const foundDates = new Set<string>();
    for (const pattern of datePatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const dateStr = match[1] ?? match[0];
        if (!foundDates.has(dateStr)) {
          foundDates.add(dateStr);
          timeline.push({
            event: "Date found in source document",
            date: dateStr,
            description: `A date "${dateStr}" appears in the supplied document and may be relevant to the dispute chronology.`,
            sourceExcerpt: text.slice(
              Math.max(0, match.index ?? 0 - 50),
              Math.min(text.length, (match.index ?? 0) + dateStr.length + 50),
            ),
          });
        }
      }
    }
  }

  // Check required facts
  for (const requirement of input.profile.requiredFacts) {
    const key = toCamelCase(requirement);
    const value = Object.entries(factsInput).find(
      ([name, candidate]) =>
        Boolean(candidate) &&
        (name.toLowerCase() === key.toLowerCase() ||
          name.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().includes(name.toLowerCase())),
    )?.[1];

    if (!value?.trim()) {
      const id = `required-${key}`;
      findings.push(
        missingFinding(
          id,
          `Missing ${requirement}`,
          `Provide ${requirement} before the dispute letter can be approved.`,
        ),
      );
      evidence.push({
        id: `evidence-${id}`,
        description: `User-provided information establishing ${requirement}`,
        status: "missing",
        supportsFindingIds: [id],
      });
      blockingIssues.push(`${requirement} is required.`);
    } else {
      findings.push({
        id: `fact-${key}`,
        state: "confirmed",
        title: `Provided ${requirement}`,
        detail: `User provided ${requirement}.`,
        severity: "medium",
        sourceExcerpt: value.slice(0, 500),
      });
    }
  }

  // Check evidence requirements
  for (const requirement of input.profile.evidenceRequirements) {
    const id = `evidence-${slugify(requirement)}`;
    const status = evidenceStatuses[id] ?? "requested";
    evidence.push({
      id,
      description: requirement,
      status,
      supportsFindingIds: [],
    });
    if (
      status === "missing" ||
      status === "requested" ||
      status === "rejected"
    ) {
      blockingIssues.push(`Evidence required: ${requirement}`);
    }
  }

  // Check objective
  if (!objective) {
    findings.push(
      missingFinding(
        "objective",
        "Requested resolution missing",
        input.profile.objectivePrompt,
      ),
    );
    blockingIssues.push("A specific requested resolution is required.");
  } else {
    findings.push({
      id: "objective",
      state: "confirmed",
      title: "Requested resolution supplied",
      detail: objective,
      severity: "medium",
      sourceExcerpt: objective.slice(0, 500),
    });
  }

  // Source present confirmation
  if (text) {
    findings.push({
      id: "source-present",
      state: "confirmed",
      title: "Source document available",
      detail:
        "The workflow has source material that can be checked against the user's factual assertions.",
      severity: "low",
    });
  }

  // Risk identification
  if (blockingIssues.length > 0) {
    risks.push({
      title: "Incomplete intake",
      severity: "high",
      detail: `${blockingIssues.length} blocking issue(s) must be resolved before the matter can proceed to review and approval.`,
    });
  }

  // Strategy
  const strategy = [
    `Address the dispute to the ${input.profile.recipientRole}.`,
    `Build the letter around the requested outcome: ${input.profile.outcome}`,
    `Use the profile deadline policy: ${input.profile.deadlinePolicy}`,
    "Resolve missing and requested evidence before explicit approval.",
    "Preserve source-grounded facts and clearly distinguish user-provided facts from extracted or inferred information.",
    "Do not manufacture legal facts or claim legal representation.",
    "Establish clean extension points for follow-up notice, demand letter, insurance claim, or legal escalation.",
  ];

  return matterAnalysisSchema.parse({
    documentId: input.documentId,
    generationProvenance: null,
    classification: {
      type: input.profile.id,
      confidence: text ? 0.9 : 0,
    },
    facts: Object.entries(factsInput)
      .filter(([, value]) => Boolean(value?.trim()))
      .map(([label, value]) => ({
        label,
        value: value!,
        sourceExcerpt: value!.slice(0, 500),
        provenance: "user_provided" as const,
      })),
    findings,
    evidence,
    timeline,
    strategy,
    blockingIssues,
    risks,
  });
}

export function canApproveMatter(analysis: MatterAnalysis): boolean {
  const unresolvedEvidence = analysis.evidence.some(
    (item) =>
      item.status === "missing" ||
      item.status === "requested" ||
      item.status === "rejected",
  );
  const unresolvedFindings = analysis.findings.some(
    (finding) =>
      finding.state === "missing" ||
      finding.state === "requires_verification" ||
      finding.state === "unsupported" ||
      finding.state === "ambiguous",
  );
  return (
    analysis.blockingIssues.length === 0 &&
    !unresolvedEvidence &&
    !unresolvedFindings
  );
}

export function canAuthorizeMatterMail(params: {
  analysis: MatterAnalysis;
  draftValidated: boolean;
  humanApproved: boolean;
  recipientComplete: boolean;
  paymentComplete: boolean;
}): boolean {
  return (
    canApproveMatter(params.analysis) &&
    params.draftValidated &&
    params.humanApproved &&
    params.recipientComplete &&
    params.paymentComplete
  );
}

export function canCompleteMatterProof(params: {
  trackingNumber: string | null;
  proofReady: boolean;
}): boolean {
  return Boolean(params.trackingNumber) && params.proofReady;
}
