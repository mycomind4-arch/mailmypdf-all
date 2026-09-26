export type TranslationRequest = { sourceText: string; sourceLanguage: string; targetLanguage: string; sourceHash: string; matterId: string };
export type TranslationResult = { translatedText: string; sourceHash: string; provider: string; reviewed: boolean; warnings: readonly string[] };

export interface TranslationProvider { translate(request: TranslationRequest): Promise<TranslationResult>; }

export function assertTranslationReady(result: TranslationResult, expectedSourceHash: string): void {
  if (result.sourceHash !== expectedSourceHash) throw new Error("Translation source hash does not match the approved source.");
  if (!result.translatedText.trim()) throw new Error("Translation output is empty.");
  if (!result.reviewed) throw new Error("Translation requires human review before consequential use.");
}
