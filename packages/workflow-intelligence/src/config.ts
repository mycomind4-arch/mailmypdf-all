/**
 * LLM Configuration
 *
 * Securely load and configure LLM providers (Anthropic, Gemini, etc.)
 * Uses environment variables, never hardcoded keys.
 */

export interface LLMConfig {
  provider: "anthropic" | "gemini" | "multi";
  anthropic?: {
    apiKey: string;
    model: string;
  };
  gemini?: {
    apiKey: string;
    model: string;
  };
}

export class LLMConfigManager {
  private config: LLMConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validate();
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig(): LLMConfig {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    const config: LLMConfig = {
      provider:
        anthropicKey && geminiKey
          ? "multi"
          : anthropicKey
            ? "anthropic"
            : geminiKey
              ? "gemini"
              : "anthropic", // Default
    };

    if (anthropicKey) {
      config.anthropic = {
        apiKey: anthropicKey,
        model: process.env.ANTHROPIC_MODEL || "claude-opus-5",
      };
    }

    if (geminiKey) {
      config.gemini = {
        apiKey: geminiKey,
        model: process.env.GEMINI_MODEL || "gemini-2.0-pro-exp-12-05",
      };
    }

    return config;
  }

  /**
   * Validate configuration
   */
  private validate(): void {
    if (!this.config.anthropic?.apiKey && !this.config.gemini?.apiKey) {
      console.warn(
        "⚠️  No LLM API keys configured. Set ANTHROPIC_API_KEY or GEMINI_API_KEY environment variables."
      );
    }

    if (this.config.anthropic?.apiKey) {
      if (!this.config.anthropic.apiKey.startsWith("sk-")) {
        console.warn("⚠️  ANTHROPIC_API_KEY does not look like a valid key");
      }
    }

    if (this.config.gemini?.apiKey) {
      if (this.config.gemini.apiKey.length < 20) {
        console.warn("⚠️  GEMINI_API_KEY does not look like a valid key");
      }
    }
  }

  /**
   * Get configuration
   */
  getConfig(): LLMConfig {
    return this.config;
  }

  /**
   * Get active provider
   */
  getProvider(): "anthropic" | "gemini" {
    if (this.config.provider === "multi") {
      // Use Anthropic as default in multi-provider mode
      // Can be configured per operation
      return "anthropic";
    }
    return this.config.provider;
  }

  /**
   * Check if provider is available
   */
  isProviderAvailable(provider: "anthropic" | "gemini"): boolean {
    if (provider === "anthropic") {
      return !!this.config.anthropic?.apiKey;
    }
    if (provider === "gemini") {
      return !!this.config.gemini?.apiKey;
    }
    return false;
  }
}

export const llmConfig = new LLMConfigManager();
