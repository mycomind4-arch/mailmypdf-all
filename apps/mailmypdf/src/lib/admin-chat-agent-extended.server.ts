/**
 * Admin Chat Agent - Extended Integration
 *
 * Connects the chat interface to the full agent system with:
 * - Web access and research
 * - File storage and data management
 * - Website operation and deployment
 * - Full tool access and automation
 */

import { createServerFn } from "@tanstack/start";
import { llmProvider } from "@mailmypdf/workflow-intelligence";
import { logger, withErrorHandling } from "@/lib/security";
import {
  getOrCreateAgent,
  getAgent,
} from "@/lib/admin-agent-core.server";
import {
  executeTool,
  listAvailableTools,
  getTool,
  AGENT_TOOLS,
} from "@/lib/admin-agent-tools.server";
import { z } from "zod";

/* ─────────────────────────────────────────────────────────────────────────── */
/* EXTENDED AGENT INTERFACE                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */

interface ToolCall {
  toolName: string;
  parameters: Record<string, any>;
  reasoning: string;
}

interface AgentResponse {
  message: string;
  toolCalls: ToolCall[];
  decisions: Array<{
    type: string;
    description: string;
    requiresApproval: boolean;
  }>;
  nextSteps: string[];
}

/**
 * Process admin command with full agent capabilities
 */
export const processAdminCommandExtended = createServerFn(
  { method: "POST" },
  async (request: unknown) => {
    const schema = z.object({
      message: z.string(),
      workspaceId: z.string().optional(),
      conversationHistory: z.array(z.any()).optional(),
    });

    const validated = z.safeParse(request, schema);
    if (!validated.success) {
      throw new Error("Invalid request");
    }

    const { message, workspaceId = "default" } = validated.data;

    return withErrorHandling(
      async () => {
        logger.info("Processing extended admin command", {
          message,
          workspaceId,
        });

        // Initialize or get agent
        const agent = getOrCreateAgent(workspaceId);

        // Use Claude to understand the request and plan actions
        const plan = await planActions(message, workspaceId);

        // Execute planned tool calls
        const toolResults: Array<{
          toolName: string;
          success: boolean;
          result?: any;
          error?: string;
        }> = [];

        for (const toolCall of plan.toolCalls) {
          const result = await executeTool(
            toolCall.toolName,
            toolCall.parameters
          );
          toolResults.push({
            toolName: toolCall.toolName,
            ...result,
          });
        }

        // Generate response
        const response = await generateExtendedResponse(message, plan, toolResults);

        return {
          response: response.message,
          toolCalls: plan.toolCalls,
          decisions: plan.decisions,
          nextSteps: response.nextSteps,
          agentStatus: agent.getStatus(),
        };
      },
      { path: "/api/admin/chat-agent-extended", method: "POST" }
    );
  }
);

/* ─────────────────────────────────────────────────────────────────────────── */
/* ACTION PLANNING                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

async function planActions(
  message: string,
  workspaceId: string
): Promise<{
  toolCalls: ToolCall[];
  decisions: Array<{
    type: string;
    description: string;
    requiresApproval: boolean;
  }>;
  reasoning: string;
}> {
  const availableTools = listAvailableTools();

  const prompt = `You are an autonomous AI agent managing a complex digital platform.

Your capabilities include:
${availableTools.map((t) => `- ${t.name}: ${t.description} (requires approval: ${t.requiresApproval})`).join("\n")}

User request: "${message}"

Workspace ID: ${workspaceId}

Analyze this request and plan the necessary actions:

1. What tools need to be called?
2. In what order?
3. What parameters do they need?
4. What decisions need user approval?

Respond with ONLY valid JSON (no other text):
{
  "reasoning": "Your analysis of what needs to happen",
  "toolCalls": [
    {
      "toolName": "tool_name",
      "parameters": { "param": "value" },
      "reasoning": "Why this tool is needed"
    }
  ],
  "decisions": [
    {
      "type": "deployment|automation|config",
      "description": "What needs approval",
      "requiresApproval": true
    }
  ],
  "nextSteps": ["Step 1", "Step 2"]
}`;

  const response = await llmProvider.sendMessage([
    {
      role: "user",
      content: prompt,
    },
  ]);

  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    const plan = JSON.parse(jsonMatch[0]);

    // Validate tool calls exist
    if (plan.toolCalls && Array.isArray(plan.toolCalls)) {
      plan.toolCalls = plan.toolCalls.filter((tc: any) =>
        AGENT_TOOLS[tc.toolName]
      );
    } else {
      plan.toolCalls = [];
    }

    return plan;
  } catch (error) {
    logger.error("Failed to plan actions", { error, message });
    return {
      reasoning: "Unable to plan actions for this request",
      toolCalls: [],
      decisions: [],
      nextSteps: [],
    };
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* RESPONSE GENERATION                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */

