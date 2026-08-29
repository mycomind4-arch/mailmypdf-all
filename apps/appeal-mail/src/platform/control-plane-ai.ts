export type AIProvider = 'anthropic' | 'openai' | 'gemini';
export type AITask = 'analysis' | 'draft' | 'validation' | 'extraction' | 'revision';

interface AIConfig { provider: AIProvider; apiKey: string; apiBaseUrl?: string | null; model: string; promptOverride?: string | null; }

function config() {
  const baseUrl = process.env.MAILMYPDF_CONTROL_PLANE_URL;
  const token = process.env.MAILMYPDF_CONTROL_PLANE_TOKEN;
  if (!baseUrl || !token) throw new Error('MAILMYPDF_CONTROL_PLANE_URL and MAILMYPDF_CONTROL_PLANE_TOKEN are required');
  return { baseUrl: baseUrl.replace(/\/$/, ''), token };
}

export async function resolveAI(workflowSlug: string, task: AITask): Promise<AIConfig> {
  const { baseUrl, token } = config();
  const response = await fetch(`${baseUrl}/api/control-plane/ai`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ verticalSlug: 'appeal-mail', workflowSlug, task }),
  });
  if (!response.ok) throw new Error(`MailMyPDF control-plane lookup failed: ${response.status}`);
  return await response.json() as AIConfig;
}

async function callProvider(cfg: AIConfig, system: string, user: string, json = false): Promise<string> {
  const base = (cfg.apiBaseUrl || (cfg.provider === 'gemini' ? 'https://generativelanguage.googleapis.com' : cfg.provider === 'openai' ? 'https://api.openai.com' : 'https://api.anthropic.com')).replace(/\/$/, '');
  let response: Response;
  if (cfg.provider === 'anthropic') {
    response = await fetch(`${base}/v1/messages`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: cfg.model, max_tokens: 7000, system, messages: [{ role: 'user', content: user }] }) });
    if (!response.ok) throw new Error(`Anthropic request failed: ${response.status}`);
    const body = await response.json() as any;
    return body.content?.filter((x:any)=>x.type==='text').map((x:any)=>x.text).join('\n').trim() ?? '';
  }
  if (cfg.provider === 'openai') {
    response = await fetch(`${base}/v1/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` }, body: JSON.stringify({ model: cfg.model, temperature: 0.2, response_format: json ? { type: 'json_object' } : undefined, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }) });
    if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
    const body = await response.json() as any;
    return body.choices?.[0]?.message?.content?.trim() ?? '';
  }
  response = await fetch(`${base}/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { temperature: 0.2, responseMimeType: json ? 'application/json' : 'text/plain' } }) });
  if (!response.ok) throw new Error(`Gemini request failed: ${response.status}`);
  const body = await response.json() as any;
  return body.candidates?.[0]?.content?.parts?.map((p:any)=>p.text || '').join('').trim() ?? '';
}

function parseJson(text: string): any { const cleaned = text.trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim(); try { return JSON.parse(cleaned); } catch { throw new Error('AI provider returned invalid JSON'); } }

export async function analyzeDeniedClaim(input: { documentText: string; facts: Record<string,string>; objective: string }) {
  const cfg = await resolveAI('denied-claim','analysis');
  const prompt = cfg.promptOverride || 'Analyze this denied-claim appeal case. Separate document facts from user assertions. Identify contradictions, deadline issues, missing evidence, appeal grounds, and unresolved questions. Never invent facts.';
  const text = await callProvider(cfg, prompt, JSON.stringify({ workflow: 'denied-claim', documentText: input.documentText, facts: input.facts, objective: input.objective, output: { findings: [], facts: [], evidenceGaps: [], grounds: [], deadline: null, blockingIssues: [] } }), true);
  const result = parseJson(text);
  return { provider: cfg.provider, model: cfg.model, result };
}

export async function draftDeniedClaim(input: { analysis: unknown; workflowFacts: Record<string,string>; objective: string }) {
  const cfg = await resolveAI('denied-claim','draft');
  const prompt = cfg.promptOverride || 'Draft a professional denied-claim appeal using only verified case facts and supported grounds. Preserve uncertainty. Do not promise outcomes. Return only the letter.';
  const text = await callProvider(cfg, prompt, JSON.stringify(input));
  return { provider: cfg.provider, model: cfg.model, draft: text };
}

export async function validateDeniedClaim(input: { analysis: unknown; draft: string }) {
  const cfg = await resolveAI('denied-claim','validation');
  const prompt = cfg.promptOverride || 'Validate this denied-claim appeal draft against the analysis. Reject unsupported facts, missing critical evidence, unresolved deadlines, legal overclaims, or placeholders. Return JSON {valid:boolean,issues:string[]}.';
  const text = await callProvider(cfg, prompt, JSON.stringify(input), true);
  return { provider: cfg.provider, model: cfg.model, validation: parseJson(text) };
}
