import type { SupportedLanguage } from './immigration-case';

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en:'English', es:'Español', zh:'中文', vi:'Tiếng Việt', ko:'한국어', tl:'Tagalog', ar:'العربية', ru:'Русский', ht:'Kreyòl Ayisyen', pt:'Português', fr:'Français', hi:'हिन्दी', ur:'اردو', bn:'বাংলা', pa:'ਪੰਜਾਬੀ'
};

export type LanguageContext = { ui: SupportedLanguage; assistant: SupportedLanguage; document: SupportedLanguage; output: SupportedLanguage };

export function normalizeLanguage(value: string | undefined): SupportedLanguage {
  const key = (value ?? 'en').toLowerCase().split('-')[0] as SupportedLanguage;
  return key in LANGUAGE_LABELS ? key : 'en';
}

export function createLanguageContext(input: Partial<LanguageContext>): LanguageContext {
  const ui = normalizeLanguage(input.ui);
  return { ui, assistant: normalizeLanguage(input.assistant ?? ui), document: normalizeLanguage(input.document ?? ui), output: normalizeLanguage(input.output ?? 'en') };
}
