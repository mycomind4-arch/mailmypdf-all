import type { Confidence, PlatformId } from "@mailmypdf/core";

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
}

export interface AiProvider {
  execute<I, O>(task: AiTask<I, O>): Promise<AiResult<O>>;
}
