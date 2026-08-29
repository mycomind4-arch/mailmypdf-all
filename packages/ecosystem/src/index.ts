/**
 * @mailmypdf/ecosystem — provider-neutral contracts for the shared account,
 * entitlement, vertical-access, and monetization model.
 */

import type { PlatformId } from "@mailmypdf/core";

export type AccountId = PlatformId & { readonly __accountId: unique symbol };
export type OrganizationId = PlatformId & { readonly __organizationId: unique symbol };
export type VerticalId = PlatformId & { readonly __verticalId: unique symbol };
export type WorkflowId = PlatformId & { readonly __workflowId: unique symbol };
export type UsageEventId = PlatformId & { readonly __usageEventId: unique symbol };

export interface EcosystemIdentity {
  readonly accountId: AccountId;
  readonly organizationId?: OrganizationId;
  readonly authenticated: boolean;
  readonly issuedBy: "mailmypdf";
}

export type AccessTier = "anonymous" | "free" | "paid" | "enterprise";
export type WorkflowAccess =
  | { readonly allowed: true; readonly reason: "anonymous_basic_workflow" | "account_entitlement" | "included_usage" }
  | { readonly allowed: false; readonly reason: "account_required" | "usage_exhausted" | "vertical_disabled" | "authorization_required" };

export interface WorkflowUsagePolicy {
  readonly anonymousWorkflowsPerDay: number;
  readonly freeWorkflowsPerDay: number;
  readonly paidPlanWorkflowsPerPeriod: number | "unlimited";
  readonly accountRequiredForRichWorkflows: true;
  readonly countsCompletedWorkflow: true;
}

export const defaultWorkflowUsagePolicy: WorkflowUsagePolicy = {
  anonymousWorkflowsPerDay: 1,
  freeWorkflowsPerDay: 5,
  paidPlanWorkflowsPerPeriod: "unlimited",
  accountRequiredForRichWorkflows: true,
  countsCompletedWorkflow: true,
};

export interface UsageAllowance {
  readonly period: "day" | "month" | "billing_period";
  readonly included: number | "unlimited";
  readonly consumed: number;
  readonly remaining: number | "unlimited";
  readonly resetsAt: string;
}

export interface WorkflowAccessRequest {
  readonly identity?: EcosystemIdentity;
  readonly verticalId: VerticalId;
  readonly workflowId: WorkflowId;
  readonly anonymousBasicWorkflow: boolean;
}

export interface WorkflowEntitlement {
  readonly tier: AccessTier;
  readonly allowance: UsageAllowance;
  readonly access: WorkflowAccess;
}

export interface VerticalRegistration {
  readonly verticalId: VerticalId;
  readonly name: string;
  readonly description: string;
  readonly status: "active" | "beta" | "planned" | "disabled";
  readonly accountRequired: true;
  readonly capabilities: readonly string[];
  readonly mailingEnabled: boolean;
}

export type MailingChargeType = "postage" | "mailing_service" | "certified" | "registered" | "tracking" | "proof" | "other";
export interface MailingCharge {
  readonly type: MailingChargeType;
  readonly amountMinor: number;
  readonly currency: string;
  readonly fulfillmentReference?: string;
}
export interface PlatformUsageCharge {
  readonly usageEventId: UsageEventId;
  readonly accountId: AccountId;
  readonly workflowId: WorkflowId;
  readonly verticalId: VerticalId;
  readonly amountMinor: number;
  readonly currency: string;
  readonly quantity: number;
}
export interface CommerceBoundary {
  resolveIdentity(): Promise<EcosystemIdentity | undefined>;
  authorizeWorkflow(request: WorkflowAccessRequest): Promise<WorkflowEntitlement>;
  recordWorkflowUsage(request: WorkflowAccessRequest): Promise<UsageEventId>;
  chargePlatformUsage(charge: PlatformUsageCharge): Promise<void>;
  chargeMailing(charge: MailingCharge): Promise<void>;
}

export const ecosystemCommerceInvariants = [
  "MAILMYPDF_IS_CANONICAL_IDENTITY",
  "ONE_ACCOUNT_ACROSS_ECOSYSTEM",
  "BASIC_MAILING_MAY_BE_ANONYMOUS",
  "RICH_WORKFLOWS_REQUIRE_ACCOUNT",
  "VERTICALS_DO_NOT_IMPLEMENT_AUTH",
  "VERTICALS_DO_NOT_IMPLEMENT_BILLING",
  "PLATFORM_USAGE_IS_SEPARATE_FROM_MAILING",
  "MAILING_IS_TRANSACTIONAL",
  "WORKFLOW_IS_THE_USAGE_UNIT",
  "ALL_VERTICALS_USE_THE_SAME_ENTITLEMENT_CONTRACT",
] as const;

export * from "./workflow-sitemap.js";
