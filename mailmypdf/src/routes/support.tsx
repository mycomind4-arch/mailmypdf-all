import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CircleHelp, CreditCard, FileText, Mail, ShieldCheck } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support | MailMyPDF" },
      {
        name: "description",
        content:
          "Get help with MailMyPDF accounts, document workflows, checkout, mailing status, and security questions.",
      },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "/support" }],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="border-b border-rule bg-paper-deep/25">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cobalt">
              MailMyPDF / Support
            </div>
            <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[0.98] sm:text-6xl">
              Help with your document workflow.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Get help with account access, uploaded documents, workflow state, checkout,
              mailing status, tracking, or a MailMyPDF connection used from an AI assistant.
            </p>
            <a
              href="mailto:help@mailmypdf.ai"
              className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Email help@mailmypdf.ai
            </a>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-2">
          <SupportCard
            icon={<FileText className="h-5 w-5" />}
            title="Documents and workflows"
            text="Questions about uploads, document scanning, matter state, draft generation, packet review, or workflow selection."
          />
          <SupportCard
            icon={<CreditCard className="h-5 w-5" />}
            title="Checkout and payment"
            text="Questions about a quote, secure hosted checkout, payment state, refunds, or a checkout that did not complete."
          />
          <SupportCard
            icon={<Mail className="h-5 w-5" />}
            title="Mailing and tracking"
            text="Questions about provider submission, mailing status, tracking, delivery, returns, or proof associated with an order."
          />
          <SupportCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Security and connected assistants"
            text="Questions about account connections, OAuth consent, document security, privacy, retention, or MailMyPDF tools used from ChatGPT and other MCP clients."
          />
        </section>

        <section className="border-y border-rule bg-paper-deep/25">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <div className="flex items-start gap-3">
              <CircleHelp className="mt-1 h-5 w-5 text-cobalt" />
              <div>
                <h2 className="font-serif text-2xl">For legal, tax, or filing advice</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  MailMyPDF provides document preparation and mailing tools, not professional
                  legal, tax, or financial advice. For questions that require professional
                  judgment about your rights, deadlines, or strategy, consult an appropriate
                  qualified professional.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h2 className="font-serif text-3xl">Policies and service information</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/security" className="rounded-full border border-rule bg-card px-5 py-2.5 text-sm font-semibold">Security & Trust</Link>
            <Link to="/privacy" className="rounded-full border border-rule bg-card px-5 py-2.5 text-sm font-semibold">Privacy Policy</Link>
            <Link to="/retention" className="rounded-full border border-rule bg-card px-5 py-2.5 text-sm font-semibold">Data Retention</Link>
            <Link to="/terms" className="rounded-full border border-rule bg-card px-5 py-2.5 text-sm font-semibold">Terms of Service</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function SupportCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-rule bg-card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cobalt/20 bg-cobalt/5 text-cobalt">{icon}</div>
      <h2 className="mt-5 font-serif text-2xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
    </article>
  );
}
