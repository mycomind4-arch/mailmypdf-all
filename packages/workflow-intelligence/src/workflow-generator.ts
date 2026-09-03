/**
 * Workflow Generator
 *
 * Uses AI to automatically design complete, optimized workflows for each case type.
 * Generates workflows with the sophistication of CP2000 but optimized for usability.
 */

import { llmProvider } from "./llm-provider";
import { WorkflowSpecification, PipelineStageConfig } from "./core";

/* ─────────────────────────────────────────────────────────────────────────── */
/* TYPES                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface WorkflowGenerationRequest {
  verticalId: string; // e.g., "immigration-mail"
  caseType: string; // e.g., "USCIS Letter", "Visa Appeal"
  jurisdiction?: string;
  complexity: "simple" | "moderate" | "complex";
  userConstraints?: string[]; // What the user specifically needs
}

export interface GeneratedWorkflow {
  name: string;
  description: string;
  specification: WorkflowSpecification;
  designRationale: string;
  estimatedCompletionTime: string;
  successMetrics: string[];
  commonPitfalls: string[];
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW GENERATION PROMPTS                                                */
/* ─────────────────────────────────────────────────────────────────────────── */

function createWorkflowGenerationPrompt(request: WorkflowGenerationRequest): string {
  return `You are an expert workflow designer for legal/government correspondence.

Your task: Design a COMPLETE workflow for: ${request.caseType} (Vertical: ${request.verticalId})
Complexity Level: ${request.complexity}
${request.jurisdiction ? `Jurisdiction: ${request.jurisdiction}` : ""}
${request.userConstraints?.length ? `User Constraints: ${request.userConstraints.join(", ")}` : ""}

The workflow should be:
1. COMPLETE - Has all stages needed for success (CP2000 level sophistication)
2. SIMPLE - Easy for non-lawyers to use
3. OPTIMIZED - Organized logically, minimal redundancy
4. INTELLIGENT - Includes analysis, strategy, validation

Design it with 8 pipeline stages:
1. INTAKE - What questions must we ask the user?
2. RESEARCH - What regulatory/legal research is needed?
3. ANALYSIS - What analysis is critical?
4. STRATEGY - What's the winning strategy?
5. DRAFT - What documents must be generated?
6. REVIEW - What validation/review is needed?
7. ASSEMBLY - How should it be packaged for delivery?
8. APPROVAL - What final checks before sending?

For EACH stage, provide:
- Purpose (1 sentence)
- Questions for user (if needed)
- AI analysis tasks (what Claude should research/analyze)
- Required outputs (documents, decisions, etc.)
- Success criteria (how we know it's done right)
- Estimated time

Response Format (JSON):
{
  "name": "workflow name",
  "description": "1-2 sentence user-facing description",
  "stages": [
    {
      "name": "intake",
      "title": "User-friendly stage title",
      "purpose": "Why this stage matters",
      "userQuestions": ["question 1", "question 2"],
      "aiTasks": ["task 1", "task 2"],
      "requiredOutputs": ["output 1", "output 2"],
      "successCriteria": ["criterion 1"],
      "estimatedMinutes": 30
    }
  ],
  "designRationale": "Why this workflow is structured this way",
  "estimatedTotalHours": 2.5,
  "successMetrics": ["metric 1", "metric 2"],
  "commonPitfalls": ["pitfall 1", "pitfall 2"]
}

Be specific. Be thorough. Design for both power-users AND first-time users.`;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW GENERATOR                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Generate a complete workflow using AI
 */
export async function generateWorkflow(
  request: WorkflowGenerationRequest
): Promise<GeneratedWorkflow> {
  const prompt = createWorkflowGenerationPrompt(request);

  console.log(`Generating workflow for: ${request.caseType}...`);

  // Send to Claude for generation
  const response = await llmProvider.sendMessage([
    {
      role: "user",
      content: prompt,
    },
  ]);

  // Parse response
  let design;
  try {
    // Extract JSON from response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    design = JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Failed to parse workflow design:", error);
    throw new Error(`Invalid workflow design from AI: ${response.text}`);
  }

  // Convert to WorkflowSpecification
  const specification = convertDesignToSpecification(design, request);

  return {
    name: design.name,
    description: design.description,
    specification,
    designRationale: design.designRationale,
    estimatedCompletionTime: `${design.estimatedTotalHours} hours`,
    successMetrics: design.successMetrics || [],
    commonPitfalls: design.commonPitfalls || [],
  };
}

/**
 * Convert AI-generated design to WorkflowSpecification
 */
function convertDesignToSpecification(
  design: any,
  request: WorkflowGenerationRequest
): WorkflowSpecification {
  const stages: PipelineStageConfig[] = (design.stages || []).map(
    (stage: any) => ({
      name: stage.name,
      title: stage.title || stage.name,
      description: stage.purpose,
      questions: stage.userQuestions || [],
      aiTasks: stage.aiTasks || [],
      outputs: stage.requiredOutputs || [],
      successCriteria: stage.successCriteria || [],
      estimatedMinutes: stage.estimatedMinutes || 60,
      requiresUserInput: (stage.userQuestions || []).length > 0,
      requiresReview: ["review", "approval"].includes(stage.name),
    })
  );

  return {
    id: `${request.verticalId}-${Date.now()}`,
    name: design.name,
    description: design.description,
    verticalId: request.verticalId,
    caseType: request.caseType,
    complexity: request.complexity,
    stages,
    requiredDocuments: extractRequiredDocuments(stages),
    successCriteria: design.successMetrics || [],
    intakeForms: generateIntakeForms(stages),
    aiPrompts: generateAIPrompts(stages),
  };
}

/**
 * Extract all required documents from workflow stages
 */
function extractRequiredDocuments(stages: PipelineStageConfig[]): string[] {
  const documents = new Set<string>();

  for (const stage of stages) {
    for (const output of stage.outputs) {
      if (
        output.toLowerCase().includes("document") ||
        output.toLowerCase().includes("letter") ||
        output.toLowerCase().includes("form")
      ) {
        documents.add(output);
      }
    }
  }

  return Array.from(documents);
}

/**
 * Generate intake forms based on user questions
 */
function generateIntakeForms(stages: PipelineStageConfig[]): any[] {
  const intakeStage = stages.find((s) => s.name === "intake");
  if (!intakeStage || !intakeStage.questions?.length) {
    return [];
  }

  return [
    {
      id: "intake-form",
      title: intakeStage.title,
      description: intakeStage.description,
      fields: intakeStage.questions.map((q: string) => ({
        id: q.toLowerCase().replace(/\s+/g, "_"),
        label: q,
        type: inferFieldType(q),
        required: true,
      })),
    },
  ];
}

/**
 * Infer field type from question
 */
function inferFieldType(question: string): string {
  const q = question.toLowerCase();
  if (
    q.includes("date") ||
    q.includes("when") ||
    q.includes("deadline")
  ) {
    return "date";
  }
  if (
    q.includes("email") ||
    q.includes("contact")
  ) {
    return "email";
  }
  if (
    q.includes("phone") ||
    q.includes("number")
  ) {
    return "phone";
  }
  if (
    q.includes("select") ||
    q.includes("choose") ||
    q.includes("which")
  ) {
    return "select";
  }
  if (
    q.includes("explain") ||
    q.includes("describe") ||
    q.includes("details")
  ) {
    return "textarea";
  }
  return "text";
}

/**
 * Generate AI prompts for each stage
 */
function generateAIPrompts(stages: PipelineStageConfig[]): any[] {
  return stages
    .filter((s) => (s.aiTasks || []).length > 0)
    .map((stage) => ({
      stageId: stage.name,
      stageName: stage.title,
      tasks: stage.aiTasks || [],
      prompt: generateStagePrompt(stage),
    }));
}

/**
 * Generate specific AI prompt for a stage
 */
function generateStagePrompt(stage: PipelineStageConfig): string {
  return `For the ${stage.title} stage of this workflow:

Tasks to complete:
${(stage.aiTasks || []).map((t) => `- ${t}`).join("\n")}

Required outputs:
${(stage.outputs || []).map((o) => `- ${o}`).join("\n")}

Success criteria:
${(stage.successCriteria || []).map((c) => `- ${c}`).join("\n")}

Please complete these tasks thoroughly and ensure all outputs meet the success criteria.`;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* BATCH WORKFLOW GENERATION                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Generate multiple workflows for a vertical
 */
export async function generateVerticalWorkflows(
  verticalId: string,
  caseTypes: string[]
): Promise<GeneratedWorkflow[]> {
  const workflows: GeneratedWorkflow[] = [];

  for (const caseType of caseTypes) {
    try {
      const workflow = await generateWorkflow({
        verticalId,
        caseType,
        complexity: "moderate",
      });
      workflows.push(workflow);
    } catch (error) {
      console.error(`Failed to generate workflow for ${caseType}:`, error);
    }
  }

  return workflows;
}

/**
 * Generate all immigration mail workflow variants
 */
export async function generateImmigrationMailWorkflows(): Promise<GeneratedWorkflow[]> {
  const caseTypes = [
    "USCIS Green Card Appeal",
    "USCIS Visa Application Response",
    "Embassy Consular Interview Follow-up",
    "FOIA Request to USCIS",
    "I-90 Green Card Replacement",
    "EAD/Work Permit Request",
    "Advance Parole (Travel Document)",
    "Asylum Application Response",
    "N-400 Naturalization Follow-up",
    "I-131 Advance Parole Appeal",
  ];

  return generateVerticalWorkflows("immigration-mail", caseTypes);
}

/**
 * Generate all CP workflows (similar to CP2000)
 */
export async function generateCPWorkflows(): Promise<GeneratedWorkflow[]> {
  const caseTypes = [
    "CP2000 - Accuracy Related Penalties",
    "CP2015 - Failure to Pay Taxes",
    "CP2016 - Failure to File",
    "CP2018 - Mathematical Errors",
    "CP2019 - Penalties and Interest",
    "CP2020 - Estimated Tax Underpayment",
  ];

  return generateVerticalWorkflows("cp-correspondence", caseTypes);
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW TEMPLATES                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Get example generated workflow (for demonstration)
 */
export function getExampleGeneratedWorkflow(): GeneratedWorkflow {
  return {
    name: "USCIS Green Card Appeal",
    description:
      "Appeal a denied or delayed green card application with comprehensive evidence presentation",
    specification: {
      id: "immigration-mail-gc-appeal",
      name: "USCIS Green Card Appeal",
      description:
        "Step-by-step process to appeal a denied green card with strong supporting evidence",
      verticalId: "immigration-mail",
      caseType: "USCIS Green Card Appeal",
      complexity: "complex",
      stages: [
        {
          name: "intake",
          title: "Gather Your Case Information",
          description: "What do we need to know about your case?",
          questions: [
            "What is your current visa status?",
            "When was your application denied?",
            "What was the stated reason for denial?",
            "Do you have a receipt number?",
            "What is your alien number?",
            "Have you appealed before?",
          ],
          aiTasks: [
            "Analyze the denial reason",
            "Identify appeal strategy options",
          ],
          outputs: [
            "Case summary",
            "Key facts identified",
            "Preliminary legal theory",
          ],
          successCriteria: [
            "All case facts captured",
            "Denial reason clearly understood",
          ],
          estimatedMinutes: 30,
          requiresUserInput: true,
          requiresReview: false,
        },
        {
          name: "research",
          title: "Research Regulations & Precedent",
          description:
            "Find applicable laws and successful similar cases",
          questions: [],
          aiTasks: [
            "Research USCIS regulations for this case type",
            "Find case law supporting appeal",
            "Identify agency precedent",
            "Analyze recent USCIS policy changes",
          ],
          outputs: [
            "Applicable regulations summary",
            "Supporting case law",
            "Agency precedent analysis",
            "Legal strategy brief",
          ],
          successCriteria: [
            "All relevant regulations identified",
            "Supporting case law documented",
            "Legal theory grounded in authority",
          ],
          estimatedMinutes: 120,
          requiresUserInput: false,
          requiresReview: true,
        },
        {
          name: "analysis",
          title: "Analyze Your Specific Situation",
          description: "How does the law apply to YOUR case?",
          questions: [],
          aiTasks: [
            "Map facts to legal requirements",
            "Identify strengths in your case",
            "Identify weaknesses to address",
            "Analyze burden of proof requirements",
          ],
          outputs: [
            "Fact-to-law mapping",
            "Strength/weakness analysis",
            "Risk assessment",
            "Evidence needs summary",
          ],
          successCriteria: [
            "All facts legally analyzed",
            "Clear path to success identified",
            "Evidence gaps identified",
          ],
          estimatedMinutes: 90,
          requiresUserInput: false,
          requiresReview: true,
        },
        {
          name: "strategy",
          title: "Develop Winning Strategy",
          description:
            "What is the best way to present your case?",
          questions: [
            "What evidence do you have?",
            "Are there witnesses?",
            "What timeline works best?",
          ],
          aiTasks: [
            "Develop argumentative strategy",
            "Prioritize evidence",
            "Plan evidence presentation order",
            "Draft persuasive outline",
          ],
          outputs: [
            "Detailed appeal strategy",
            "Evidence prioritization",
            "Argument framework",
            "Presentation timeline",
          ],
          successCriteria: [
            "Strategy grounded in law",
            "Evidence organized logically",
            "Likely to persuade USCIS",
          ],
          estimatedMinutes: 60,
          requiresUserInput: true,
          requiresReview: true,
        },
        {
          name: "draft",
          title: "Draft Appeal Letter & Documents",
          description: "Generate the appeal documents",
          questions: [],
          aiTasks: [
            "Draft formal appeal letter",
            "Create supporting affidavit template",
            "Draft evidence index",
            "Create cover letter",
          ],
          outputs: [
            "Formal appeal letter (ready to send)",
            "Supporting affidavit",
            "Evidence index",
            "Cover letter",
          ],
          successCriteria: [
            "Letter is persuasive and professional",
            "All legal arguments included",
            "Evidence properly referenced",
            "Formatting meets USCIS standards",
          ],
          estimatedMinutes: 120,
          requiresUserInput: false,
          requiresReview: true,
        },
        {
          name: "review",
          title: "Review & Edit",
          description: "Make sure everything is perfect",
          questions: [
            "Does this sound right?",
            "Any changes needed?",
            "Missing any evidence?",
          ],
          aiTasks: [
            "Review for legal accuracy",
            "Check for tone and persuasiveness",
            "Verify all references",
            "Final proofreading",
          ],
          outputs: [
            "Reviewed and corrected documents",
            "Final checklist",
            "Quality assurance sign-off",
          ],
          successCriteria: [
            "No grammatical errors",
            "All legal arguments sound",
            "Persuasive and professional",
            "Ready to send",
          ],
          estimatedMinutes: 45,
          requiresUserInput: true,
          requiresReview: true,
        },
        {
          name: "assembly",
          title: "Prepare for Delivery",
          description:
            "Package and format for mailing",
          questions: [
            "Where should this go?",
            "Do you need certified mail?",
            "Include any personal documents?",
          ],
          aiTasks: [
            "Generate mailing instructions",
            "Create document assembly checklist",
            "Generate mailing address",
            "Create tracking log",
          ],
          outputs: [
            "Complete document package",
            "Mailing instructions",
            "Tracking template",
            "Receipt-keeping guide",
          ],
          successCriteria: [
            "All documents in correct order",
            "Proper formatting for mailing",
            "Mailing address verified",
            "Tracking system ready",
          ],
          estimatedMinutes: 30,
          requiresUserInput: false,
          requiresReview: false,
        },
        {
          name: "approval",
          title: "Final Approval & Send",
          description: "Final review and send your appeal",
          questions: [
            "Ready to send?",
            "Any last-minute changes?",
          ],
          aiTasks: [
            "Final document review",
            "Verify all signatures/dates",
            "Generate delivery confirmation template",
          ],
          outputs: [
            "Final approval checklist",
            "Send confirmation",
            "Case follow-up schedule",
          ],
          successCriteria: [
            "All documents reviewed",
            "Ready to mail or file",
            "Tracking plan in place",
          ],
          estimatedMinutes: 15,
          requiresUserInput: true,
          requiresReview: true,
        },
      ],
      requiredDocuments: [
        "Formal appeal letter",
        "Supporting affidavit",
        "Evidence index",
        "Cover letter",
      ],
      successCriteria: [
        "Appeal submitted within filing deadline",
        "All supporting evidence included",
        "Legal arguments persuasive",
        "Proper formatting and procedure followed",
      ],
      intakeForms: [],
      aiPrompts: [],
    },
    designRationale:
      "This workflow mirrors CP2000's sophistication but optimized for immigration appeals. Each stage has clear user engagement points, AI does the heavy lifting, and it produces publication-ready documents.",
    estimatedCompletionTime: "6-8 hours",
    successMetrics: [
      "Appeal submitted on time",
      "All supporting evidence included",
      "Persuasive and professional presentation",
      "High likelihood of USCIS approval",
    ],
    commonPitfalls: [
      "Missing filing deadline",
      "Incomplete evidence",
      "Weak legal arguments",
      "Formatting not meeting USCIS standards",
      "Not addressing specific denial reasons",
    ],
  };
}
