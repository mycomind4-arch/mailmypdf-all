export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  rtl?: boolean;
}

/**
 * Initial language catalog. UI translation, AI response language, document
 * language, and final mailing language are independent choices.
 */
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "tl", name: "Tagalog", nativeName: "Tagalog" },
  { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "ht", name: "Haitian Creole", nativeName: "Kreyòl Ayisyen" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "ur", name: "Urdu", nativeName: "اردو", rtl: true },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
];

export interface LanguagePreferences {
  interfaceLanguage: string;
  assistantLanguage: string;
  documentLanguage: string;
  mailingLanguage: string;
}

export const DEFAULT_LANGUAGE_PREFERENCES: LanguagePreferences = {
  interfaceLanguage: "en",
  assistantLanguage: "en",
  documentLanguage: "en",
  mailingLanguage: "en",
};

export function isRtlLanguage(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((language) => language.code === code && language.rtl === true);
}
