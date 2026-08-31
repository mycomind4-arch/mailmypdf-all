export type VoiceAction =
  | { type: 'explain_document'; documentId?: string }
  | { type: 'summarize_case' }
  | { type: 'start_workflow'; workflow: 'understand'|'respond'|'prepare'|'review'|'mail' }
  | { type: 'add_checklist_item'; label: string }
  | { type: 'read_draft' }
  | { type: 'review_draft' }
  | { type: 'navigate'; destination: 'home'|'documents'|'timeline'|'checklist'|'draft'|'mail' };

export type VoiceCommand = { transcript: string; language: string; confidence: number };

const blocked: RegExp[] = [
  /send\s+(the\s+)?mail/i,
  /mail\s+it/i,
  /submit\s+(the\s+)?response/i,
];

export function parseVoiceCommand(command: VoiceCommand): VoiceAction | null {
  const text = command.transcript.trim();
  if (!text || blocked.some(pattern => pattern.test(text))) return null;
  if (/explain|what does.*say|what.*mean/i.test(text)) return { type: 'explain_document' };
  if (/summarize|summary/i.test(text)) return { type: 'summarize_case' };
  if (/read.*draft/i.test(text)) return { type: 'read_draft' };
  if (/review.*draft|check.*draft/i.test(text)) return { type: 'review_draft' };
  if (/start.*respond|respond to/i.test(text)) return { type: 'start_workflow', workflow: 'respond' };
  if (/prepare.*response/i.test(text)) return { type: 'start_workflow', workflow: 'prepare' };
  return null;
}
