import type { PlatformId } from "@mailmypdf/core";

export type VoiceTransport = "livekit" | "pipecat";
export type VoiceState = "idle" | "connecting" | "connected" | "listening" | "thinking" | "speaking" | "disconnected" | "error";

export interface VoiceSessionContext {
  readonly sessionId: PlatformId;
  readonly ownerId: PlatformId;
  readonly caseId?: PlatformId;
  readonly verticalId?: string;
  readonly transport: VoiceTransport;
}

export interface VoiceToolCall {
  readonly name: string;
  readonly arguments: Record<string, unknown>;
  /** Set only after the user has explicitly approved a consequential action. */
  readonly approved: boolean;
}

export interface VoiceTurn {
  readonly transcript: string;
  readonly toolCalls: readonly VoiceToolCall[];
  readonly responseText?: string;
}

export interface VoiceSession {
  readonly context: VoiceSessionContext;
  readonly state: VoiceState;
  readonly turns: readonly VoiceTurn[];
}

export interface VoiceAgentAdapter {
  readonly transport: VoiceTransport;
  connect(context: VoiceSessionContext): Promise<void>;
  disconnect(sessionId: PlatformId): Promise<void>;
  speak(sessionId: PlatformId, text: string): Promise<void>;
  interrupt(sessionId: PlatformId): Promise<void>;
}

export interface VoiceToolRegistry {
  register(tool: VoiceToolDefinition): void;
  list(): readonly VoiceToolDefinition[];
  execute(call: VoiceToolCall, context: VoiceSessionContext): Promise<unknown>;
}

export interface VoiceToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly requiresApproval: boolean;
  readonly execute: (args: Record<string, unknown>, context: VoiceSessionContext) => Promise<unknown>;
}

/** Consequential tools must receive an explicit user approval signal. */
export function requiresVoiceApproval(tool: VoiceToolDefinition): boolean {
  return tool.requiresApproval;
}

/**
 * Provider-neutral registry. LiveKit and Pipecat adapters plug into this
 * contract; providers never receive direct database access.
 */
export class InMemoryVoiceToolRegistry implements VoiceToolRegistry {
  private readonly tools = new Map<string, VoiceToolDefinition>();

  register(tool: VoiceToolDefinition): void {
    if (this.tools.has(tool.name)) throw new Error(`Voice tool already registered: ${tool.name}`);
    this.tools.set(tool.name, tool);
  }

  list(): readonly VoiceToolDefinition[] {
    return [...this.tools.values()];
  }

  async execute(call: VoiceToolCall, context: VoiceSessionContext): Promise<unknown> {
    const tool = this.tools.get(call.name);
    if (!tool) throw new Error(`Unknown voice tool: ${call.name}`);
    if (tool.requiresApproval && !call.approved) {
      throw new Error(`Explicit user approval required for consequential voice tool: ${call.name}`);
    }
    return tool.execute(call.arguments, context);
  }
}
