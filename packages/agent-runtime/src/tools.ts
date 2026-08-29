export type ToolRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface ToolContext {
  runId: string
  caseId?: string
  actorId?: string
  signal?: AbortSignal
}

export interface ToolDefinition<I = unknown, O = unknown> {
  name: string
  description: string
  risk: ToolRisk
  requiresApproval: boolean
  reversible: boolean
  idempotent: boolean
  inputSchema?: unknown
  execute(input: I, context: ToolContext): Promise<O>
}

export interface ToolInvocation<I = unknown> {
  tool: string
  input: I
  runId: string
  caseId?: string
  idempotencyKey: string
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>()

  register<I, O>(tool: ToolDefinition<I, O>): void {
    if (!tool.name.trim()) throw new Error('Tool name is required')
    if (this.tools.has(tool.name)) throw new Error(`Tool already registered: ${tool.name}`)
    this.tools.set(tool.name, tool as ToolDefinition)
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()]
  }

  assertCanInvoke(name: string, approved: boolean): ToolDefinition {
    const tool = this.tools.get(name)
    if (!tool) throw new Error(`Unknown tool: ${name}`)
    if (tool.requiresApproval && !approved) {
      throw new Error(`Human approval required before invoking tool: ${name}`)
    }
    return tool
  }
}
