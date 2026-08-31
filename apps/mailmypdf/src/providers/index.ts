/**
 * Provider factory — the single entry point for obtaining provider instances.
 *
 * The application layer imports from here, not from the adapter modules
 * directly. This makes it trivial to swap implementations for testing
 * or future migrations (e.g., Lob → Postal Methods, Resend → SendGrid).
 *
 * Usage:
 *   import { providers } from "@/providers";
 *   const letter = await providers.mail().createLetter({ ... });
 *
 * For tests:
 *   import { createMockProviderFactory } from "@/providers/mock-factory";
 *   const testProviders = createMockProviderFactory();
 */

import {
  type ProviderFactory,
  type MailProvider,
  type PaymentProvider,
  type NotificationProvider,
  type StorageProvider,
} from "@/providers/interfaces";
import { LobAdapter } from "@/providers/adapters/lob-adapter";
import { StripeAdapter } from "@/providers/adapters/stripe-adapter";
import { ResendAdapter } from "@/providers/adapters/resend-adapter";
import { SupabaseStorageAdapter } from "@/providers/adapters/supabase-storage-adapter";

// ── Singleton instances (lazily initialized) ──────────────────────────────────

let mailProvider: MailProvider | null = null;
let paymentProvider: PaymentProvider | null = null;
let notificationProvider: NotificationProvider | null = null;
let storageProvider: StorageProvider | null = null;

/**
 * The production provider factory.
 * Returns singleton instances of each provider adapter.
 */
export const providers: ProviderFactory = {
  mail(): MailProvider {
    if (!mailProvider) mailProvider = new LobAdapter();
    return mailProvider;
  },

  payment(): PaymentProvider {
    if (!paymentProvider) paymentProvider = new StripeAdapter();
    return paymentProvider;
  },

  notification(): NotificationProvider {
    if (!notificationProvider) notificationProvider = new ResendAdapter();
    return notificationProvider;
  },

  storage(): StorageProvider {
    if (!storageProvider) storageProvider = new SupabaseStorageAdapter();
    return storageProvider;
  },
};

/**
 * Reset all cached providers — useful for testing.
 */
export function resetProviders(): void {
  mailProvider = null;
  paymentProvider = null;
  notificationProvider = null;
  storageProvider = null;
}

/**
 * Inject a custom provider factory — useful for testing.
 * Returns the previous factory so you can restore it.
 */
export function setProviderFactory(
  factory: ProviderFactory,
): ProviderFactory {
  const previous = providers;
  // Overwrite the methods on the existing object
  (providers as any).mail = factory.mail;
  (providers as any).payment = factory.payment;
  (providers as any).notification = factory.notification;
  (providers as any).storage = factory.storage;
  return previous;
}

// Re-export interfaces and types for convenience
export type {
  ProviderFactory,
  MailProvider,
  PaymentProvider,
  NotificationProvider,
  StorageProvider,
  PostalAddress,
  MailClass,
  LetterResult,
  CreateLetterRequest,
  CheckoutSessionRequest,
  CheckoutSessionResult,
  RefundResult,
  WebhookEvent,
  EmailMessage,
  NotificationResult,
  SignedUrlResult,
  UploadResult,
  ProviderHealth,
  PaymentEnvironment,
} from "@/providers/interfaces";
