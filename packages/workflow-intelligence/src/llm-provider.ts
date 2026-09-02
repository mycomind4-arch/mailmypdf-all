/**
 * LLM Provider Abstraction
 *
 * Unified interface for multiple LLM providers (Anthropic, Gemini).
 * Allows switching providers based on cost, speed, or availability.
 */

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { llmConfig } from "./config";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  text: string;
  provider: "anthropic" | "gemini";
  tokensUsed?: {
    input: number;
    output: number;
  };
  cost?: {
    usd: number;
    provider: string;
  };
}

export interface LLMRequestOptions {
  maxTokens?: number;
  temperature?: number;
  provider?: "anthropic" | "gemini" | "auto";
  retryCount?: number;
}

/**
 * LLM Provider - Unified interface for multiple LLM services
 */
export class LLMProvider {
  private anthropic?: Anthropic;
  private gemini?: GoogleGenerativeAI;
  private config = llmConfig.getConfig();

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize LLM providers based on configuration
   */
  private initializeProviders(): void {
    if (this.config.anthropic?.apiKey) {
      this.anthropic = new Anthropic({
        apiKey: this.config.anthropic.apiKey,
      });
    }

    if (this.config.gemini?.apiKey) {
      this.gemini = new GoogleGenerativeAI(this.config.gemini.apiKey);
    }

    if (!this.anthropic && !this.gemini) {
      throw new Error(
        "No LLM providers configured. Set ANTHROPIC_API_KEY or GEMINI_API_KEY."
      );
    }
  }

  /**
   * Send a message to an LLM and get response
   */
  async sendMessage(
    messages: LLMMessage[],
    options: LLMRequestOptions = {}
  ): Promise<LLMResponse> {
    const provider = this.selectProvider(options.provider);

    try {
      if (provider === "anthropic") {
        return await this.sendToAnthropic(messages, options);
      } else {
        return await this.sendToGemini(messages, options);
      }
    } catch (error) {
      // Retry with alternate provider if available
      if (options.retryCount === undefined || options.retryCount > 0) {
        const alternateProvider = provider === "anthropic" ? "gemini" : "anthropic";
        if (this.isProviderAvailable(alternateProvider)) {
          console.warn(
            `Primary provider (${provider}) failed, retrying with ${alternateProvider}`
          );
          return this.sendMessage(messages, {
            ...options,
            provider: alternateProvider,
            retryCount: (options.retryCount || 1) - 1,
          });
        }
      }

      throw error;
    }
  }

  /**
   * Send message to Anthropic Claude
   */
  private async sendToAnthropic(
    messages: LLMMessage[],
    options: LLMRequestOptions
  ): Promise<LLMResponse> {
    if (!this.anthropic) {
      throw new Error("Anthropic not configured");
    }

    const response = await this.anthropic.messages.create({
      model: this.config.anthropic?.model || "claude-opus-5",
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature,
      messages: messages as Anthropic.MessageParam[],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in response");
    }

    return {
      text: textContent.text,
      provider: "anthropic",
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      cost: this.calculateAnthropicCost(
        response.usage.input_tokens,
        response.usage.output_tokens
      ),
    };
  }

  /**
   * Send message to Google Gemini
   */
  private async sendToGemini(
    messages: LLMMessage[],
    options: LLMRequestOptions
  ): Promise<LLMResponse> {
    if (!this.gemini) {
      throw new Error("Gemini not configured");
    }

    const model = this.gemini.getGenerativeModel({
      model: this.config.gemini?.model || "gemini-2.0-pro-exp-12-05",
    });

    const response = await model.generateContent({
      contents: messages.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
      },
    });

    const text =
      response.response.text() ||
      response.response.candidates?.[0]?.content?.parts?.[0]?.text ||
      "";

    return {
      text,
      provider: "gemini",
      cost: {
        usd: 0, // Gemini pricing varies, would need to implement
        provider: "google-gemini",
      },
    };
  }

  /**
   * Calculate cost for Anthropic API call
   */
  private calculateAnthropicCost(
    inputTokens: number,
    outputTokens: number
  ): { usd: number; provider: string } {
    // Claude 3.5 Sonnet pricing (as of Sept 2024)
    const inputCost = (inputTokens / 1_000_000) * 3; // $3 per 1M input tokens
    const outputCost = (outputTokens / 1_000_000) * 15; // $15 per 1M output tokens

    return {
      usd: inputCost + outputCost,
      provider: "anthropic",
    };
  }

  /**
   * Select which provider to use
   */
  private selectProvider(preference?: string): "anthropic" | "gemini" {
    if (preference === "anthropic" || preference === "gemini") {
      if (this.isProviderAvailable(preference)) {
        return preference;
      }
    }

    // Auto-select based on availability
    if (this.isProviderAvailable("anthropic")) {
      return "anthropic";
    }
    if (this.isProviderAvailable("gemini")) {
      return "gemini";
    }

    throw new Error("No LLM providers available");
  }

  /**
   * Check if provider is available
   */
  private isProviderAvailable(provider: "anthropic" | "gemini"): boolean {
    if (provider === "anthropic") {
      return !!this.anthropic && !!this.config.anthropic?.apiKey;
    }
    if (provider === "gemini") {
      return !!this.gemini && !!this.config.gemini?.apiKey;
    }
    return false;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): ("anthropic" | "gemini")[] {
    const providers: ("anthropic" | "gemini")[] = [];
    if (this.isProviderAvailable("anthropic")) providers.push("anthropic");
    if (this.isProviderAvailable("gemini")) providers.push("gemini");
    return providers;
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(provider: "anthropic" | "gemini"): {
    maxContextTokens: number;
    supportsStreaming: boolean;
    supportsVision: boolean;
    speed: "fast" | "medium" | "slow";
  } {
    if (provider === "anthropic") {
      return {
        maxContextTokens: 200_000,
        supportsStreaming: true,
        supportsVision: true,
        speed: "medium",
      };
    }

    if (provider === "gemini") {
      return {
        maxContextTokens: 1_000_000,
        supportsStreaming: true,
        supportsVision: true,
        speed: "fast",
      };
    }

    throw new Error(`Unknown provider: ${provider}`);
  }
}

export const llmProvider = new LLMProvider();
