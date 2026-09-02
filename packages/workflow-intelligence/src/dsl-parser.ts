/**
 * DSL Parser
 *
 * Parses Workflow DSL (YAML/JSON) specifications into WorkflowSpecification objects.
 * Validates DSL structure and converts to analysis-ready format.
 */

import YAML from "yaml";
import type {
  WorkflowDSL,
  WorkflowSpecification,
  DSLDocument,
  DSLQuestion,
  DSLValidationRule,
  DSLRiskFactor,
  DSLOutcomeMetric,
} from "./core";

export class DSLParser {
  /**
   * Parse YAML DSL into WorkflowSpecification
   */
  parseYaml(yamlContent: string): WorkflowSpecification {
    const dsl = YAML.parse(yamlContent) as WorkflowDSL;
    return this.parseWorkflow(dsl);
  }

  /**
   * Parse JSON DSL into WorkflowSpecification
   */
  parseJson(jsonContent: string): WorkflowSpecification {
    const dsl = JSON.parse(jsonContent) as WorkflowDSL;
    return this.parseWorkflow(dsl);
  }

  /**
   * Parse DSL object into WorkflowSpecification
   */
  private parseWorkflow(dsl: WorkflowDSL): WorkflowSpecification {
    const w = dsl.workflow;

    return {
      id: w.id,
      name: w.name,
      description: w.problem_statement || w.name,
      goal: w.goal,
      caseType: this.extractCaseType(w.id),
      userProblem: w.problem_statement || "",
      successCriteria: w.success_criteria || [],

      context: {
        agency: this.extractAgency(w.regulations),
        jurisdiction: "US",
        applicableRules: w.regulations || [],
        deadlines: undefined,
        precedent: [],
      },
    };
  }

  /**
   * Extract case type from workflow ID
   */
  private extractCaseType(id: string): string {
    // Convert ID to case type
    // "appeal-mail" -> "benefits_appeal", "dispute-mail" -> "debt_dispute"
    const mapping: Record<string, string> = {
      "appeal-mail": "benefits_appeal",
      "dispute-mail": "debt_dispute",
      "records-request": "foia_request",
      "notice-respond": "government_notice",
      "claim-proof": "insurance_claim",
      "tenant-reply": "housing_dispute",
    };

    return mapping[id] || id.replace(/-/g, "_");
  }

  /**
   * Extract agency from regulations
   */
  private extractAgency(regulations?: string[]): string | undefined {
    if (!regulations || regulations.length === 0) return undefined;

    // Parse agency from regulations
    // "42 USC 405" -> Social Security
    // "20 CFR 404" -> Social Security
    // "29 CFR 825" -> FMLA/Department of Labor

    const ruleText = regulations.join(" ");

    if (ruleText.includes("42 USC") || ruleText.includes("20 CFR 404")) {
      return "Social Security Administration";
    }
    if (
      ruleText.includes("29 CFR 825") ||
      ruleText.includes("FMLA")
    ) {
      return "Department of Labor";
    }
    if (ruleText.includes("Fair Debt Collection Practices Act")) {
      return "Consumer Financial Protection Bureau";
    }

    return undefined;
  }

  /**
   * Validate DSL structure
   */
  validateDSL(dsl: WorkflowDSL): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const w = dsl.workflow;

    if (!w.id) errors.push("workflow.id is required");
    if (!w.name) errors.push("workflow.name is required");
    if (!w.goal) errors.push("workflow.goal is required");

    if (w.required_documents) {
      for (const doc of w.required_documents) {
        if (!doc.id) errors.push("All documents must have an id");
        if (!doc.name) errors.push("All documents must have a name");
      }
    }

    if (w.intake_questions) {
      for (const q of w.intake_questions) {
        if (!q.id) errors.push("All questions must have an id");
        if (!q.question) errors.push("All questions must have a question field");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convert DSL documents to RequiredDocument format
   */
  parseDSLDocuments(dslDocs: DSLDocument[]): any[] {
    return dslDocs.map((doc) => ({
      id: doc.id,
      name: doc.name,
      description: doc.name,
      type: doc.type,
      examples: [],
      acceptedFormats: ["PDF", "JPG", "PNG"],
      whyRequired: doc.why || "Required to support your case",
      minCount: doc.min_count,
    }));
  }

  /**
   * Convert DSL questions to Question format
   */
  parseDSLQuestions(dslQuestions: DSLQuestion[]): any[] {
    return dslQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type || "text",
      required: q.required !== false,
      whyMatters: q.why_matters || "",
      options: q.options,
    }));
  }

  /**
   * Export WorkflowSpecification to DSL format
   */
  exportToDSL(spec: WorkflowSpecification): string {
    const dsl: WorkflowDSL = {
      workflow: {
        id: spec.id,
        name: spec.name,
        goal: spec.goal,
        problem_statement: spec.userProblem,
        success_criteria: spec.successCriteria,
        regulations: spec.context.applicableRules,
      },
    };

    return YAML.stringify(dsl);
  }

  /**
   * Create a basic DSL from workflow name
   */
  createBasicDSL(
    id: string,
    name: string,
    goal: string
  ): WorkflowDSL {
    return {
      workflow: {
        id,
        name,
        goal,
        problem_statement: goal,
        success_criteria: [],
        regulations: [],
        required_documents: [],
        optional_documents: [],
        intake_questions: [],
        pipeline_stages: [],
        validation_rules: [],
        success_factors: [],
        risk_factors: [],
      },
    };
  }
}

export const dslParser = new DSLParser();
