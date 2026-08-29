export type AssistantMode = "text" | "voice";

export interface AssistantContext {
  userId: string;
  verticalSlug?: string;
  workId?: string;
  mode: AssistantMode;
}

export interface AssistantRequest {
  message: string;
  context: AssistantContext;
}

/** Transport-neutral contract; provider selection belongs behind this boundary. */
export interface AssistantGateway {
  run(request: AssistantRequest): Promise<{ text: string; workId?: string }>;
}
