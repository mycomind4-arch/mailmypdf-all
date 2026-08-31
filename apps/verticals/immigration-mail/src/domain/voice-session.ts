import type { SupportedLanguage } from './immigration-case';
import type { VoiceAction } from './immigration-voice';

export type VoiceSession = {
  id: string;
  language: SupportedLanguage;
  active: boolean;
  transcriptEnabled: boolean;
  pendingConfirmation?: VoiceAction;
};

export function requiresExplicitConfirmation(action: VoiceAction): boolean {
  return action.type === 'start_workflow' && action.workflow === 'mail';
}

export function requestConfirmation(session: VoiceSession, action: VoiceAction): VoiceSession {
  return requiresExplicitConfirmation(action) ? { ...session, pendingConfirmation: action } : session;
}
