import { confidence, type Confidence, type PlatformId } from "@mailmypdf/core";
import type { AiProvider, AiResult, AiTask } from "./index.js";

export type AnthropicOutputMode = "text" | "json";

export interface AnthropicPromptInput {
  system: string;
  instruction: string;
  maxTokens?: number;
  temperature?: number;
  outputMode?: AnthropicOutputMode;
  sources?: readonly PlatformId[];
}

export interface AnthropicProviderOptions {
  apiKey: string;
  model: string;
  apiUrl?: string;
  anthropicVersion?: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_API = "https://api.anthropic.com/v1/messages";
const DEFAULT_VERSION = "2023-06-01";

async function readBoundedResponse(response: Response, maxBytes: number): Promise<unknown> {
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`Anthropic request failed (${response.status})`);
  }
  const declared=Number(response.headers.get("content-length") ?? 0);
  if (declared && declared > maxBytes) {
    await response.body?.cancel().catch(() => {});
    throw new Error("Anthropic response exceeds configured size");
  }
  if (!response.body) throw new Error("Anthropic returned no response body");
  const reader=response.body.getReader();
  const chunks:Uint8Array[]=[];
  let total=0;
  try {
    while(true){
      const {done,value}=await reader.read();
      if(done) break;
      total+=value.byteLength;
      if(total>maxBytes) throw new Error("Anthropic response exceeds configured size");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes=new Uint8Array(total);
  let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Error("Anthropic returned invalid JSON"); }
}

function responseText(payload: unknown): { text: string; model: string } {
  if (!payload || typeof payload !== "object") throw new Error("Anthropic returned an invalid payload");
  const p=payload as {content?:unknown;model?:unknown;stop_reason?:unknown};
  if (p.stop_reason !== "end_turn") throw new Error("Anthropic response did not complete");
  if (!Array.isArray(p.content)) throw new Error("Anthropic response content is missing");
  const parts=p.content
    .filter((block): block is {type:"text";text:string} =>
      !!block && typeof block === "object" &&
      (block as any).type === "text" && typeof (block as any).text === "string")
    .map((block)=>block.text);
  const text=parts.join("").trim();
  if (!text) throw new Error("Anthropic returned no text");
  return {text,model:typeof p.model === "string" ? p.model : "anthropic"};
}

function parseJsonText(text:string): unknown {
  const fenced=text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate=(fenced?.[1] ?? text).trim();
  const start=candidate.indexOf("{");
  const end=candidate.lastIndexOf("}");
  if(start<0 || end<=start) throw new Error("Anthropic did not return a JSON object");
  try{return JSON.parse(candidate.slice(start,end+1));}
  catch{throw new Error("Anthropic returned invalid JSON output");}
}

function validateInput(input: unknown): AnthropicPromptInput {
  if (!input || typeof input !== "object") throw new Error("Anthropic task input must be an object");
  const value=input as Partial<AnthropicPromptInput>;
  if (typeof value.system !== "string" || !value.system.trim()) throw new Error("Anthropic system prompt is required");
  if (typeof value.instruction !== "string" || !value.instruction.trim()) throw new Error("Anthropic instruction is required");
  if (value.system.length > 40_000 || value.instruction.length > 100_000) throw new Error("Anthropic prompt exceeds configured bounds");
  return value as AnthropicPromptInput;
}

/**
 * Canonical server-side Anthropic adapter for text/structured workflow tasks.
 * The secure AI gateway still owns authorization, fallback, output validation,
 * and provenance; this adapter owns the provider HTTP contract and cancellation.
 */
export function createAnthropicProvider(options: AnthropicProviderOptions): AiProvider {
  if (!options.apiKey.trim()) throw new Error("Anthropic API key is required");
  if (!options.model.trim()) throw new Error("Anthropic model is required");
  const fetchImpl=options.fetchImpl ?? fetch;
  const timeoutMs=options.timeoutMs ?? 90_000;
  const maxResponseBytes=options.maxResponseBytes ?? 512*1024;

  return {
    id:"anthropic",
    async execute<I,O>(task: AiTask<I,O>): Promise<AiResult<O>> {
      const input=validateInput(task.input);
      const maxTokens=Math.max(1,Math.min(8192,Math.floor(input.maxTokens ?? 4096)));
      const temperature=Math.max(0,Math.min(1,input.temperature ?? 0));
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),timeoutMs);
      try{
        const response=await fetchImpl(options.apiUrl ?? DEFAULT_API,{
          method:"POST",
          headers:{
            "content-type":"application/json",
            "x-api-key":options.apiKey,
            "anthropic-version":options.anthropicVersion ?? DEFAULT_VERSION,
          },
          redirect:"error",
          signal:controller.signal,
          body:JSON.stringify({
            model:options.model,max_tokens:maxTokens,temperature,
            system:input.system,
            messages:[{role:"user",content:input.instruction}],
          }),
        });
        const payload=await readBoundedResponse(response,maxResponseBytes);
        const parsed=responseText(payload);
        const output=(input.outputMode === "json" ? parseJsonText(parsed.text) : parsed.text) as O;
        return {
          output,
          confidence: confidence(1) as Confidence,
          model:parsed.model,
          taskId:task.id,
          sources:[...(input.sources ?? [])],
          warnings:[],
        };
      }catch(error){
        if(controller.signal.aborted) throw new Error("ANTHROPIC_TIMEOUT");
        throw error;
      }finally{clearTimeout(timer);}
    },
  };
}
