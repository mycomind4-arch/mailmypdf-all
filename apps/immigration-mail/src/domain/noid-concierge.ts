/**
 * NOID AI Concierge — Interactive intake for NOID cases
 *
 * Reuses RFE Concierge architecture patterns.
 * Provider-neutral, multilingual, voice-capable through shared boundary.
 * Never exposes internal workflow IDs.
 */

import type { NOIDCase } from './noid-workflow';
import { ingestNOIDDocument, createNOIDCase, type NOIDWorkflowStepResult } from './noid-workflow';
import type { DocumentUnderstanding } from './document-understanding';
import { buildDocumentUnderstanding } from './document-understanding';
import { createLanguageContext, type LanguageContext } from './multilingual';

// ─── Concierge Message Types (shared pattern with RFE) ────────────────────────

export type NOIDConciergeRole = 'user' | 'assistant' | 'system';

export interface NOIDConciergeMessage {
  id: string;
  role: NOIDConciergeRole;
  content: string;
  contentEs?: string;
  timestamp: string;
  action?: NOIDConciergeAction;
}

export type NOIDConciergeAction =
  | { type: 'upload_noid' }
  | { type: 'explain_term'; term: string }
  | { type: 'start_workflow' }
  | { type: 'upload_evidence'; groundId?: string }
  | { type: 'review_draft' }
  | { type: 'approve' }
  | { type: 'checkout' }
  | { type: 'attorney_recommended' }
  | { type: 'ask_help' };

// ─── Concierge Session ──────────────────────────────────────────────────────────

export interface NOIDConciergeSession {
  id: string;
  case?: NOIDCase;
  messages: NOIDConciergeMessage[];
  language: LanguageContext;
  createdAt: string;
  offeredUpload: boolean;
  offeredVoice: boolean;
  detectedNOID: boolean;
  attorneyWarningShown: boolean;
}

// ─── Concierge Engine ──────────────────────────────────────────────────────────

export function createNOIDConciergeSession(language?: Partial<LanguageContext>): NOIDConciergeSession {
  const lang = createLanguageContext(language ?? {});
  const isEs = lang.ui === 'es';
  const greeting = isEs
    ? 'Hola. Si recibió un Aviso de Intención de Denegar de USCIS, puedo ayudarle a entender qué está impugnando la agencia y qué puede hacer. Puede subir la carta, escribir qué pasó, o hablar conmigo.'
    : 'Hi. If you received a USCIS Notice of Intent to Deny, I can help you understand what the agency is challenging and what to do next. You can upload the notice, type what happened, or talk to me.';

  return {
    id: `noid-concierge-${Date.now()}`,
    messages: [{
      id: 'msg-0',
      role: 'assistant',
      content: greeting,
      timestamp: new Date().toISOString(),
    }],
    language: lang,
    createdAt: new Date().toISOString(),
    offeredUpload: false,
    offeredVoice: false,
    detectedNOID: false,
    attorneyWarningShown: false,
  };
}

// ─── Process user message ────────────────────────────────────────────────────

export function processNOIDUserMessage(
  session: NOIDConciergeSession,
  userText: string,
  uploadedDocument?: { text: string; documentId: string },
): { message: NOIDConciergeMessage; session: NOIDConciergeSession; action?: NOIDConciergeAction } {
  const isEs = session.language.ui === 'es';
  const messages = [...session.messages];

  const userMsg: NOIDConciergeMessage = {
    id: `msg-${messages.length}`,
    role: 'user',
    content: userText,
    timestamp: new Date().toISOString(),
  };
  messages.push(userMsg);

  // Check for document upload
  if (uploadedDocument) {
    return processNOIDDocumentUpload(session, messages, uploadedDocument);
  }

  // Check for NOID keywords
  const noidKeywords = /noid|notice of intent to deny|intent to deny|uscis|denial|denied|inadmissible|inadmissibility|immigration|petition|green card|i-485|i-130|i-140|i-751|n-400|aviso de intención|denegación|inmigración/i;
  const mentionsNOID = noidKeywords.test(userText);

  if (mentionsNOID && !session.detectedNOID) {
    const botMsg: NOIDConciergeMessage = {
      id: `msg-${messages.length}`,
      role: 'assistant',
      content: isEs
        ? 'Parece que estás tratando con una carta de USCIS. Si es un Aviso de Intención de Denegar (NOID), súbelo y te ayudaré a entender qué está impugnando la agencia. Si no estás seguro, describe lo que dice la carta.'
        : 'It sounds like you\'re dealing with a USCIS letter. If it\'s a Notice of Intent to Deny (NOID), upload it and I\'ll help you understand what the agency is challenging. If you\'re not sure, describe what the letter says.',
      timestamp: new Date().toISOString(),
      action: { type: 'upload_noid' },
    };
    messages.push(botMsg);
    return {
      message: botMsg,
      session: { ...session, messages, detectedNOID: true, offeredUpload: true },
      action: { type: 'upload_noid' },
    };
  }

  // Default — guide toward uploading
  if (!session.offeredUpload) {
    const botMsg: NOIDConciergeMessage = {
      id: `msg-${messages.length}`,
      role: 'assistant',
      content: isEs
        ? 'Entiendo. Para ayudarte mejor, ¿puedes subir la carta que recibiste de USCIS? También puedes escribir qué pasó o hablar conmigo.'
        : 'I understand. To help you best, can you upload the letter you received from USCIS? You can also type what happened or talk to me.',
      timestamp: new Date().toISOString(),
      action: { type: 'upload_noid' },
    };
    messages.push(botMsg);
    return {
      message: botMsg,
      session: { ...session, messages, offeredUpload: true },
      action: { type: 'upload_noid' },
    };
  }

  // Continuing conversation
  const botMsg: NOIDConciergeMessage = {
    id: `msg-${messages.length}`,
    role: 'assistant',
    content: isEs
      ? 'Estoy aquí para ayudar. Puedes subir tu carta de USCIS en cualquier momento, o preguntarme sobre el proceso. También puedes escribir "hablar" para usar voz.'
      : 'I\'m here to help. You can upload your USCIS letter at any time, or ask me about the process. You can also type "talk" to use voice.',
    timestamp: new Date().toISOString(),
  };
  messages.push(botMsg);
  return { message: botMsg, session: { ...session, messages } };
}

