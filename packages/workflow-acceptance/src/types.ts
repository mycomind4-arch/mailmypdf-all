/**
 * Core types for the Studio Workflow Acceptance Engine.
 *
 * See docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md for the design this
 * implements. This module is intentionally framework-agnostic (no vitest,
 * no Supabase, no Stripe SDK types) so it can be imported from a vertical's
 * acceptance test, from the CLI, and eventually from a Studio UI panel --
 * one engine, multiple clients.
 */

// -- Failure codes ------------------------------------------------------------

export type FailureSeverity = "hard_failure" | "quality_finding";

export const FAILURE_CODES = [
  "WORKFLOW_EXECUTION_FAILED",
  "FIXTURE_MISSING",
  "FIXTURE_INVALID",
  "UPLOAD_REQUIRED",
  "UPLOAD_UNREADABLE",
  "PACKET_UPLOAD_MISSING",
  "PACKET_UPLOAD_DUPLICATED",
  "PACKET_UNEXPECTED_UPLOAD",
  "PACKET_MANIFEST_MISMATCH",
  "PDF_GENERATION_FAILED",
  "PDF_INVALID",
  "PDF_PLACEHOLDER_PRESENT",
  "PAYMENT_SIMULATION_FAILED",
  "PAYMENT_DUPLICATE_FULFILLMENT",
  "MAIL_REQUEST_INVALID",
  "MAIL_DUPLICATE_FULFILLMENT",
  "EXPECTATION_NOT_MET",
] as const;
export type FailureCode = (typeof FAILURE_CODES)[number];

export interface AcceptanceFailure {
  code: FailureCode;
  message: string;
  severity: FailureSeverity;
  context?: Record<string, unknown>;
}

// -- Scenario / fixture model --------------------------------------------------

/** One synthetic upload the scenario supplies to the workflow. */
export interface ScenarioUpload {
  /** Stable id referenced by expected.mustIncludeUploads / manifest checks. */
  id: string;
  /** File name relative to the scenario's uploads/ directory. */
  file: string;
  mimeType: "application/pdf" | "image/png" | "image/jpeg";
  /** Human label, e.g. "Form 1099", used in reports and failure messages. */
  label: string;
  /** Whether this upload is the primary document the workflow analyzes. */
  isPrimary?: boolean;
  /** Whether the user requested this upload be enclosed in the mailed packet. */
  includeInMail: boolean;
}

/** scenario.json */
export interface Scenario {
  id: string;
  workflowId: string;
  title: string;
  description: string;
  /** Fields the scenario feeds into the workflow's intake/approval steps. */
  intake: Record<string, unknown>;
  uploads: ScenarioUpload[];
  /** Optional deterministic seed for any randomized fixture generation. */
  seed?: string;
}

/** expected.json */
export interface ScenarioExpectations {
  mustContain?: string[];
  mustNotContain?: string[];
  mustIncludeUploads?: string[];
  mustGenerate?: string[];
  minPageCount?: number;
  maxPageCount?: number;
}

export interface LoadedScenario {
  scenario: Scenario;
  expected: ScenarioExpectations;
  /** Absolute paths to each upload file, keyed by upload id. */
  uploadPaths: Record<string, string>;
}

// -- Trace ----------------------------------------------------------------------

export interface TraceEvent {
  event: string;
  at: string; // ISO timestamp
  durationMs?: number;
  detail?: Record<string, unknown>;
}

// -- Packet manifest --------------------------------------------------------

export interface PacketManifestItem {
  type: "generated" | "user_upload";
  name: string;
  pages: number;
  uploadId?: string;
  includeInMail?: boolean;
  sha256?: string;
}

export interface PacketManifest {
  packetId: string;
  items: PacketManifestItem[];
}

// -- Provider simulation records ---------------------------------------------

export interface StripeSimulationRecord {
  checkoutSessionId: string;
  amountCents: number;
  currency: string;
  metadata: Record<string, string>;
  webhookDeliveries: number;
  fulfillmentInvocations: number;
}

export interface LobSimulationRecord {
  provider: "lob_mock";
  recipient: Record<string, unknown>;
  sender?: Record<string, unknown>;
  mailType: string;
  pdfPath: string;
  pageCount: number | null;
  metadata: Record<string, unknown>;
  idempotencyKey: string;
  workflowId: string;
  runId: string;
  createCommunicationCalls: number;
}

// -- Checks / gates -----------------------------------------------------------

export type CheckStatus = "pass" | "fail" | "blocked" | "skipped";

export interface CheckResult {
  name: string;
  status: CheckStatus;
  detail?: string;
}

// -- Final report ---------------------------------------------------------------

export interface AcceptanceReport {
  runId: string;
  workflow: string;
  scenario: string;
  startedAt: string;
  finishedAt: string;
  status: "passed" | "failed";
  mailReady: boolean;
  checks: Record<string, CheckStatus>;
  failures: AcceptanceFailure[];
  qualityFindings: AcceptanceFailure[];
  artifacts: {
    report: string;
    trace: string;
    manifest?: string;
    packet?: string;
    screenshots?: string;
    runDir: string;
  };
}
