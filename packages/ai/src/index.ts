import { confidence, SecurityError, ValidationError, type Confidence, type PlatformId } from "@mailmypdf/core";

export type AiProviderId = "anthropic" | "gemini" | "openai" | (string & {});
export type AiTaskKind = "classify" | "extract" | "analyze" | "research" | "draft" | "validate";

/** Shared baseline; a workflow may narrow this policy but must not bypass the gateway. */
export const DEFAULT_AI_EXECUTION_POLICY: AiExecutionPolicy = {
  providers: ["anthropic", "gemini", "openai"],
  timeoutMs: 30_000,
  maxAttemptsPerProvider: 2,
  maxInputBytes: 2_000_000,
  requiredScope: "ai:execute",
  allowFallback: true,
};

export interface AiSecurityContext {
  actorId: string;
  caseId: string;
  scopes: readonly string[];
  trustedInput: boolean;
}

export interface AiExecutionPolicy {
  providers: readonly AiProviderId[];
  timeoutMs: number;
  maxAttemptsPerProvider: number;
  maxInputBytes: number;
  requiredScope: string;
  allowFallback: boolean;
}

export interface AiProvenance {
  provider: AiProviderId;
  model: string;
  taskKind: AiTaskKind;
  taskId: string;
  caseId: string;
  inputSha256: string;
  outputSha256: string;
  promptVersion: string;
  fallbackFrom?: AiProviderId;
  createdAt: string;
}

export interface AiTask<I, O> {
  id: string;
  input: I;
  outputSchema: string;
  metadata?: Record<string, string>;
}

export interface AiResult<O> {
  output: O;
  confidence: Confidence;
  model: string;
  taskId: string;
  sources: readonly PlatformId[];
  warnings: readonly string[];
  provenance?: AiProvenance;
}

export interface AiProvider {
  readonly id?: AiProviderId;
  execute<I, O>(task: AiTask<I, O>): Promise<AiResult<O>>;
}

export interface SecureAiRequest<I, O> {
  task: AiTask<I, O> & { kind: AiTaskKind; promptVersion: string };
  context: AiSecurityContext;
  policy: AiExecutionPolicy;
  validateOutput: (output: unknown) => output is O;
}

export interface SecureAiGateway {
  execute<I, O>(request: SecureAiRequest<I, O>): Promise<AiResult<O>>;
}

function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new ValidationError("timeoutMs must be positive");
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs)),
  ]);
}

export function createSecureAiGateway(providers: ReadonlyMap<AiProviderId, AiProvider>): SecureAiGateway {
  return {
    async execute<I, O>(request: SecureAiRequest<I, O>): Promise<AiResult<O>> {
      const { context, policy, task } = request;
      if (!context.actorId || !context.caseId || !context.trustedInput) throw new SecurityError("AI request lacks trusted case context");
      if (!context.scopes.includes(policy.requiredScope)) throw new SecurityError("AI scope is not authorized");
      if (byteLength(task.input) > policy.maxInputBytes) throw new SecurityError("AI input exceeds policy limit");
      if (policy.providers.length === 0) throw new ValidationError("At least one AI provider is required");

      let previousProvider: AiProviderId | undefined;
      let lastError: unknown;
      for (const providerId of policy.providers) {
        const provider = providers.get(providerId);
        if (!provider) { lastError = new Error(`AI_PROVIDER_UNAVAILABLE:${providerId}`); continue; }
        const attempts = Math.max(1, Math.min(3, Math.floor(policy.maxAttemptsPerProvider)));
        for (let attempt = 1; attempt <= attempts; attempt++) {
          try {
            const result = await withTimeout(provider.execute(task), policy.timeoutMs);
            if (!request.validateOutput(result.output)) throw new ValidationError("AI output failed schema validation");
            const output = result.output as O;
            const provenance: AiProvenance = {
              provider: providerId,
              model: result.model,
              taskKind: task.kind,
              taskId: task.id,
              caseId: context.caseId,
              inputSha256: await sha256(task.input),
              outputSha256: await sha256(output),
              promptVersion: task.promptVersion,
              ...(previousProvider ? { fallbackFrom: previousProvider } : {}),
              createdAt: new Date().toISOString(),
            };
            return { ...result, output, provenance, confidence: confidence(Number(result.confidence)) };
          } catch (error) {
            lastError = error;
            if (attempt === attempts && (!policy.allowFallback || providerId === policy.providers.at(-1))) throw error;
          }
        }
        previousProvider = providerId;
      }
      throw lastError instanceof Error ? lastError : new Error("AI_EXECUTION_FAILED");
    },
  };
}

/** Keeps document text visibly separate from instructions in provider prompts. */
export function markUntrustedDocumentText(text: string): string {
  return `<untrusted-document-text>\n${text}\n</untrusted-document-text>`;
}

/** Only server-side environment variables may supply provider secrets. */
export function readServerSecret(env: Record<string, string | undefined>, key: string): string {
  if (/^(NEXT_PUBLIC_|VITE_|PUBLIC_)/i.test(key)) throw new SecurityError("Provider secrets cannot use public environment variables");
  const value = env[key];
  if (!value) throw new SecurityError(`Missing server secret: ${key}`);
  return value;
}
