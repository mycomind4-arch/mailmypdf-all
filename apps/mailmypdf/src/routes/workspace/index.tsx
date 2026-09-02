/**
 * MailMyPDF Workspace Dashboard
 *
 * Authenticated user home screen showing:
 * - Active workflows across all verticals
 * - Recent mailings
 * - Visible pricing benefits
 * - Quick actions
 *
 * This is the unified entry point after login.
 * Small Business Dashboard model applied to entire ecosystem.
 */

import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Plus, Mail, FileText, Clock, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AuthenticatedSidebar } from "@/components/authenticated-sidebar";
import { getUserEntitlementDetails } from "@/lib/entitlements.functions";
import { getUserRecentActivity } from "@/lib/activity.functions";

export const Route = createFileRoute("/workspace/")({
  component: WorkspaceDashboard,
  // TODO: Re-enable auth check after Phase 2 testing
  // beforeLoad: async ({ context }) => {
  //   // Require authentication
  //   if (!context.user) {
  //     throw redirect({ to: "/auth" });
  //   }
  // },
});

function WorkspaceDashboard() {
  const { user } = useAuth();

  // Fetch user entitlements
  const { data: entitlements, isLoading: entitlementsLoading } = useQuery({
    queryKey: ["user-entitlements"],
    queryFn: () => getUserEntitlementDetails.fetch(),
  });

  // Fetch recent activity
  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["user-activity"],
    queryFn: () => getUserRecentActivity.fetch(),
  });

  const greeting = getGreeting();

  return (
    <div className="min-h-screen bg-paper flex">
      {/* Sidebar */}
      <AuthenticatedSidebar
        user={user}
        userRole="member"
        organizationName="MailMyPDF"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="border-b border-rule/60 bg-paper sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl">{greeting}</h1>
              <p className="text-sm text-ink-soft">{user?.email}</p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/send"
                className="inline-flex items-center gap-2 rounded-full bg-cobalt px-4 py-2 text-sm font-medium text-white hover:-translate-y-0.5 transition-transform"
              >
                <Mail className="h-4 w-4" />
                Mail a PDF
              </Link>
              <Link
                to="/ecosystem"
                className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-4 py-2 text-sm font-medium hover:bg-paper-deep transition-colors"
              >
                <Plus className="h-4 w-4" />
                Start Workflow
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Active Work Section */}
          <section>
            <h2 className="font-serif text-2xl mb-4">Active Work</h2>
            {activityLoading ? (
              <div className="text-center py-8 text-ink-soft">Loading...</div>
            ) : activity?.activeWorkflows && activity.activeWorkflows.length > 0 ? (
              <div className="space-y-3">
                {activity.activeWorkflows.map((workflow) => (
                  <ActiveWorkCard key={workflow.id} workflow={workflow} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-rule/60 bg-card p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 text-ink-soft" />
                <p className="text-ink-soft">No active workflows</p>
                <Link
                  to="/ecosystem"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cobalt hover:text-cobalt/80"
                >
                  Start a workflow <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </section>

          {/* Recent Mailings Section */}
          <section>
            <h2 className="font-serif text-2xl mb-4">Recent Mailings</h2>
            {activityLoading ? (
              <div className="text-center py-8 text-ink-soft">Loading...</div>
            ) : activity?.recentMailings && activity.recentMailings.length > 0 ? (
              <div className="space-y-2">
                {activity.recentMailings.map((mailing) => (
                  <MailingRow key={mailing.id} mailing={mailing} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-rule/60 bg-card p-8 text-center">
                <Mail className="h-12 w-12 mx-auto mb-3 text-ink-soft" />
                <p className="text-ink-soft">No mailings yet</p>
              </div>
            )}
          </section>

          {/* Benefits & Entitlements Section */}
          <section className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="font-serif text-2xl mb-4">Your Benefits</h2>
              {entitlementsLoading ? (
                <div className="text-center py-8 text-ink-soft">Loading...</div>
              ) : entitlements ? (
                <BenefitsPanel entitlements={entitlements} />
              ) : (
                <div className="rounded-lg border border-rule/60 bg-card p-8">
                  <p className="text-ink-soft">Standard pricing applies</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="font-serif text-2xl mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <QuickActionButton
                  label="Mail Again"
                  description="Recent recipients"
                  icon={Mail}
                  to="/send"
                />
                <QuickActionButton
                  label="Start Workflow"
                  description="Use a template"
                  icon={FileText}
                  to="/ecosystem"
                />
                <QuickActionButton
                  label="My Mailings"
                  description="Track orders"
                  icon={Clock}
                  to="/workspace/mailings"
                />
                <QuickActionButton
                  label="Settings"
                  description="Account & profile"
                  icon={ArrowRight}
                  to="/workspace/settings"
                />
              </div>
            </div>
          </section>
        </div>
      </main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

interface ActiveWorkflow {
  id: string;
  workflowName: string;
  workflowSlug: string;
  verticalSlug: string;
  verticalName: string;
  status: "draft" | "in_progress" | "submitted" | "waiting_approval" | "completed";
  createdAt: string;
  updatedAt: string;
}

function ActiveWorkCard({ workflow }: { workflow: ActiveWorkflow }) {
  const statusIcon = {
    draft: <FileText className="h-4 w-4 text-ink-soft" />,
    in_progress: <Clock className="h-4 w-4 text-cobalt" />,
    submitted: <CheckCircle className="h-4 w-4 text-cobalt" />,
    waiting_approval: <AlertCircle className="h-4 w-4 text-amber-600" />,
    completed: <CheckCircle className="h-4 w-4 text-green-600" />,
  };

  const statusLabel = {
    draft: "Draft",
    in_progress: "In Progress",
    submitted: "Submitted",
    waiting_approval: "Waiting for Approval",
    completed: "Completed",
  };

  return (
    <Link
      to={getWorkflowRoute(workflow.verticalSlug, workflow.workflowSlug)}
      className="block rounded-lg border border-rule/60 bg-card p-4 hover:border-rule hover:bg-paper-deep transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{workflow.workflowName}</h3>
            <span className="text-xs text-ink-soft">{workflow.verticalName}</span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">{statusLabel[workflow.status]}</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-rule bg-card">
          {statusIcon[workflow.status]}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Updated {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
      </p>
    </Link>
  );
}

interface Mailing {
  id: string;
  workflowName?: string;
  status: "draft" | "paid" | "submitted_to_provider" | "mailed" | "in_transit" | "delivered" | "failed";
  mailingService: "first_class" | "certified" | "registered";
  recipientName: string;
  priceCents: number;
  mailedAt?: string;
  createdAt: string;
}

function MailingRow({ mailing }: { mailing: Mailing }) {
  const statusIcon = {
    draft: <FileText className="h-4 w-4 text-ink-soft" />,
    paid: <CheckCircle className="h-4 w-4 text-cobalt" />,
    submitted_to_provider: <Clock className="h-4 w-4 text-cobalt" />,
    mailed: <Mail className="h-4 w-4 text-cobalt" />,
    in_transit: <Clock className="h-4 w-4 text-cobalt" />,
    delivered: <CheckCircle className="h-4 w-4 text-green-600" />,
    failed: <AlertCircle className="h-4 w-4 text-red-600" />,
  };

  const statusLabel = {
    draft: "Draft",
    paid: "Paid",
    submitted_to_provider: "Submitted",
    mailed: "Mailed",
    in_transit: "In Transit",
    delivered: "Delivered",
    failed: "Failed",
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-rule/60 bg-card p-3 text-sm">
      <div className="flex items-center gap-3 flex-1">
        {statusIcon[mailing.status]}
        <div className="flex-1">
          <p className="font-medium">{mailing.workflowName || "Document"}</p>
          <p className="text-xs text-ink-soft">
            {mailing.recipientName} • {mailing.mailingService.replace("_", " ")}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-xs">{statusLabel[mailing.status]}</p>
        <p className="text-xs text-ink-soft">
          {format(new Date(mailing.createdAt), "MMM d")}
        </p>
      </div>
    </div>
  );
}

interface Entitlements {
  policySlug: string;
  policyName: string;
  workflowPrice: number;
  normalWorkflowPrice: number;
  mailingPrice: number;
  normalMailingPrice: number;
  serviceFeeWaived: boolean;
  privateOfficeIncluded: boolean;
  premiumWorkflowsIncluded: boolean;
  expiresAt?: string;
}

function BenefitsPanel({ entitlements }: { entitlements: Entitlements }) {
  const workflowSavings = entitlements.normalWorkflowPrice - entitlements.workflowPrice;
  const mailingSavings = entitlements.normalMailingPrice - entitlements.mailingPrice;

  return (
    <div className="rounded-lg border border-rule/60 bg-card p-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <BenefitItem
          label="Workflows"
          normalPrice={entitlements.normalWorkflowPrice}
          actualPrice={entitlements.workflowPrice}
          isFree={entitlements.workflowPrice === 0}
        />
        <BenefitItem
          label="Certified Mail"
          normalPrice={entitlements.normalMailingPrice}
          actualPrice={entitlements.mailingPrice}
          isFree={false}
        />
        {entitlements.serviceFeeWaived && (
          <BenefitItem
            label="Service Fees"
            normalPrice={99}
            actualPrice={0}
            isFree={true}
          />
        )}
        {entitlements.privateOfficeIncluded && (
          <div className="rounded-lg border border-brass/20 bg-brass/5 p-3">
            <p className="text-xs text-ink-soft mb-1">Private Office</p>
            <p className="font-medium text-sm">INCLUDED</p>
          </div>
        )}
      </div>

      <div className="border-t border-rule/60 pt-4 text-xs text-ink-soft">
        <p>
          <strong>Policy:</strong> {entitlements.policyName}
        </p>
        {entitlements.expiresAt && (
          <p className="mt-1">
            <strong>Expires:</strong> {format(new Date(entitlements.expiresAt), "MMM d, yyyy")}
          </p>
        )}
      </div>
    </div>
  );
}

function BenefitItem({
  label,
  normalPrice,
  actualPrice,
  isFree,
}: {
  label: string;
  normalPrice: number;
  actualPrice: number;
  isFree: boolean;
}) {
  return (
    <div className="rounded-lg border border-brass/20 bg-brass/5 p-3">
      <p className="text-xs text-ink-soft mb-2">{label}</p>
      {isFree ? (
        <p className="font-medium text-sm text-brass">Included</p>
      ) : (
        <>
          <p className="text-sm text-ink-soft line-through">
            ${(normalPrice / 100).toFixed(2)}
          </p>
          <p className="font-medium text-sm">${(actualPrice / 100).toFixed(2)}</p>
        </>
      )}
    </div>
  );
}

function QuickActionButton({
  label,
  description,
  icon: Icon,
  to,
}: {
  label: string;
  description: string;
  icon: typeof Mail;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-lg border border-rule/60 bg-card p-3 hover:border-rule hover:bg-paper-deep transition-colors"
    >
      <div className="flex-1">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-ink-soft">{description}</p>
      </div>
      <Icon className="h-4 w-4 text-cobalt" />
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getWorkflowRoute(verticalSlug: string, workflowSlug: string): string {
  // Route to the specific workflow in its vertical
  // This depends on your vertical routing structure
  // For now, direct to the vertical's workflow page
  const verticalRoutes: Record<string, string> = {
    "notice-respond": "https://notice-respond.pages.dev",
    "immigration-mail": "https://immigration-mail.pages.dev",
    "appeal-reply": "https://appeal-mail.pages.dev",
    "dispute-mail": "https://dispute-mail.pages.dev",
    "private-office": "https://mycomind4-arch-mailmypdf-private-office.pages.dev",
    "records-request": "https://mailmypdf-etc.pages.dev/records-request",
  };

  const verticalUrl = verticalRoutes[verticalSlug];
  if (verticalUrl) {
    return `${verticalUrl}`;
  }

  return "/ecosystem";
}
