/**
 * Centralized Feature Flag System for MailMyPDF.
 *
 * All feature gates go through this module — no scattered process.env checks
 * or ad-hoc boolean functions. Flags are resolved from the centralized config
 * module and can be overridden via environment variables for operational control.
 *
 * Usage:
 *   import { flags } from "@/lib/feature-flags";
 *   if (flags.isLobEnabled()) { ... }
 *   if (flags.isAutoSubmitEnabled()) { ... }
 */

import { getConfig } from "@/config";

// ── Flag Definitions ─────────────────────────────────────────────────────────

export interface FlagDefinition {
  /** Stable key used in env overrides (e.g. FEATURE_FLAG_AUTO_SUBMIT). */
  key: string;
  /** Human-readable description. */
  description: string;
  /** Whether the flag is safe to toggle at runtime without restart. */
  runtimeToggleable: boolean;
}

export const FLAG_DEFINITIONS: Record<string, FlagDefinition> = {
  autoSubmitToLob: {
    key: "FEATURE_FLAG_AUTO_SUBMIT",
    description: "Automatically submit paid orders to Lob for fulfillment",
    runtimeToggleable: true,
  },
  lobEnabled: {
    key: "FEATURE_FLAG_LOB_ENABLED",
    description: "Lob integration is configured and available",
    runtimeToggleable: false,
  },
  emailEnabled: {
    key: "FEATURE_FLAG_EMAIL_ENABLED",
    description: "Send transactional emails via Resend",
    runtimeToggleable: true,
  },
  scheduledDelivery: {
    key: "FEATURE_FLAG_SCHEDULED_DELIVERY",
    description: "Allow customers to schedule future delivery dates",
    runtimeToggleable: true,
  },
  certifiedMail: {
    key: "FEATURE_FLAG_CERTIFIED_MAIL",
    description: "Offer certified and registered mail options at checkout",
    runtimeToggleable: true,
  },
  colorPrinting: {
    key: "FEATURE_FLAG_COLOR_PRINTING",
    description: "Offer color printing option",
    runtimeToggleable: true,
  },
};

// ── Flag Resolver ─────────────────────────────────────────────────────────────

/**
 * Resolve a flag's value. Environment overrides take precedence, then config,
 * then the default.
 */
function resolveFlag(
  flagKey: string,
  configValue: boolean,
  envOverrideKey: string,
): boolean {
  const envValue = process.env[envOverrideKey];
  if (envValue !== undefined && envValue.trim() !== "") {
    return envValue.toLowerCase() === "true" || envValue === "1";
  }
  return configValue;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const flags = {
  /**
   * Whether auto-submit to Lob is enabled.
   * Controlled by AUTO_SUBMIT_TO_LOB or FEATURE_FLAG_AUTO_SUBMIT env var.
   */
  isAutoSubmitEnabled(): boolean {
    const config = getConfig();
    return resolveFlag(
      "autoSubmitToLob",
      config.flags.autoSubmitToLob,
      FLAG_DEFINITIONS.autoSubmitToLob.key,
    );
  },

  /**
   * Whether Lob integration is configured (API key present).
   * Not runtime-toggleable — requires deployment config.
   */
  isLobEnabled(): boolean {
    const config = getConfig();
    return resolveFlag(
      "lobEnabled",
      !!config.lob.apiKey,
      FLAG_DEFINITIONS.lobEnabled.key,
    );
  },

  /**
   * Whether transactional email is configured (Resend API key present).
   */
  isEmailEnabled(): boolean {
    const config = getConfig();
    return resolveFlag(
      "emailEnabled",
      config.flags.emailEnabled,
      FLAG_DEFINITIONS.emailEnabled.key,
    );
  },

  /**
   * Whether scheduled delivery dates are available at checkout.
   */
  isScheduledDeliveryEnabled(): boolean {
    return resolveFlag(
      "scheduledDelivery",
      true, // enabled by default
      FLAG_DEFINITIONS.scheduledDelivery.key,
    );
  },

  /**
   * Whether certified/registered mail options are available.
   */
  isCertifiedMailEnabled(): boolean {
    return resolveFlag(
      "certifiedMail",
      true, // enabled by default
      FLAG_DEFINITIONS.certifiedMail.key,
    );
  },

  /**
   * Whether color printing is available.
   */
  isColorPrintingEnabled(): boolean {
    return resolveFlag(
      "colorPrinting",
      true, // enabled by default
      FLAG_DEFINITIONS.colorPrinting.key,
    );
  },

  /**
   * Returns all flags and their current values for admin dashboard display.
   */
  getAllFlags(): Array<{ key: string; description: string; value: boolean; runtimeToggleable: boolean }> {
    return Object.entries(FLAG_DEFINITIONS).map(([name, def]) => ({
      key: name,
      description: def.description,
      value: this[`is${name.charAt(0).toUpperCase()}${name.slice(1)}Enabled` as keyof typeof flags]
        ? true
        : false,
      runtimeToggleable: def.runtimeToggleable,
    }));
  },

  /**
   * Returns a simple boolean map of all flags — useful for API responses.
   */
  toObject(): Record<string, boolean> {
    return {
      autoSubmitToLob: this.isAutoSubmitEnabled(),
      lobEnabled: this.isLobEnabled(),
      emailEnabled: this.isEmailEnabled(),
      scheduledDelivery: this.isScheduledDeliveryEnabled(),
      certifiedMail: this.isCertifiedMailEnabled(),
      colorPrinting: this.isColorPrintingEnabled(),
    };
  },
};

// ── Documentation Export ──────────────────────────────────────────────────────

/**
 * All feature flags can be overridden via environment variables:
 *
 * | Flag              | Env Override                    | Default     |
 * |-------------------|---------------------------------|-------------|
 * | autoSubmitToLob   | FEATURE_FLAG_AUTO_SUBMIT        | from config |
 * | lobEnabled        | FEATURE_FLAG_LOB_ENABLED        | from config |
 * | emailEnabled      | FEATURE_FLAG_EMAIL_ENABLED       | from config |
 * | scheduledDelivery | FEATURE_FLAG_SCHEDULED_DELIVERY| true        |
 * | certifiedMail     | FEATURE_FLAG_CERTIFIED_MAIL     | true        |
 * | colorPrinting     | FEATURE_FLAG_COLOR_PRINTING     | true        |
 *
 * Set override to "true" or "1" to enable, "false" or "0" to disable.
 * Absence of the env var falls back to the config-derived default.
 */