// ─── Process document upload ──────────────────────────────────────────────────

function processNOIDDocumentUpload(
  session: NOIDConciergeSession,
  messages: NOIDConciergeMessage[],
  doc: { text: string; documentId: string },
): { message: NOIDConciergeMessage; session: NOIDConciergeSession; action?: NOIDConciergeAction } {
  const isEs = session.language.ui === 'es';

  const du = buildDocumentUnderstanding({
    documentId: doc.documentId,
    text: doc.text,
    source: { documentId: doc.documentId, confidence: 0.9 },
    language: 'en',
  });

  const noidCase = session.case ?? createNOIDCase(`user-${session.id}`, session.language);

  const result = ingestNOIDDocument(noidCase, du, doc.text);

  if (result.result.success) {
    const analysis = result.case.noidAnalysis!;
    const groundsText = analysis.denialGrounds.length > 0
      ? `\n📋 ${analysis.denialGrounds.length} denial ground(s) identified`
      : '\n📋 No specific grounds detected — we may need to look more carefully';
    const deadlineText = analysis.deadline ? `\n📅 Deadline: ${analysis.deadline}` : analysis.deadlineDays ? `\n📅 ${analysis.deadlineDays} days to respond` : '';
    const attorneyText = analysis.hasAttorneyRecommendation
      ? '\n\n⚠️ An attorney is strongly recommended for this case.'
      : '';

    const botMsg: NOIDConciergeMessage = {
      id: `msg-${messages.length}`,
      role: 'assistant',
      content: isEs
        ? `He leído su aviso. ${analysis.summaryEs}${deadlineText}${groundsText}${attorneyText}\n\n¿Tiene evidencia para responder a los motivos de denegación?`
        : `I've read your notice. ${analysis.summaryEn}${deadlineText}${groundsText}${attorneyText}\n\nDo you have evidence to respond to the denial grounds?`,
      contentEs: analysis.summaryEs,
      timestamp: new Date().toISOString(),
      action: analysis.hasAttorneyRecommendation ? { type: 'attorney_recommended' } : { type: 'start_workflow' },
    };
    messages.push(botMsg);

    return {
      message: botMsg,
      session: {
        ...session,
        case: result.case,
        messages,
        detectedNOID: true,
        attorneyWarningShown: analysis.hasAttorneyRecommendation,
      },
      action: analysis.hasAttorneyRecommendation ? { type: 'attorney_recommended' } : { type: 'start_workflow' },
    };
  } else {
    const botMsg: NOIDConciergeMessage = {
      id: `msg-${messages.length}`,
      role: 'assistant',
      content: result.result.userMessage,
      timestamp: new Date().toISOString(),
    };
    messages.push(botMsg);
    return { message: botMsg, session: { ...session, messages } };
  }
}

// ─── Voice support (shared pattern) ─────────────────────────────────────────────

export function isNOIDVoiceRequest(text: string): boolean {
  return /^(talk|speak|voice|hablar|voz)/i.test(text.trim());
}

export function getNOIDVoicePrompt(isEs: boolean): string {
  return isEs
    ? 'Puedes hablar ahora. Cuando termines, transcribiré lo que dijiste y continuaré ayudándote.'
    : 'You can speak now. When you\'re done, I\'ll transcribe what you said and continue helping you.';
}
