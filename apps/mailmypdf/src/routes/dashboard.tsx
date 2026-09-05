/**
 * User Dashboard (Phase 2)
 *
 * Displays:
 * - Active entitlements and pricing policy
 * - Monthly quota usage (free workflows)
 * - Usage breakdown
 * - Recent quotes and orders
 * - Account settings quick links
 */

import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { Suspense } from "react";
import { getUserEntitlements } from "~/lib/entitlements-management.functions";
import { getQuotaUsage } from "~/lib/entitlements-management.functions";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  loader: async ({ context }) => {
    // This would normally come from auth context
    // For now, we'll render the component and fetch client-side
    return { initialized: true };
  },
});

function DashboardPage() {
  const { initialized } = useLoaderData({ from: "/dashboard" });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            View your entitlements, usage, and account settings
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Primary Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Entitlements Card */}
            <Suspense fallback={<EntitlementsSkeleton />}>
              <EntitlementsCard />
            </Suspense>

            {/* Quota Usage Card */}
            <Suspense fallback={<QuotaSkeletons />}>
              <QuotaUsageCard />
            </Suspense>

            {/* Recent Activity Card */}
            <Suspense fallback={<ActivitySkeleton />}>
              <RecentActivityCard />
            </Suspense>
          </div>

          {/* Sidebar (1/3 width) */}
          <aside className="space-y-6">
            {/* Quick Actions Card */}
            <QuickActionsCard />

            {/* Account Status Card */}
            <AccountStatusCard />

            {/* Help & Support Card */}
            <HelpCard />
          </aside>
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// ENTITLEMENTS CARD
// ============================================================================

function EntitlementsCard() {
  return (
    <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
          Your Pricing Plan
        </h2>
        <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-sm font-medium">
          Active
        </span>
      </div>

      <div className="space-y-6">
        {/* Plan Name */}
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Current Plan
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
            Standard Pricing
          </p>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
            $19.00 per workflow + mail services
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 gap-4">
          <BenefitItem icon="📄" label="Workflows" value="Unlimited" />
          <BenefitItem icon="📧" label="Mail Service" value="Standard" />
          <BenefitItem icon="🔬" label="AI Processing" value="Included" />
          <BenefitItem icon="💾" label="Storage" value="5 GB" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button className="flex-1 px-4 py-2 bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition">
            Upgrade Plan
          </button>
          <button className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-50 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// QUOTA USAGE CARD
// ============================================================================

function QuotaUsageCard() {
  return (
    <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-6">
        This Month's Usage
      </h2>

      <div className="space-y-6">
        {/* Workflows */}
        <UsageItem
          label="Workflows Completed"
          current={12}
          limit={100}
          icon="📋"
        />

        {/* AI Processing */}
        <UsageItem
          label="AI Processing Credits"
          current={4230}
          limit={10000}
          icon="🤖"
        />

        {/* Storage */}
        <UsageItem label="Storage Used" current={1.2} limit={5} icon="💾" />
      </div>

      {/* Usage Info Box */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          <strong>Reset date:</strong> Oct 1, 2026 • Usage resets automatically on the 1st of each month
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// RECENT ACTIVITY CARD
// ============================================================================

function RecentActivityCard() {
  return (
    <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-6">
        Recent Activity
      </h2>

      <div className="space-y-4">
        <ActivityItem
          date="Sep 4, 2026"
          title="Workflow completed: CP2000 Response"
          status="success"
          icon="✓"
        />
        <ActivityItem
          date="Sep 3, 2026"
          title="Plan verified before payment"
          status="neutral"
          icon="💳"
        />
        <ActivityItem
          date="Sep 2, 2026"
          title="Quote generated: $69.99"
          status="neutral"
          icon="📝"
        />
        <ActivityItem
          date="Aug 28, 2026"
          title="Plan changed to Standard Pricing"
          status="neutral"
          icon="⚙️"
        />
      </div>

      <button className="mt-6 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
        View full activity log →
      </button>
    </div>
  );
}

// ============================================================================
// QUICK ACTIONS CARD
// ============================================================================

function QuickActionsCard() {
  return (
    <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">
        Quick Actions
      </h3>

      <div className="space-y-2">
        <QuickAction label="Start a workflow" href="/workflows" />
        <QuickAction label="View all workflows" href="/catalog" />
        <QuickAction label="Account settings" href="/settings" />
        <QuickAction label="Billing & invoices" href="/billing" />
      </div>
    </div>
  );
}

// ============================================================================
// ACCOUNT STATUS CARD
// ============================================================================

function AccountStatusCard() {
  return (
    <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">
        Account Status
      </h3>

      <div className="space-y-3">
        <StatusItem label="Email verified" status="yes" />
        <StatusItem label="Payment method" status="yes" />
        <StatusItem label="Two-factor auth" status="no" />
      </div>

      <button className="mt-4 w-full px-3 py-2 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition">
        Configure security →
      </button>
    </div>
  );
}

// ============================================================================
// HELP CARD
// ============================================================================

function HelpCard() {
  return (
    <div className="bg-gradient-to-b from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm p-6">
      <h3 className="text-lg font-bold text-purple-900 dark:text-purple-50 mb-2">
        Need help?
      </h3>
      <p className="text-sm text-purple-800 dark:text-purple-200 mb-4">
        Check our docs or contact support
      </p>
      <button className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded transition">
        Contact support
      </button>
    </div>
  );
}

// ============================================================================
// COMPONENT FRAGMENTS
// ============================================================================

function BenefitItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
      <p className="text-2xl mb-2">{icon}</p>
      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-900 dark:text-slate-50 mt-1">
        {value}
      </p>
    </div>
  );
}

function UsageItem({
  label,
  current,
  limit,
  icon,
}: {
  label: string;
  current: number;
  limit: number;
  icon: string;
}) {
  const percentage = (current / limit) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
            {label}
          </p>
        </div>
        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
          {current.toLocaleString()} / {limit.toLocaleString()}
        </p>
      </div>
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

function ActivityItem({
  date,
  title,
  status,
  icon,
}: {
  date: string;
  title: string;
  status: "success" | "neutral" | "error";
  icon: string;
}) {
  const colors = {
    success: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950",
    neutral: "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900",
    error: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950",
  };

  return (
    <div className="flex gap-4">
      <div className={`text-lg leading-none pt-1`}>{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
          {title}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
          {date}
        </p>
      </div>
    </div>
  );
}

function QuickAction({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition text-slate-900 dark:text-slate-50 text-sm font-medium"
    >
      {label} →
    </a>
  );
}

function StatusItem({
  label,
  status,
}: {
  label: string;
  status: "yes" | "no";
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
      <span
        className={`text-xs font-bold ${
          status === "yes"
            ? "text-green-600 dark:text-green-400"
            : "text-slate-400 dark:text-slate-600"
        }`}
      >
        {status === "yes" ? "✓" : "○"}
      </span>
    </div>
  );
}

// ============================================================================
// LOADING SKELETONS
// ============================================================================

function EntitlementsSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6 animate-pulse">
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-6" />
      <div className="space-y-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
      </div>
    </div>
  );
}

function QuotaSkeletons() {
  return (
    <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6 animate-pulse">
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-6" />
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
            <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6 animate-pulse">
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-6" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
        ))}
      </div>
    </div>
  );
}
