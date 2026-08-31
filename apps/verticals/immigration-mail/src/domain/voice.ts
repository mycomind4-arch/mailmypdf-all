export type VoiceAction =
  | "explain-document"
  | "summarize"
  | "start-workflow"
  | "save-fact"
  | "add-checklist-item"
  | "review-draft"
  | "read-draft"
  | "navigate"
  | "mail-preview";

export interface VoiceCommand {
  action: VoiceAction;
  arguments: Record<string, string | number | boolean | null>;
  confidence: number;
}

export interface VoiceSessionContext {
  caseId?: string;
  workflowId?: string;
  language: string;
  activeDocumentId?: string;
}

/**
 * Consequential actions are approval-gated. Voice can prepare an action but
 * cannot silently send mail, submit a legal filing, or make a purchase.
 */
export const APPROVAL_REQUIRED_ACTIONS = new Set<VoiceAction>(["mail-preview"]);

export interface VoiceAssistantBoundary {
  transcribe(audio: Blob): Promise<{ text: string; language: string }>;
  interpret(text: string, context: VoiceSessionContext): Promise<VoiceCommand>;
  speak(text: string, language: string): Promise<ReadableStream<Uint8Array>>;
}
