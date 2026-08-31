import { describe, it, expect } from 'vitest';
import {
  createConciergeSession,
  processUserMessage,
  isVoiceRequest,
  getVoicePrompt,
} from './rfe-concierge';

const RFE_TEXT = `U.S. Citizenship and Immigration Services
Request for Evidence
I-485 Application to Register Permanent Residence
Receipt Number: MSC1234567890
Please submit the following documents:
You must respond no later than December 15, 2026
1. Passport copy
2. Birth certificate with certified English translation
3. Marriage certificate
4. Medical examination (Form I-693) in sealed envelope
5. Two passport-style photographs`;

describe('RFE AI Concierge', () => {
  it('creates session with greeting', () => {
    const session = createConciergeSession();
    expect(session.messages.length).toBe(1);
    expect(session.messages[0].role).toBe('assistant');
    expect(session.messages[0].content).toContain('Request for Evidence');
  });

  it('creates Spanish greeting', () => {
    const session = createConciergeSession({ ui: 'es' });
    expect(session.messages[0].content).toContain('Solicitud de Evidencia');
  });

  it('detects RFE keywords and offers upload', () => {
    const session = createConciergeSession();
    const { session: updated } = processUserMessage(session, 'I received an RFE from USCIS');
    expect(updated.detectedRFE).toBe(true);
    expect(updated.offeredUpload).toBe(true);
    expect(updated.messages[updated.messages.length - 1].action?.type).toBe('upload_rfe');
  });

  it('detects Spanish RFE keywords', () => {
    const session = createConciergeSession({ ui: 'es' });
    const { session: updated } = processUserMessage(session, 'Recibí una solicitud de evidencia de USCIS');
    expect(updated.detectedRFE).toBe(true);
  });

  it('processes document upload and starts workflow', () => {
    const session = createConciergeSession();
    const { session: updated, action } = processUserMessage(session, 'Here is my letter', {
      text: RFE_TEXT,
      documentId: 'doc-1',
    });
    expect(action?.type).toBe('start_workflow');
    expect(updated.case).toBeDefined();
    expect(updated.case!.rfeAnalysis).toBeDefined();
    expect(updated.case!.state).toBe('explained');
  });

  it('extracts deadline after upload', () => {
    const session = createConciergeSession();
    const { session: updated } = processUserMessage(session, 'Here is my letter', {
      text: RFE_TEXT,
      documentId: 'doc-1',
    });
    expect(updated.case!.rfeAnalysis!.deadline).toBeDefined();
    expect(updated.case!.rfeAnalysis!.deadline!.date).toBe('2026-12-15');
  });

  it('identifies all requested items after upload', () => {
    const session = createConciergeSession();
    const { session: updated } = processUserMessage(session, 'upload', {
      text: RFE_TEXT,
      documentId: 'doc-1',
    });
    expect(updated.case!.rfeAnalysis!.requestedItems.length).toBe(5);
  });

  it('explains glossary terms when asked', () => {
    const session = createConciergeSession();
    const { message } = processUserMessage(session, 'What is an RFE?');
    expect(message.content).toContain('letter from USCIS');
  });

  it('explains glossary terms in Spanish', () => {
    const session = createConciergeSession({ ui: 'es' });
    const { message } = processUserMessage(session, 'Que es deadline?');
    expect(message.content).toContain('fecha');
  });

  it('handles non-RFE user input gracefully', () => {
    const session = createConciergeSession();
    const { session: updated } = processUserMessage(session, 'I need help with something');
    expect(updated.messages.length).toBeGreaterThan(2);
    expect(updated.offeredUpload).toBe(true);
  });

  it('detects voice request', () => {
    expect(isVoiceRequest('talk')).toBe(true);
    expect(isVoiceRequest('speak')).toBe(true);
    expect(isVoiceRequest('hablar')).toBe(true);
    expect(isVoiceRequest('hello')).toBe(false);
  });

  it('provides voice prompt in English', () => {
    const prompt = getVoicePrompt(false);
    expect(prompt).toContain('speak');
    expect(prompt).toContain('transcribe');
  });

  it('provides voice prompt in Spanish', () => {
    const prompt = getVoicePrompt(true);
    expect(prompt).toContain('hablar');
  });

  it('non-immigration document is handled gracefully', () => {
    const session = createConciergeSession();
    const { session: updated } = processUserMessage(session, 'upload', {
      text: 'This is a random grocery list with no immigration content.',
      documentId: 'doc-bad',
    });
    expect(updated.case).toBeUndefined();
  });

  it('consecutive messages maintain session state', () => {
    const session = createConciergeSession();
    const r1 = processUserMessage(session, 'I got an RFE');
    const r2 = processUserMessage(r1.session, 'Here is my letter', { text: RFE_TEXT, documentId: 'doc-1' });
    expect(r2.session.case).toBeDefined();
    expect(r2.session.detectedRFE).toBe(true);
    expect(r2.session.messages.length).toBeGreaterThan(3);
  });

  it('concierge language context separates UI from document language', () => {
    const session = createConciergeSession({ ui: 'es', document: 'en', output: 'es' });
    expect(session.language.ui).toBe('es');
    expect(session.language.document).toBe('en');
    const { session: updated } = processUserMessage(session, 'Aquí está mi carta', { text: RFE_TEXT, documentId: 'd1' });
    expect(updated.case).toBeDefined();
    expect(updated.case!.language.ui).toBe('es');
  });

  it('never exposes internal workflow IDs in user-facing messages', () => {
    const session = createConciergeSession();
    const { message } = processUserMessage(session, 'I got an RFE from USCIS');
    expect(message.content).not.toMatch(/rfe-case-\d+/);
    expect(message.content).not.toMatch(/msg-\d+/);
  });

  it('offers help when user says "I dont know"', () => {
    const session = createConciergeSession();
    const { session: updated } = processUserMessage(session, "I don't know what to do");
    expect(updated.messages.length).toBeGreaterThan(2);
    const lastMsg = updated.messages[updated.messages.length - 1];
    expect(lastMsg.role).toBe('assistant');
    expect(lastMsg.content.length).toBeGreaterThan(10);
  });
});
