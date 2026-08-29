/**
 * RFE AI Concierge — Interactive intake experience
 *
 * Guides users through the RFE workflow conversationally.
 * The user never needs to select "RFE workflow" — the AI recognizes it.
 *
 * Supported input modes:
 * - text (type)
 * - file upload (PDF, photo)
 * - voice (via transcription → same pipeline)
 *
 * The concierge is provider-neutral. AI output is untrusted until validated.
 * Canonical case state belongs to the application, not the AI.
 */

import type { RFECase, RFEWorkflowState } from './rfe-workflow';
import { ingestRFEDocument, createRFECase, type RFEWorkflowStepResult } from './rfe-workflow';
import type { DocumentUnderstanding } from './document-understanding';
import { buildDocumentUnderstanding } from './document-understanding';
import { createLanguageContext, type LanguageContext } from './multilingual';
import { findGlossaryTerm, type GlossaryTerm } from './rfe-glossary';

// ─── Concierge Message Types ──────────────────────────────────────────────────

export type ConciergeRole = 'user' | 'assistant' | 'system';

export interface ConciergeMessage {
  id: string;
  role: ConciergeRole;
  content: string;
  contentEs?: string;
  timestamp: string;
  action?: ConciergeAction;
}

export type ConciergeAction =
  | { type: 'upload_rfe' }
  | { type: 'explain_term'; term: string }
  | { type: 'start_workflow' }
  | { type: 'upload_evidence'; itemId?: string }
  | { type: 'review_draft' }
  | { type: 'approve' }
  | { type: 'checkout' }
  | { type: 'ask_help' };

// ─── Concierge Session ────────────────────────────────────────────────────────

export interface ConciergeSession {
  id: string;
  case?: RFECase;
  messages: ConciergeMessage[];
  language: LanguageContext;
  createdAt: string;
  // Track what the concierge has offered
  offeredUpload: boolean;
  offeredVoice: boolean;
  detectedRFE: boolean;
}

// ─── Concierge Response ──────────────────────────────────────────────────────

export interface ConciergeResponse {
  message: ConciergeMessage;
  session: ConciergeSession;
  action?: ConciergeAction;
}

// ─── Concierge Engine ──────────────────────────────────────────────────────────

export function createConciergeSession(language?: Partial<LanguageContext>): ConciergeSession {
  const lang = createLanguageContext(language ?? {});
  const isEs = lang.ui === 'es';
  const greeting = isEs
    ? 'Hola. Si recibió una Solicitud de Evidencia de USCIS, puedo ayudarle a entender qué pide y qué hacer. Puede subir la carta, escribir qué pasó, o hablar conmigo.'
    : 'Hi. If you received a USCIS Request for Evidence, I can help you figure out what it asks for and what to do next. You can upload the letter, type what happened, or talk to me.';

  return {
    id: `concierge-${Date.now()}`,
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
    detectedRFE: false,
  };
}

// ─── Process user message ────────────────────────────────────────────────────

