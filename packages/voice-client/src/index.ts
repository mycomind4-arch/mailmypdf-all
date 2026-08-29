export type VoiceClientTransport = "pipecat" | "livekit";

export interface VoiceClientOptions {
  readonly transport: VoiceClientTransport;
  readonly connectEndpoint: string;
  readonly caseId?: string;
  readonly verticalId?: string;
}

export interface VoiceClientState {
  readonly connected: boolean;
  readonly listening: boolean;
  readonly speaking: boolean;
  readonly error?: string;
}

/**
 * Provider-neutral browser contract. Concrete UI applications can bind this
 * to @pipecat-ai/client-js or LiveKit's browser SDK without leaking provider
 * objects into Platform domain packages.
 */
export interface PlatformVoiceClient {
  connect(options: VoiceClientOptions): Promise<void>;
  disconnect(): Promise<void>;
  interrupt(): Promise<void>;
  getState(): VoiceClientState;
}

export function validateVoiceEndpoint(endpoint: string): URL {
  const url = new URL(endpoint);
  if (url.protocol !== "https:") throw new Error("Voice endpoint must use HTTPS");
  return url;
}
