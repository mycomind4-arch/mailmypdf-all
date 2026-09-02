/**
 * Regulatory Research
 *
 * Research regulations, precedent, and agency procedures automatically.
 * Fetches current legal requirements and analyzes them for workflow requirements.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  RegulatoryResearch,
  RegulatoryRequirement,
  LegalPrecedent,
  AgencyInfo,
  DeadlineInfo,
} from "./core";

const client = new Anthropic();

interface ResearchQuery {
  agency?: string;
  jurisdiction?: string;
  applicableRules?: string[];
  caseType: string;
  query: string;
}

export class RegulatoryResearcher {
  /**
   * Research regulations applicable to a workflow
   */
  async researchRegulations(
    query: ResearchQuery
  ): Promise<RegulatoryResearch> {
    // Fetch from multiple sources
    const requirements = await this.fetchRegulatoryRequirements(query);
    const precedent = await this.researchLegalPrecedent(query);
    const agencies = await this.findApplicableAgencies(query);
    const deadlines = await this.extractDeadlines(query);

    return {
      query: query.query,
      requirements,
      precedent,
      agencies,
      deadlines,
    };
  }

  /**
   * Fetch regulatory requirements using Claude
   */
  private async fetchRegulatoryRequirements(
    query: ResearchQuery
  ): Promise<RegulatoryRequirement[]> {
    const prompt = `
      You are a legal research expert. Research and summarize the regulatory
      requirements for this query.

      Case Type: ${query.caseType}
      Agency: ${query.agency || "Any"}
      Jurisdiction: ${query.jurisdiction || "US Federal"}
      Applicable Rules: ${query.applicableRules?.join(", ") || "Any"}
      Query: ${query.query}

      Find and summarize:
      1. Statutory requirements (what the law requires)
      2. Regulatory requirements (what agencies require)
      3. Procedural requirements (how to comply)
      4. Documentation requirements (what to submit)
      5. Timing requirements (deadlines, schedules)
      6. Format requirements (how to submit)

      For each requirement found, provide:
      - Title: Clear name
      - Source: Citation (e.g., "42 USC 405")
      - Text: Full description
      - Requirements: Specific requirements as array
      - Exceptions: Any exceptions or alternatives
      - Penalties: What happens if you don't comply

      Return as JSON array of regulatory requirements.
      If no regulations found, return empty array with reasoning.
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
      return [];
    }

    try {
      return JSON.parse(content.text);
    } catch {
      return [];
    }
  }

  /**
   * Research legal precedent for a case type
   */
  private async researchLegalPrecedent(
    query: ResearchQuery
  ): Promise<LegalPrecedent[]> {
    const prompt = `
      You are a legal research expert. Research case law precedent for this
      type of case.

      Case Type: ${query.caseType}
      Jurisdiction: ${query.jurisdiction || "US Federal"}
      Query: ${query.query}

      Find important precedent cases and summarize:
      1. Case citation and outcome (success/failure/partial)
      2. Key facts that led to the outcome
      3. Successful arguments (if success)
      4. Failed arguments (if failure)
      5. Court reasoning
      6. How applicable to this workflow

      Focus on:
      - Leading cases in this area
      - Recent important decisions
      - Cases establishing key legal principles
      - Precedent that affects strategy

      For each case, provide:
      - caseNumber: Citation
      - jurisdiction: Where decided
      - caseType: Type of case
      - outcome: success/failure/partial
      - keyFacts: Array of key facts
      - successfulArguments: Array of arguments that worked (if success)
      - failedArguments: Array of arguments that didn't work (if failure)
      - reasoning: Court's reasoning
      - applicability: high/medium/low for this workflow
      - sourceUrl: Link if available

      Return as JSON array of precedent cases.
      If no precedent found, provide general guidance on what has worked.
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
      return [];
    }

    try {
      return JSON.parse(content.text);
    } catch {
      return [];
    }
  }

  /**
   * Find applicable agencies and their procedures
   */
  private async findApplicableAgencies(
    query: ResearchQuery
  ): Promise<AgencyInfo[]> {
    const prompt = `
      You are a government procedures expert. Identify the agencies
      responsible for handling this type of case.

      Case Type: ${query.caseType}
      Agency: ${query.agency || "Unknown"}
      Jurisdiction: ${query.jurisdiction || "US Federal"}

      For each applicable agency, provide:
      - name: Agency name
      - jurisdiction: Level (Federal, State, Local)
      - procedures: Array of procedures they follow
      - contactInfo: { phone, website, address }
      - responseTime: Expected time to respond
      - appealDeadline: Deadline for appealing decision

      Include:
      1. Primary agency handling this case type
      2. Appeal/reconsideration procedures
      3. Secondary agencies that might be involved
      4. Contact information and procedures

      Return as JSON array of agency info.
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
      return [];
    }

    try {
      return JSON.parse(content.text);
    } catch {
      return [];
    }
  }

  /**
   * Extract important deadlines
   */
  private async extractDeadlines(
    query: ResearchQuery
  ): Promise<DeadlineInfo[]> {
    const prompt = `
      You are a legal deadline expert. Identify all important deadlines
      for this type of case.

      Case Type: ${query.caseType}
      Jurisdiction: ${query.jurisdiction || "US Federal"}

      For each deadline, provide:
      - event: What triggers this deadline
      - deadline: The deadline (e.g., "30 days", "December 31")
      - format: "days" (relative) or "calendar_date" (fixed)
      - fromEvent: What event the deadline counts from
      - consequences: Array of consequences for missing deadline

      Include:
      1. Filing deadlines
      2. Appeal/reconsideration deadlines
      3. Response deadlines from agencies
      4. Evidence submission deadlines
      5. Any other time-critical dates

      Return as JSON array of deadline info.
    `;

    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return [];
    }

    try {
      return JSON.parse(content.text);
    } catch {
      return [];
    }
  }

  /**
   * Get summary of key regulations for a workflow
   */
  async getRegulatorySummary(
    workflowType: string
  ): Promise<{
    keyRequirements: string[];
    mustHaveDocs: string[];
    criticalDeadlines: string[];
    agencyContact: string;
  }> {
    const prompt = `
      Provide a quick summary of key regulatory requirements for:
      Workflow Type: ${workflowType}

      Return as JSON with:
      {
        keyRequirements: [...],
        mustHaveDocs: [...],
        criticalDeadlines: [...],
        agencyContact: "..."
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
        keyRequirements: [],
        mustHaveDocs: [],
        criticalDeadlines: [],
        agencyContact: "",
      };
    }

    try {
      return JSON.parse(content.text);
    } catch {
      return {
        keyRequirements: [],
        mustHaveDocs: [],
        criticalDeadlines: [],
        agencyContact: "",
      };
    }
  }
}

export const researcher = new RegulatoryResearcher();
