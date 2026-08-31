/**
 * Provider interface contracts for the MailMyPDF domain layer.
 *
 * These interfaces define what the application needs from its external
 * services (mail delivery, payments, email notifications, file storage).
 * The domain/business-logic layer depends only on these interfaces —
 * never on concrete implementations or SDK clients.
 *
 * Adapters in `src/providers/adapters/` wrap the real third-party SDKs
 * (Lob, Stripe, Resend, Supabase Storage) behind these contracts.
 *
 * This is the Dependency Inversion boundary: high-level policy does not
 * depend on low-level details. Both depend on abstractions.
 */

// ── Shared Types ─────────────────────────────────────────────────────────────

export interface PostalAddress {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal: string;
  country?: string; // ISO 3166-1 alpha-2, defaults to "US"
}

export type MailClass = "standard" | "certified" | "registered";

export interface LetterResult {
  id: string;
  status?: string | null;
  expectedDeliveryDate?: string | null;
  trackingNumber?: string | null;
  url?: string | null;
}

export interface CreateLetterRequest {
  orderId: string;
  pdfUrl: string;
  to: PostalAddress;
  from: PostalAddress;
  description?: string;
  idempotencyKey: string;
  color?: boolean;
  extraService?: MailClass;
}

export interface LetterStatusEvent {
  letterId: string;
  externalEventId?: string | null;
  eventType: string;
  lobStatus: string;
  timestamp?: string | null;
}

export type ProviderHealthStatus = "healthy" | "degraded" | "down" | "unknown";

export interface ProviderHealth {
  status: ProviderHealthStatus;
  message?: string;
  lastCheckedAt: string;
}

// ── Mail Provider ─────────────────────────────────────────────────────────────

/**
 * Abstracts physical mail delivery (Lob, Postal Methods, etc.).
 */
export interface MailProvider {
  readonly name: string;

  /**
   * Submit a letter for printing and mailing.
   * Must be idempotent — the same idempotencyKey should not create
   * duplicate letters.
   */
  createLetter(req: CreateLetterRequest): Promise<LetterResult>;

  /**
   * Verify the authenticity of a webhook payload from the mail provider.
   * Returns the parsed event and the raw body.
   */
  verifyWebhook(req: Request): Promise<{ event: unknown; raw: string }>;

  /**
   * Map a provider-specific status string to our internal OrderStatus.
   * Returns null if the status doesn't map to anything actionable.
   */
  mapStatusToOrderStatus(externalStatus: string | null | undefined): string | null;

  /** Check if the provider is configured and reachable. */
  isConfigured(): boolean;

  /** Lightweight health check for monitoring. */
  checkHealth?(): Promise<ProviderHealth>;
}

// ── Payment Provider ──────────────────────────────────────────────────────────

export interface CheckoutSessionRequest {
  orderId: string;
  amountCents: number;
  currency: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey?: string;
}

export interface CheckoutSessionResult {
  id: string;
  url: string | null;
  paymentIntentId?: string;
}

export interface RefundResult {
  id: string;
  amountCents: number;
  status: string;
}

export interface WebhookEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  id: string;
}

export type PaymentEnvironment = "sandbox" | "live";

/**
 * Abstracts payment processing (Stripe, PayPal, etc.).
 */
export interface PaymentProvider {
  readonly name: string;

  /** Create a checkout session for an order. */
  createCheckoutSession(req: CheckoutSessionRequest): Promise<CheckoutSessionResult>;

  /** Retrieve an existing checkout session by ID. */
  retrieveCheckoutSession(sessionId: string): Promise<{
    id: string;
    paymentStatus: string;
    paymentIntentId?: string;
    metadata?: Record<string, string>;
  }>;

  /** Create a refund for a payment. */
  createRefund(paymentIntentId: string, amountCents?: number): Promise<RefundResult>;

  /** Verify a webhook payload and return the parsed event. */
  verifyWebhook(req: Request): Promise<WebhookEvent>;

  /** Get the active payment environment (sandbox or live). */
  getEnvironment(): PaymentEnvironment;

  /** Check if the provider is configured. */
  isConfigured(): boolean;

  /** Lightweight health check. */
  checkHealth?(): Promise<ProviderHealth>;
}

// ── Notification Provider ─────────────────────────────────────────────────────

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface NotificationResult {
  ok: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Abstracts transactional email / notifications (Resend, SendGrid, etc.).
 */
export interface NotificationProvider {
  readonly name: string;

  /** Send an email message. */
  send(message: EmailMessage): Promise<NotificationResult>;

  /** Check if the provider is configured. */
  isConfigured(): boolean;

  /** Lightweight health check. */
  checkHealth?(): Promise<ProviderHealth>;
}

// ── Storage Provider ──────────────────────────────────────────────────────────

export interface SignedUrlResult {
  url: string;
  expiresAt: string;
}

export interface UploadResult {
  path: string;
  size: number;
  contentType: string;
}

/**
 * Abstracts file storage (Supabase Storage, S3, Cloudflare R2, etc.).
 */
export interface StorageProvider {
  readonly name: string;

  /** Generate a time-limited signed URL for downloading a file. */
  createSignedUrl(path: string, ttlSeconds: number): Promise<SignedUrlResult>;

  /** Upload a file to storage. */
  upload(
    path: string,
    data: Buffer | Uint8Array,
    contentType: string,
  ): Promise<UploadResult>;

  /** Delete a file from storage. */
  delete(path: string): Promise<void>;

  /** Check if a file exists. */
  exists(path: string): Promise<boolean>;

  /** Check if the provider is configured. */
  isConfigured(): boolean;
}

// ── Provider Factory ──────────────────────────────────────────────────────────

/**
 * Factory interface for obtaining provider instances.
 * This allows dependency injection in tests and clean separation
 * between the application layer and the infrastructure layer.
 */
export interface ProviderFactory {
  mail(): MailProvider;
  payment(): PaymentProvider;
  notification(): NotificationProvider;
  storage(): StorageProvider;
}