async function generateExtendedResponse(
  userMessage: string,
  plan: {
    toolCalls: ToolCall[];
    decisions: any[];
    reasoning: string;
  },
  toolResults: Array<{
    toolName: string;
    success: boolean;
    result?: any;
    error?: string;
  }>
): Promise<{
  message: string;
  nextSteps: string[];
}> {
  const successCount = toolResults.filter((r) => r.success).length;
  const failureCount = toolResults.filter((r) => !r.success).length;

  const prompt = `You are an AI platform manager. Summarize what just happened.

User request: "${userMessage}"

Planning reasoning: ${plan.reasoning}

Tools executed:
${toolResults
  .map((r) => {
    const tool = getTool(r.toolName);
    return `- ${r.toolName}: ${r.success ? "✓ Success" : "✗ Failed"}${r.error ? ` (${r.error})` : ""}`;
  })
  .join("\n")}

Generate a conversational response that:
1. Confirms what was done
2. Highlights any issues
3. Suggests next steps
4. Provides actionable insights

Keep it friendly and professional.`;

  const response = await llmProvider.sendMessage([
    {
      role: "user",
      content: prompt,
    },
  ]);

  return {
    message: response.text,
    nextSteps: plan.decisions.length > 0
      ? [
          `Review ${plan.decisions.length} decision(s) awaiting approval`,
          "Check agent memory for learned patterns",
          "Monitor pending automations",
        ]
      : [
          "All actions completed successfully",
          "Check agent status for updates",
          "Review stored data and files",
        ],
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* AGENT STATUS & CONTROL                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Get complete agent status
 */
export const getAgentStatus = createServerFn({ method: "GET" }, async () => {
  return withErrorHandling(
    async () => {
      const agent = getAgent();
      return {
        status: agent.getStatus(),
        memory: agent.getMemory(),
        availableTools: listAvailableTools(),
      };
    },
    { path: "/api/admin/agent-status", method: "GET" }
  );
});

/**
 * List all available tools
 */
export const listAgentTools = createServerFn(
  { method: "GET" },
  async (category?: string) => {
    return withErrorHandling(
      async () => {
        const tools = listAvailableTools();
        if (category) {
          return tools.filter((t) => t.category === category);
        }
        return tools;
      },
      { path: "/api/admin/agent-tools", method: "GET" }
    );
  }
);

/**
 * Execute a specific tool directly
 */
export const executeAgentTool = createServerFn(
  { method: "POST" },
  async (request: unknown) => {
    const schema = z.object({
      toolName: z.string(),
      parameters: z.record(z.any()),
    });

    const validated = z.safeParse(request, schema);
    if (!validated.success) {
      throw new Error("Invalid request");
    }

    const { toolName, parameters } = validated.data;

    return withErrorHandling(
      async () => {
        const tool = getTool(toolName);

        if (!tool) {
          throw new Error(`Tool not found: ${toolName}`);
        }

        if (tool.requiresApproval) {
          const agent = getAgent();
          return await agent.requestApproval(
            "tool-execution",
            `Execute ${toolName}`,
            { toolName, parameters }
          );
        }

        return await executeTool(toolName, parameters);
      },
      { path: `/api/admin/agent-tool/${toolName}`, method: "POST" }
    );
  }
);

/**
 * Get pending approvals
 */
export const getAgentPendingApprovals = createServerFn(
  { method: "GET" },
  async () => {
    return withErrorHandling(
      async () => {
        const agent = getAgent();
        return await agent.getPendingApprovals();
      },
      { path: "/api/admin/agent-approvals", method: "GET" }
    );
  }
);

/**
 * Approve a decision
 */
export const approveAgentDecision = createServerFn(
  { method: "POST" },
  async (decisionId: unknown) => {
    const validated = z.string().safeParse(decisionId);
    if (!validated.success) {
      throw new Error("Invalid decision ID");
    }

    return withErrorHandling(
      async () => {
        const agent = getAgent();
        return await agent.approveDecision(validated.data);
      },
      { path: "/api/admin/agent-approve", method: "POST" }
    );
  }
);

/**
 * Reject a decision
 */
export const rejectAgentDecision = createServerFn(
  { method: "POST" },
  async (decisionId: unknown) => {
    const validated = z.string().safeParse(decisionId);
    if (!validated.success) {
      throw new Error("Invalid decision ID");
    }

    return withErrorHandling(
      async () => {
        const agent = getAgent();
        return await agent.rejectDecision(validated.data);
      },
      { path: "/api/admin/agent-reject", method: "POST" }
    );
  }
);
