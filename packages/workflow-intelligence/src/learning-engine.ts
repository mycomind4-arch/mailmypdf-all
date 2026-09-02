/**
 * Learning Engine
 *
 * Learns from workflow outcomes to continuously improve workflows.
 * Analyzes success/failure patterns and recommends improvements.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  WorkflowOutcome,
  WorkflowLearnings,
  SuccessFactor,
  FailurePattern,
  DocumentCombination,
  CommonIssue,
} from "./core";

const client = new Anthropic();

export class LearningEngine {
  /**
   * Learn from completed workflow outcomes
   */
  async learnFromOutcomes(
    workflowId: string,
    outcomes: WorkflowOutcome[]
  ): Promise<WorkflowLearnings> {
    if (outcomes.length === 0) {
      return this.getDefaultLearnings(workflowId);
    }

    // Calculate metrics
    const successRate = outcomes.filter((o) => o.success).length / outcomes.length;
    const successfulCases = outcomes.filter((o) => o.success);
    const failedCases = outcomes.filter((o) => !o.success);

    // Analyze patterns
    const successFactors = await this.analyzeSuccessPatterns(successfulCases);
    const failurePatterns = await this.analyzeFailurePatterns(failedCases);
    const documentCombos = this.analyzeDocumentCombinations(outcomes);
    const commonIssues = this.identifyCommonIssues(outcomes);
    const dropoffStages = this.findDropoffStages(outcomes);
    const revisionRates = this.calculateRevisionRates(outcomes);
    const successByDocCount = this.correlateSuccessByDocumentCount(outcomes);

    // Average case strength
    const avgStrength =
      outcomes.reduce((sum, o) => {
        const strengthValue =
          o.caseStrength === "strong"
            ? 3
            : o.caseStrength === "moderate"
              ? 2
              : o.caseStrength === "weak"
                ? 1
                : 0;
        return sum + strengthValue;
      }, 0) / outcomes.length;

    const averageCaseStrength =
      avgStrength > 2.5
        ? ("strong" as const)
        : avgStrength > 1.5
          ? ("moderate" as const)
          : ("weak" as const);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(
      successFactors,
      failurePatterns,
      documentCombos,
      successRate
    );

    return {
      workflowId,
      totalCases: outcomes.length,
      successRate,
      averageCaseStrength,
      successFactors,
      failurePatterns,
      strongDocumentCombinations: documentCombos,
      recommendedDocuments: recommendations.recommendedDocuments,
      criticalQuestions: recommendations.criticalQuestions,
      commonIssues,
      averageTimeToComplete:
        outcomes.reduce((sum, o) => sum + o.timeToComplete, 0) /
        outcomes.length,
      dropoffStages,
      revisionRates,
      successByDocumentCount: successByDocCount,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Analyze what makes successful cases succeed
   */
  private async analyzeSuccessPatterns(
    successfulCases: WorkflowOutcome[]
  ): Promise<SuccessFactor[]> {
    if (successfulCases.length === 0) return [];

    const prompt = `
      Analyze these successful case outcomes and identify what made them succeed.

      SUCCESSFUL CASES:
      ${JSON.stringify(successfulCases.slice(0, 20), null, 2)}

      For each case, extract:
      1. Key characteristics that led to success
      2. Documents included
      3. Information provided
      4. Time to completion
      5. Case strength

      Identify patterns:
      - What do all/most successful cases have in common?
      - What documents appear in successful cases?
      - What information is most important?
      - How quickly do successful cases complete?

      Return as JSON array of success factors:
      {
        name: "...",
        impact: 0.0-1.0,
        frequency: 0.0-1.0,
        reasoning: "...",
        howToEncourage: "..."
      }
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
    if (content.type !== "text") return [];

    try {
      return JSON.parse(content.text);
    } catch {
      return [];
    }
  }

  /**
   * Analyze failure patterns
   */
  private async analyzeFailurePatterns(
    failedCases: WorkflowOutcome[]
  ): Promise<FailurePattern[]> {
    if (failedCases.length === 0) return [];

    const prompt = `
      Analyze these failed case outcomes and identify what caused failures.

      FAILED CASES:
      ${JSON.stringify(failedCases.slice(0, 20), null, 2)}

      For each case, identify:
      1. What likely caused the failure
      2. What documents were missing
      3. What information was incomplete
      4. Quality issues with submissions
      5. Timing problems

      Identify patterns:
      - Common reasons for failure
      - Missing documents in failed cases
      - Information gaps
      - Submission quality issues

      Return as JSON array of failure patterns:
      {
        name: "...",
        impact: 0.0-1.0,
        frequency: 0.0-1.0,
        description: "...",
        howToPrevent: "..."
      }
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
    if (content.type !== "text") return [];

    try {
      return JSON.parse(content.text);
    } catch {
      return [];
    }
  }

  /**
   * Analyze which document combinations lead to success
   */
  private analyzeDocumentCombinations(
    outcomes: WorkflowOutcome[]
  ): DocumentCombination[] {
    const combinations = new Map<string, { success: number; total: number }>();

    for (const outcome of outcomes) {
      // Create a key from documents included
      // This would need to be expanded based on actual document tracking
      const key = `${outcome.documentsIncluded}docs`;

      if (!combinations.has(key)) {
        combinations.set(key, { success: 0, total: 0 });
      }

      const stats = combinations.get(key)!;
      stats.total++;
      if (outcome.success) stats.success++;
    }

    const results: DocumentCombination[] = [];

    for (const [docs, stats] of combinations.entries()) {
      results.push({
        documents: [docs],
        successRate: stats.success / stats.total,
        frequency: stats.total / outcomes.length,
        recommendation:
          stats.success / stats.total > 0.7
            ? "Encourage this document combination"
            : stats.success / stats.total > 0.4
              ? "This combination is acceptable but could be stronger"
              : "Avoid this combination",
      });
    }

    return results.sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Identify common issues users encounter
   */
  private identifyCommonIssues(outcomes: WorkflowOutcome[]): CommonIssue[] {
    const issues: CommonIssue[] = [];

    // Analyze feedback
    const feedbackByIssue = new Map<string, number>();
    for (const outcome of outcomes) {
      if (outcome.feedback) {
        feedbackByIssue.set(
          outcome.feedback,
          (feedbackByIssue.get(outcome.feedback) || 0) + 1
        );
      }
    }

    // Convert to issues
    for (const [issue, count] of feedbackByIssue.entries()) {
      if (count >= 2) {
        // Only include issues mentioned 2+ times
        issues.push({
          issue,
          frequency: count / outcomes.length,
          stage: "unknown", // Would need to track in outcomes
          impact: -0.1,
          suggestedFix: `Address user feedback about: ${issue}`,
        });
      }
    }

    return issues.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Find stages where users drop off most
   */
  private findDropoffStages(outcomes: WorkflowOutcome[]): string[] {
    // This requires tracking which stage users complete
    // For now, return empty - would need enhanced outcome tracking
    return [];
  }

  /**
   * Calculate revision rates by stage
   */
  private calculateRevisionRates(outcomes: WorkflowOutcome[]): Map<string, number> {
    // This requires tracking revisions by stage
    // For now, return empty map - would need enhanced outcome tracking
    return new Map();
  }

  /**
   * Correlate success rate with number of documents
   */
  private correlateSuccessByDocumentCount(
    outcomes: WorkflowOutcome[]
  ): Map<number, number> {
    const byDocCount = new Map<number, { success: number; total: number }>();

    for (const outcome of outcomes) {
      if (!byDocCount.has(outcome.documentsIncluded)) {
        byDocCount.set(outcome.documentsIncluded, { success: 0, total: 0 });
      }

      const stats = byDocCount.get(outcome.documentsIncluded)!;
      stats.total++;
      if (outcome.success) stats.success++;
    }

    const result = new Map<number, number>();
    for (const [count, stats] of byDocCount.entries()) {
      result.set(count, stats.success / stats.total);
    }

    return result;
  }

  /**
   * Generate recommendations based on learnings
   */
  private async generateRecommendations(
    successFactors: SuccessFactor[],
    failurePatterns: FailurePattern[],
    documentCombos: DocumentCombination[],
    successRate: number
  ): Promise<{
    recommendedDocuments: string[];
    criticalQuestions: string[];
  }> {
    const prompt = `
      Based on these case analysis results, what should we:
      1. Always require as documents
      2. Always ask as critical questions

      SUCCESS FACTORS:
      ${JSON.stringify(successFactors.slice(0, 5), null, 2)}

      FAILURE PATTERNS:
      ${JSON.stringify(failurePatterns.slice(0, 5), null, 2)}

      DOCUMENT COMBINATIONS (Success Rate):
      ${JSON.stringify(documentCombos.slice(0, 5), null, 2)}

      OVERALL SUCCESS RATE: ${(successRate * 100).toFixed(1)}%

      Return JSON with:
      {
        recommendedDocuments: [...],
        criticalQuestions: [...]
      }
    `;

    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return {
        recommendedDocuments: [],
        criticalQuestions: [],
      };
    }

    try {
      return JSON.parse(content.text);
    } catch {
      return {
        recommendedDocuments: [],
        criticalQuestions: [],
      };
    }
  }

  /**
   * Get default learnings when no outcomes exist
   */
  private getDefaultLearnings(workflowId: string): WorkflowLearnings {
    return {
      workflowId,
      totalCases: 0,
      successRate: 0,
      averageCaseStrength: "unknown" as any,
      successFactors: [],
      failurePatterns: [],
      strongDocumentCombinations: [],
      recommendedDocuments: [],
      criticalQuestions: [],
      commonIssues: [],
      averageTimeToComplete: 0,
      dropoffStages: [],
      revisionRates: new Map(),
      successByDocumentCount: new Map(),
      lastUpdated: new Date().toISOString(),
    };
  }
}

export const learningEngine = new LearningEngine();
