/**
 * Multi-Provider LLM Service
 * Gemini is DEFAULT. Claude and OpenAI are fallback/independent-review providers.
 * Each provider is lazily initialized — only configured keys are usable.
 */

export type LLMProvider = "gemini" | "claude" | "openai";

export interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  text: string;
  provider: LLMProvider;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export function getAvailableProviders(): LLMProvider[] {
  const providers: LLMProvider[] = [];
  if (process.env.GEMINI_API_KEY) providers.push("gemini");
  if (process.env.ANTHROPIC_API_KEY) providers.push("claude");
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  return providers;
}

export function isProviderAvailable(provider: LLMProvider): boolean {
  switch (provider) {
    case "gemini": return !!process.env.GEMINI_API_KEY;
    case "claude": return !!process.env.ANTHROPIC_API_KEY;
    case "openai": return !!process.env.OPENAI_API_KEY;
  }
}

export function getDefaultModel(provider: LLMProvider): string {
  switch (provider) {
    case "gemini": return process.env.GEMINI_MODEL || "gemini-2.0-flash";
    case "claude": return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
    case "openai": return process.env.OPENAI_MODEL || "gpt-4o";
  }
}

async function callGemini(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is not configured.");
  const model = config.model || getDefaultModel("gemini");
  const systemPrompt = messages.find(m => m.role === "system")?.content || "";
  const userMessages = messages.filter(m => m.role !== "system");
  const contents = userMessages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature: config.temperature ?? 0.7, maxOutputTokens: config.maxTokens ?? 4096 },
  };
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) { const err = await res.text(); throw new Error(`Gemini API error (${res.status}): ${err}`); }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return { text, provider: "gemini", model, usage: { inputTokens: data.usageMetadata?.promptTokenCount, outputTokens: data.usageMetadata?.candidatesTokenCount } };
}

async function callClaude(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic API key is not configured.");
  const model = config.model || getDefaultModel("claude");
  const systemPrompt = messages.find(m => m.role === "system")?.content || "";
  const userMessages = messages.filter(m => m.role !== "system");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, system: systemPrompt || undefined, messages: userMessages.map(m => ({ role: m.role, content: m.content })), max_tokens: config.maxTokens ?? 4096, temperature: config.temperature ?? 0.7 }),
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`Claude API error (${res.status}): ${err}`); }
  const data = await res.json();
  return { text: data.content?.[0]?.text || "", provider: "claude", model, usage: { inputTokens: data.usage?.input_tokens, outputTokens: data.usage?.output_tokens } };
}

async function callOpenAI(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key is not configured.");
  const model = config.model || getDefaultModel("openai");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: messages.map(m => ({ role: m.role, content: m.content })), max_tokens: config.maxTokens ?? 4096, temperature: config.temperature ?? 0.7 }),
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`OpenAI API error (${res.status}): ${err}`); }
  const data = await res.json();
  return { text: data.choices?.[0]?.message?.content || "", provider: "openai", model, usage: { inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens } };
}

export async function callLLM(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
  const provider = config.provider;
  if (!isProviderAvailable(provider)) {
    const available = getAvailableProviders();
    if (available.length === 0) throw new Error("No LLM provider configured. Set GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.");
    return callLLM(messages, { ...config, provider: available[0] });
  }
  switch (provider) {
    case "gemini": return callGemini(messages, config);
    case "claude": return callClaude(messages, config);
    case "openai": return callOpenAI(messages, config);
  }
}

/** Gemini with inline document (for document analysis with file upload) */
export async function callGeminiWithDocument(
  systemPrompt: string,
  documentBase64: string,
  documentMimeType: string,
  model?: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is not configured.");
  const m = model || getDefaultModel("gemini");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [
        { inlineData: { mimeType: documentMimeType, data: documentBase64 } },
        { text: systemPrompt },
      ]}],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    }),
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`Gemini document analysis failed (${res.status}): ${err}`); }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim() || "";
}
