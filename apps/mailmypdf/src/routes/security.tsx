import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CheckCircle2, CreditCard, Eye, FileCheck2, LockKeyhole, ShieldCheck } from "lucide-react";
import { SecurityTrustBand, SiteFooter, SiteHeader } from "@/components/site-chrome";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security & Trust | MailMyPDF" },
      {
        name: "description",
        content:
          "How MailMyPDF protects documents, keeps users in control before mailing, handles payment, and explains privacy and retention.",
      },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "/security" }],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="border-b border-rule bg-paper-deep/25">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cobalt">
              Security & Trust
            </div>
            <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-[0.98] sm:text-6xl">
              Important documents deserve visible controls.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              MailMyPDF is designed so you can understand what is happening to your document,
              review the exact output before a mailing action, and keep the resulting record tied
              to the work that produced it.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <SecurityTrustBand />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <TrustCard
              icon={<LockKeyhole className="h-5 w-5" />}
              title="Protected workflow boundaries"
              text="Protected workflows use owner-scoped records and security controls around uploaded files. Files that require scanning are held until the configured checks clear them."
            />
            <TrustCard
              icon={<Eye className="h-5 w-5" />}
              title="Review before sending"
              text="A workflow should not turn a draft into a mailing silently. Review and approval remain explicit steps before a supported fulfillment action."
            />
            <TrustCard
              icon={<FileCheck2 className="h-5 w-5" />}
              title="A record of what was approved"
              text="Where the workflow supports mailing, the approved packet can remain connected to the order and available delivery or tracking records."
            />
            <TrustCard
              icon={<CreditCard className="h-5 w-5" />}
              title="Payment separation"
              text="Checkout uses Stripe when production payments are enabled. MailMyPDF does not need to display or store raw card details in the application interface."
            />
            <TrustCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Privacy and retention are documented"
              text="Privacy and retention are separate policies so you can see what information is used, what is retained, and how deletion or export requests are handled."
            />
            <TrustCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="Service claims stay specific"
              text="Mailing capabilities differ by workflow and mail class. The selected checkout options and final review screen are the source of truth for the service being purchased."
            />
          </div>
        </section>

        <section className="border-y border-rule bg-paper-deep/25">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-3">
            <PolicyLink to="/privacy" title="Privacy Policy" text="How MailMyPDF handles personal information and documents." />
            <PolicyLink to="/retention" title="Data Retention" text="How long drafts, completed orders, and operational records are retained." />
            <PolicyLink to="/terms" title="Terms of Service" text="Service boundaries, user responsibilities, and governing terms." />
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <h2 className="font-serif text-4xl">You should know what happens next.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Before submitting sensitive material, review the workflow-specific instructions,
            privacy policy, retention policy, and the exact mailing or delivery option shown at checkout.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/how-it-works" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
              How MailMyPDF works
            </Link>
            <Link to="/ecosystem" className="rounded-full border border-rule bg-card px-6 py-3 text-sm font-semibold">
              Browse workflows
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function TrustCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-rule bg-card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cobalt/20 bg-cobalt/5 text-cobalt">
        {icon}
      </div>
      <h2 className="mt-5 font-serif text-2xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
    </article>
  );
}

function PolicyLink({ to, title, text }: { to: string; title: string; text: string }) {
  return (
    <Link to={to} className="rounded-xl border border-rule bg-card p-5 transition hover:border-cobalt/40">
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
      <span className="mt-4 inline-flex text-sm font-semibold text-cobalt">Read policy →</span>
    </Link>
  );
}