export function processUserMessage(
  session: ConciergeSession,
  userText: string,
  uploadedDocument?: { text: string; documentId: string },
): ConciergeResponse {
  const isEs = session.language.ui === 'es';
  const messages = [...session.messages];

  // Add user message
  const userMsg: ConciergeMessage = {
    id: `msg-${messages.length}`,
    role: 'user',
    content: userText,
    timestamp: new Date().toISOString(),
  };
  messages.push(userMsg);

  // Check if user is asking to explain a term
  const explainMatch = userText.match(/(?:what is|what does|explain|what's|que es|que significa)\s+(?:an?\s+)?(.+)/i);
  if (explainMatch && !uploadedDocument) {
    const term = explainMatch[1].trim();
    const glossaryEntry = findGlossaryTerm(term);
    if (glossaryEntry) {
      const explanation = isEs
        ? `${glossaryEntry.shortDefinitionEs ?? glossaryEntry.shortDefinition}\n\n${glossaryEntry.whyItMattersEs ?? glossaryEntry.whyItMatters}\n\nWhat to do: ${glossaryEntry.whatToDoEs ?? glossaryEntry.whatToDo}`
        : `${glossaryEntry.shortDefinition}\n\n${glossaryEntry.whyItMatters}\n\nWhat to do: ${glossaryEntry.whatToDo}`;
      const botMsg: ConciergeMessage = {
        id: `msg-${messages.length}`,
        role: 'assistant',
        content: explanation,
        timestamp: new Date().toISOString(),
        action: { type: 'explain_term', term },
      };
      messages.push(botMsg);
      return { message: botMsg, session: { ...session, messages } };
    }
  }

  // Check if user uploaded a document
  if (uploadedDocument) {
    return processDocumentUpload(session, messages, uploadedDocument);
  }

  // Check if user mentions RFE-related terms
  const rfeKeywords = /rfe|request for evidence|uscis|immigration|notice|petition|green card|i-485|i-130|i-140|i-751|h-1b|solicitud de evidencia|inmigración/i;
  const mentionsRFE = rfeKeywords.test(userText);

  if (mentionsRFE && !session.detectedRFE) {
    const botMsg: ConciergeMessage = {
      id: `msg-${messages.length}`,
      role: 'assistant',
      content: isEs
        ? 'Parece que estás tratando con USCIS. Si tienes una Solicitud de Evidencia (RFE), súbelo y te ayudaré a entender qué pide. Si no estás seguro de qué tipo de carta recibiste, describe lo que dice y te ayudaré a identificarlo.'
        : 'It sounds like you\'re dealing with USCIS. If you have a Request for Evidence (RFE), upload it and I\'ll help you understand what it\'s asking. If you\'re not sure what type of letter you received, describe what it says and I\'ll help you identify it.',
      contentEs: isEs ? undefined : 'Parece que estás tratando con USCIS. Si tienes una Solicitud de Evidencia (RFE), súbelo y te ayudaré a entender qué pide.',
      timestamp: new Date().toISOString(),
      action: { type: 'upload_rfe' },
    };
    messages.push(botMsg);
    return {
      message: botMsg,
      session: { ...session, messages, detectedRFE: true, offeredUpload: true },
      action: { type: 'upload_rfe' },
    };
  }

  // Default response — guide toward uploading
  if (!session.offeredUpload) {
    const botMsg: ConciergeMessage = {
      id: `msg-${messages.length}`,
      role: 'assistant',
      content: isEs
        ? 'Entiendo. Para ayudarte mejor, ¿puedes subir la carta que recibiste de USCIS? También puedes escribir qué pasó o hablar conmigo. Si no tienes la carta a mano, dime lo que recuerdas.'
        : 'I understand. To help you best, can you upload the letter you received from USCIS? You can also type what happened or talk to me. If you don\'t have the letter handy, tell me what you remember.',
      timestamp: new Date().toISOString(),
      action: { type: 'upload_rfe' },
    };
    messages.push(botMsg);
    return {
      message: botMsg,
      session: { ...session, messages, offeredUpload: true },
      action: { type: 'upload_rfe' },
    };
  }

  // If already offered upload and user is still talking, provide guidance
  const botMsg: ConciergeMessage = {
    id: `msg-${messages.length}`,
    role: 'assistant',
    content: isEs
      ? 'Estoy aquí para ayudar. Puedes subir tu carta de USCIS en cualquier momento, o preguntarme sobre términos de inmigración que no entiendas. También puedes escribir "hablar" para usar voz.'
      : 'I\'m here to help. You can upload your USCIS letter at any time, or ask me about immigration terms you don\'t understand. You can also type "talk" to use voice.',
    timestamp: new Date().toISOString(),
  };
  messages.push(botMsg);
  return { message: botMsg, session: { ...session, messages } };
}

// ─── Process document upload ──────────────────────────────────────────────────

function processDocumentUpload(
  session: ConciergeSession,
  messages: ConciergeMessage[],
  doc: { text: string; documentId: string },
): ConciergeResponse {
  const isEs = session.language.ui === 'es';

  // Build document understanding
  const du = buildDocumentUnderstanding({
    documentId: doc.documentId,
    text: doc.text,
    source: { documentId: doc.documentId, confidence: 0.9 },
    language: 'en',
  });

  // Create or use existing case
  const rfeCase = session.case ?? createRFESessionCase(session);

  // Ingest the RFE document
  const result = ingestRFEDocument(rfeCase, du, undefined, doc.text);

  if (result.result.success) {
    const analysis = result.case.rfeAnalysis!;
    const formLabel = analysis.identifiers.formType !== 'generic' && analysis.identifiers.formType !== 'unknown'
      ? ` (${analysis.identifiers.formType})` : '';
    const deadlineText = analysis.deadline ? `\n\n📅 Deadline: ${analysis.deadline.date}` : '';
    const itemCount = analysis.requestedItems.length;
    const itemsText = itemCount > 0
      ? `\n📋 ${itemCount} item(s) requested`
      : '\n📋 No specific items detected — we may need to look more carefully';

    const botMsg: ConciergeMessage = {
      id: `msg-${messages.length}`,
      role: 'assistant',
      content: isEs
        ? `He leído tu carta. ${analysis.summaryEs}${deadlineText}${itemsText}\n\n¿Tienes los documentos que USCIS está pidiendo?`
        : `I've read your letter. ${analysis.summaryEn}${deadlineText}${itemsText}\n\nDo you have the documents USCIS is requesting?`,
      contentEs: analysis.summaryEs,
      timestamp: new Date().toISOString(),
      action: { type: 'start_workflow' },
    };
    messages.push(botMsg);

    return {
      message: botMsg,
      session: {
        ...session,
        case: result.case,
        messages,
        detectedRFE: true,
      },
      action: { type: 'start_workflow' },
    };
  } else {
    const botMsg: ConciergeMessage = {
      id: `msg-${messages.length}`,
      role: 'assistant',
      content: result.result.userMessage,
      contentEs: result.result.userMessageEs,
      timestamp: new Date().toISOString(),
    };
    messages.push(botMsg);
    return { message: botMsg, session: { ...session, messages } };
  }
}

// ─── Helper: create case from session ─────────────────────────────────────────

function createRFESessionCase(session: ConciergeSession): RFECase {
  return createRFECase(`user-${session.id}`, session.language);
}

// ─── Voice support ─────────────────────────────────────────────────────────────

export function isVoiceRequest(text: string): boolean {
  return /^(talk|speak|voice|hablar|voz)/i.test(text.trim());
}

export function getVoicePrompt(isEs: boolean): string {
  return isEs
    ? 'Puedes hablar ahora. Cuando termines, transcribiré lo que dijiste y continuaré ayudándote.'
    : 'You can speak now. When you\'re done, I\'ll transcribe what you said and continue helping you.';
}
