/**
 * Workflow Analyzer
 *
 * Uses Claude to analyze workflow specifications and determine:
 * - Required documents
 * - User questions to ask
 * - Pipeline stages
 * - Validation rules
 * - Success factors
 * - Risk factors
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  WorkflowSpecification,
  WorkflowAnalysis,
  RegulatoryResearch,
  RequiredDocument,
  Question,
  ValidationRule,
  RiskFactor,
  CasePattern,
} from "./core";

const client = new Anthropic();

export class WorkflowAnalyzer {
  /**
   * Analyze a workflow specification and determine all requirements
   */
  async analyzeWorkflow(
    spec: WorkflowSpecification,
    regulatoryResearch?: RegulatoryResearch
  ): Promise<WorkflowAnalysis> {
    const prompt = this.buildAnalysisPrompt(spec, regulatoryResearch);

    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const analysis = JSON.parse(content.text);

    return {
      workflowId: spec.id,
      workflowName: spec.name,
      analysisTimestamp: new Date().toISOString(),
      ...analysis,
    };
  }

  /**
   * Generate intake questions for a workflow
   */
  async generateIntakeQuestions(
    analysis: WorkflowAnalysis
  ): Promise<Question[]> {
    const prompt = `
      You are a workflow design expert. Generate the most important intake questions
      for this workflow.

      Workflow: ${analysis.workflowName}
      Goal: ${analysis.requiredInformation.map((r) => r.name).join(", ")}

      Required Information:
      ${JSON.stringify(analysis.requiredInformation, null, 2)}

      Success Factors:
      ${analysis.successFactors.join("\n")}

      Generate 5-10 key intake questions that will:
      1. Understand the user's situation
      2. Gather critical information
      3. Identify potential issues early
      4. Guide them toward a strong case

      For each question:
      - Make it clear and simple
      - Explain why it matters
      - Suggest examples/options
      - Indicate if required or optional
      - Include help text

      Order by importance (what matters most first).

      Return as JSON array of question objects.
    `;

    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    return JSON.parse(content.text);
  }

  /**
   * Generate validation rules based on what makes cases succeed/fail
   */
  async generateValidationRules(
    analysis: WorkflowAnalysis
  ): Promise<ValidationRule[]> {
    const prompt = `
      You are a workflow validation expert. Generate validation rules that will
      ensure users provide strong, complete cases.

      Workflow: ${analysis.workflowName}

      Success Factors:
      ${analysis.successFactors.join("\n")}

      Failure Patterns:
      ${analysis.failurePatterns.join("\n")}

      Risk Factors:
      ${analysis.riskFactors.map((r) => `${r.name}: ${r.description}`).join("\n")}

      Generate validation rules for different stages:
      1. Intake validation (did they answer questions properly?)
      2. Document validation (do they have required docs?)
      3. Case strength validation (is this a strong case?)
      4. Final validation (before sending)

      Each rule should:
      - Check one specific thing
      - Have a clear error message
      - Explain how to fix the issue
      - Note the impact (e.g., "affects success rate by -30%")

      Return as JSON array of validation rule objects.
    `;

    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    return JSON.parse(content.text);
  }

  /**
   * Analyze successful and failed cases to extract patterns
   */
  async analyzeCasePatterns(
    successfulCases: any[],
    failedCases: any[]
  ): Promise<{
    successPatterns: CasePattern[];
    failurePatterns: CasePattern[];
  }> {
    const prompt = `
      Analyze these successful and failed case examples to identify patterns.

      SUCCESSFUL CASES:
      ${JSON.stringify(successfulCases.slice(0, 10), null, 2)}

      FAILED CASES:
      ${JSON.stringify(failedCases.slice(0, 10), null, 2)}

      For both successful and failed cases, identify:
      1. Common characteristics
      2. What made them succeed/fail
      3. Actionable recommendations

      Return as JSON with:
      {
        successPatterns: [...],
        failurePatterns: [...]
      }
    `;

    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    return JSON.parse(content.text);
  }

  /**
   * Generate strategy and drafting prompts for a workflow
   */
  async generateStrategyPrompt(analysis: WorkflowAnalysis): Promise<string> {
    const prompt = `
      You are an expert in ${analysis.workflowName}.

      Goal: ${analysis.successFactors.join(", ")}

      Generate a detailed system prompt that will guide Claude in analyzing
      cases and developing strategy for this workflow.

      The prompt should instruct Claude to:
      1. Analyze the situation deeply
      2. Research applicable regulations
      3. Identify the strongest arguments
      4. Recommend evidence to include
      5. Explain reasoning clearly
      6. Consider counter-arguments
      7. Suggest mitigation strategies

      The prompt will be used to analyze user cases, so make it comprehensive
      but clear.

      Return only the system prompt text, no JSON.
    `;

    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    return content.text;
  }

  /**
   * Build the comprehensive analysis prompt
   */
  private buildAnalysisPrompt(
    spec: WorkflowSpecification,
    research?: RegulatoryResearch
  ): string {
    return `
      You are a workflow design expert. Analyze this workflow specification
      and determine all requirements for building a high-quality workflow.

      WORKFLOW SPECIFICATION:
      ID: ${spec.id}
      Name: ${spec.name}
      Goal: ${spec.goal}
      Problem: ${spec.userProblem}
      Success Criteria: ${spec.successCriteria.join(", ")}

      CONTEXT:
      Agency: ${spec.context.agency || "Not specified"}
      Jurisdiction: ${spec.context.jurisdiction || "Not specified"}
      Applicable Rules: ${spec.context.applicableRules?.join(", ") || "Not specified"}
      Deadlines: ${spec.context.deadlines || "Not specified"}

      ${
        research
          ? `
      REGULATORY RESEARCH:
      Requirements:
      ${research.requirements.map((r) => `- ${r.title}: ${r.text}`).join("\n")}

      Precedent:
      ${research.precedent
        .slice(0, 5)
        .map(
          (p) => `
        - ${p.caseNumber || "Unnamed"}: ${p.outcome}
          Key Facts: ${p.keyFacts.join("; ")}
          Successful Arguments: ${p.successfulArguments?.join("; ") || "None"}
      `
        )
        .join("\n")}

      Deadline Info:
      ${research.deadlines.map((d) => `- ${d.event}: ${d.deadline}`).join("\n")}
      `
          : ""
      }

      ANALYSIS REQUIRED:

      1. REQUIRED DOCUMENTS
         - What documents MUST the user provide?
         - Why is each document needed?
         - What are acceptable alternatives?
         - Return as array of { id, name, description, examples, acceptedFormats, whyRequired, alternatives }

      2. OPTIONAL DOCUMENTS
         - What documents would strengthen the case?
         - Why would they help?
         - Return same format as required

      3. REQUIRED INFORMATION
         - What information must we gather from the user?
         - Why does each piece matter?
         - What validates correctness?
         - Return as array of { id, name, description, dataType, required, whyNeeded, options }

      4. PIPELINE STAGES
         - What are the major stages of this workflow?
         - What happens at each stage?
         - How are they ordered?
         - Return as array of stage names in order

      5. VALIDATION RULES
         - What makes a case strong vs weak?
         - What red flags should we check for?
         - What could make this fail?
         - Return as array of { stage, rule, severity, message, howToFix }

      6. SUCCESS FACTORS
         - What evidence/arguments are most persuasive?
         - What makes cases succeed?
         - List 5-10 key success factors

      7. FAILURE PATTERNS
         - What causes cases to fail?
         - What mistakes do users make?
         - List 5-10 common failure patterns

      8. RISK FACTORS
         - What could backfire?
         - What should users be warned about?
         - What needs human review?
         - Return as array of { name, description, severity, howToMitigate, detectableVia }

      9. CASE PATTERNS
         - What types of cases are successful?
         - What types fail?
         - Return as array of { name, description, characteristics, successRate, recommendations }

      10. DRAFTING STYLE & TONE
          - What tone/style is most effective for this workflow?
          - Should it be formal, friendly, assertive?
          - Return as { draftingStyle, recommendedTone, reasoning }

      11. USER GUIDANCE TEXT
          - Guidance for intake stage
          - Guidance for document gathering
          - Guidance for strategy phase
          - Keep each under 200 words

      Return all results as a single JSON object with these keys:
      {
        requiredDocuments: [...],
        optionalDocuments: [...],
        requiredInformation: [...],
        pipelineStages: [...],
        validationRules: [...],
        successFactors: [...],
        failurePatterns: [...],
        riskFactors: [...],
        successfulCasePatterns: [...],
        failedCasePatterns: [...],
        draftingStyle: "...",
        recommendedTone: "...",
        userGuidance: {
          intake: "...",
          documentGuidance: "...",
          strategyExplanation: "..."
        }
      }
    `;
  }
}

export const analyzer = new WorkflowAnalyzer();
