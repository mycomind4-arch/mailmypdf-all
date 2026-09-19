import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense } from "react";
import { getUserStats } from "@/lib/user.functions";
import {
  ECOSYSTEM_VERTICALS,
  getPlatformEntitlement,
  getRemainingWorkflows,
} from "@/lib/ecosystem";
import { ArrowRight, Send, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [{ title: "MailMyPDF — Your Mail Desk" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <Suspense
      fallback={<div className="text-sm text-muted-foreground">Loading your mail desk…</div>}
    >
      <MailDesk />
    </Suspense>
  ),
});

function MailDesk() {
  const getStats = useServerFn(getUserStats);
  const { data } = useSuspenseQuery({ queryKey: ["user-stats"], queryFn: () => getStats() });
  const entitlement = getPlatformEntitlement();
  const remaining = getRemainingWorkflows(entitlement);
  const intelligentVerticals = ECOSYSTEM_VERTICALS.filter((vertical) => vertical.requiresAccount);

  return (
    <div className="space-y-8 pb-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-rule/60 bg-card p-6 sm:p-9">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cobalt/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-ink/4 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="eyebrow">Your Mail Desk</div>
          <h2 className="mt-4 text-2xl leading-tight sm:text-3xl md:text-4xl">
            What are you sending today?
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft sm:text-base">
            One account gives you a common entry point to specialized correspondence tools. Prepare,
            send, track, and prove your important documents.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/send"
              className="inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-2.5 text-sm font-medium text-white shadow-stamp transition-all duration-200 hover:-translate-y-px hover:bg-cobalt/90"
            >
              <Send className="h-4 w-4" /> Send a Document
            </Link>
            <Link
              to="/ecosystem"
              className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-5 py-2.5 text-sm font-medium transition-colors hover:bg-paper-deep"
            >
              Explore Workflows
            </Link>
          </div>
        </div>
      </section>

      {/* Mailing activity */}
      <section className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
        <div className="envelope-card p-6 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="eyebrow">My work</div>
              <h3 className="mt-2 font-serif text-2xl">Your mailing activity</h3>
            </div>
            <Link
              to="/dashboard/orders"
              className="text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              View all →
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Orders" value={data.totalOrders.toString()} />
            <StatTile label="Spent" value={`$${(data.totalSpentCents / 100).toFixed(2)}`} />
            <StatTile label="This month" value={data.thisMonthOrders.toString()} />
            <StatTile label="Avg. order" value={`$${(data.avgOrderCents / 100).toFixed(2)}`} />
          </div>
          {data.recentOrders.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-rule p-5 text-center">
              <p className="text-sm text-muted-foreground">
                No mailings yet. Send your first piece of correspondence.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-2">
              {data.recentOrders.slice(0, 3).map((o: any) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-3 border-b border-rule/40 pb-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {o.letter_text ? "Letter" : o.file_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {o.recipient_city}, {o.recipient_state} ·{" "}
                      {new Date(o.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{o.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="envelope-card flex flex-col p-6 sm:p-7">
          <div className="eyebrow">Platform usage</div>
          <h3 className="mt-2 font-serif text-2xl">
            {entitlement.plan === "free" ? "Free allowance" : `${entitlement.plan} plan`}
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Platform intelligence is metered separately from physical mailing.
          </p>
          <div className="mt-6">
            <div className="flex items-end justify-between text-sm">
              <span>Workflows remaining</span>
              <span className="font-mono text-xs">{remaining}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-rule/50">
              <div
                className="h-full rounded-full bg-cobalt"
                style={{
                  width: `${Math.min(100, (entitlement.workflowsUsed / Math.max(1, entitlement.workflowsIncluded)) * 100)}%`,
                }}
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {entitlement.workflowsUsed} used of {entitlement.workflowsIncluded} included
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between gap-4 pt-6">
            <Link
              to="/dashboard/settings"
              className="text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              Manage account →
            </Link>
            <span className="text-xs text-muted-foreground">Mailing billed separately</span>
          </div>
        </div>
      </section>

      {/* Workflow shortcuts */}
      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Start a workflow</div>
            <h3 className="mt-2 font-serif text-2xl sm:text-3xl">Choose what you need help with</h3>
          </div>
          <Link
            to="/dashboard/ecosystem"
            className="hidden text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            About the ecosystem →
          </Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {intelligentVerticals.map((vertical) => (
            <a
              key={vertical.slug}
              href={vertical.href}
              className="group envelope-card envelope-card-hover p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="rounded-full border border-rule bg-card px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {vertical.label}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-cobalt" />
              </div>
              <h4 className="mt-5 font-serif text-xl sm:text-2xl">{vertical.title}</h4>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{vertical.description}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="rounded-2xl border border-rule/60 bg-paper-deep/30 p-6 sm:p-8">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="eyebrow">The MailMyPDF model</div>
            <h3 className="mt-2 font-serif text-2xl sm:text-3xl">
              Intelligence when you need it. Mailing when you are ready.
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              One MailMyPDF identity across the ecosystem. Increase platform usage as your needs
              grow; pay separately when you send physical correspondence.
            </p>
          </div>
          <Link
            to="/send"
            className="inline-flex items-center gap-2 justify-center rounded-full bg-cobalt px-5 py-2.5 text-sm font-medium text-white shadow-stamp transition-all duration-200 hover:-translate-y-px hover:bg-cobalt/90"
          >
            <Mail className="h-4 w-4" /> Send correspondence
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-rule/50 bg-paper/50 p-3 sm:p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold sm:text-xl">{value}</div>
    </div>
  );
}
