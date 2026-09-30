import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  MessageSquare,
  Send,
  ShieldCheck,
} from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { absoluteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/chatgpt")({
  head: () => ({
    meta: [
      { title: "Use MailMyPDF with ChatGPT | Create, Review & Mail Letters" },
      {
        name: "description",
        content:
          "Connect MailMyPDF to ChatGPT to draft or upload documents, review the exact PDF and envelope, approve the price, pay securely, mail, and track the result.",
      },
      { property: "og:title", content: "Use MailMyPDF with ChatGPT" },
      {
        property: "og:description",
        content:
          "Turn a ChatGPT conversation into real mail with exact-document review, explicit approval, secure payment, mailing, and tracking.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/chatgpt") },
      { property: "og:site_name", content: "MailMyPDF" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/chatgpt") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to use MailMyPDF with ChatGPT",
          description:
            "Connect a MailMyPDF account to ChatGPT, prepare a letter or PDF, review the exact mailing, approve it, choose payment, and track the mailing.",
          step: CHATGPT_STEPS.map((step, index) => ({
            "@type": "HowToStep",
            position: index + 1,
            name: step.title,
            text: step.description,
          })),
        }),
      },
    ],
  }),
  component: ChatGptConnectorPage,
});

const CHATGPT_STEPS = [
  {
    title: "Connect your MailMyPDF account",
    description:
      "Sign in to MailMyPDF first. In ChatGPT, connect MailMyPDF from the available Apps or Plugins area for your account or workspace.",
  },
  {
    title: "Write a letter or use a PDF",
    description:
      "Tell ChatGPT what you need to mail, revise the wording conversationally, or attach the PDF you already want to send.",
  },
  {
    title: "Review the exact mailing",
    description:
      "MailMyPDF builds the real PDF, verifies the mailing addresses, and shows the exact document, envelope details, service, color choice, and total price.",
  },
  {
    title: "Approve, then choose payment",
    description:
      "Approving the document does not charge you. If you saved a payment method, MailMyPDF shows only its safe card summary and asks separately before charging and sending. Hosted Stripe checkout remains available.",
  },
  {
    title: "Track it from chat or the website",
    description:
      "After payment and submission, ask ChatGPT for the MailMyPDF order status or open your MailMyPDF account to follow mailing and delivery information that is available for the selected service.",
  },
] as const;

const EXAMPLE_PROMPTS = [
  "Write a professional letter requesting a meeting next week. Show me the exact MailMyPDF preview before anything is sent.",
  "Mail this attached PDF by Certified Mail. Use my confirmed return address and show me the full price first.",
  "I received an IRS CP14 notice. Find the right MailMyPDF workflow and walk me through the response.",
  "Draft a public-records request for this incident, then show me the exact packet and recipient before approval.",
  "Use the same recipient as my last MailMyPDF order, but let me verify the address before preparing a new mailing.",
  "What is the current status of the letter I mailed through MailMyPDF? Show me the recorded mailing and tracking state.",
] as const;

function ChatGptConnectorPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,.12),transparent_36%),linear-gradient(180deg,#fff_0%,#f7f9fc_100%)]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:px-[52px] lg:py-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cobalt/20 bg-white/80 px-3 py-1.5 text-xs font-semibold text-cobalt shadow-sm">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                MailMyPDF + ChatGPT
              </div>
              <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-[1.02] tracking-[-0.025em] sm:text-5xl lg:text-[3.7rem]">
                Turn a ChatGPT conversation into real mail.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Draft the letter, attach a PDF, review the exact document and envelope, approve the price,
                pay securely, and send it—without leaving the conversation for the document work.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="/account/setup?return_to=/chatgpt"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
                >
                  Set up MailMyPDF <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  to="/how-it-works"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-rule bg-white px-6 text-sm font-semibold text-foreground transition hover:border-cobalt/30 hover:text-cobalt"
                >
                  How mailing works
                </Link>
              </div>
              <p className="mt-4 max-w-xl text-xs leading-5 text-muted-foreground">
                MailMyPDF availability inside ChatGPT can depend on your ChatGPT account or workspace.
                Your MailMyPDF account remains the owner of documents, approvals, payments, and mailing records.
              </p>
            </div>

            <div className="rounded-3xl border border-rule bg-card p-5 shadow-premium sm:p-6">
              <div className="rounded-2xl border border-rule bg-paper-deep/35 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
                  Example conversation
                </div>
                <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-foreground shadow-sm">
                  “Write a short letter requesting a meeting next week and mail it to this recipient.”
                </div>
                <div className="mt-3 rounded-2xl border border-cobalt/15 bg-cobalt/5 p-4 text-sm leading-6 text-foreground">
                  MailMyPDF prepares the exact letter PDF, verifies the addresses, and returns the review and price.
                </div>
                <div className="mt-3 rounded-2xl bg-white p-4 text-sm leading-6 text-foreground shadow-sm">
                  “Approve it. Charge my saved Visa ending in 4242 for $2.99 and send it now.”
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Exact PDF", icon: FileText },
                  { label: "Explicit approval", icon: CheckCircle2 },
                  { label: "Real mailing", icon: Send },
                ].map(({ label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-2 rounded-xl border border-rule bg-white px-3 py-3 text-xs font-semibold text-foreground">
                    <Icon className="h-4 w-4 text-cobalt" aria-hidden="true" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-cobalt">How to use it</div>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">From conversation to mailbox in five controlled steps.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Chat can prepare the work. You stay in control of the document, recipient, service, price, payment, and final send.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-5">
            {CHATGPT_STEPS.map((step, index) => (
              <article key={step.title} className="rounded-2xl border border-rule bg-card p-5 shadow-card">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-cobalt">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-3 font-serif text-xl">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-rule/60 bg-paper-deep/25">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
            <div className="mx-auto max-w-3xl text-center">
              <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-cobalt">What to say in ChatGPT</div>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Start with the outcome, not the tool name.</h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                You do not need to memorize MailMyPDF commands or workflow IDs. Describe what you need,
                attach the relevant document when useful, and let the conversation guide you through review and approval.
              </p>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <div key={prompt} className="flex gap-3 rounded-2xl border border-rule bg-card p-4 shadow-card">
                  <MessageSquare className="mt-1 h-4 w-4 shrink-0 text-cobalt" aria-hidden="true" />
                  <p className="text-sm leading-6 text-foreground">“{prompt}”</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-rule/60 bg-navy text-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-white/65">Payment safety</div>
              <h2 className="mt-3 font-serif text-3xl">A saved card is convenience—not permission.</h2>
              <p className="mt-4 text-sm leading-6 text-white/75">
                MailMyPDF never sends raw card details through ChatGPT. Saving a payment method does not authorize a charge.
                The exact mailing must be approved first, and saved-payment send-now requires a separate confirmation showing
                the safe card summary and exact amount.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Exact-document approval", "The PDF hash, recipient, return address, service, color, and price are bound together before payment."],
                ["Separate charge confirmation", "Document approval and payment authorization are intentionally different steps."],
                ["No raw card data in chat", "Stripe keeps payment credentials; ChatGPT receives only the safe display needed for confirmation."],
                ["Retry-safe execution", "If a payment or mailing response is uncertain, MailMyPDF resumes the same execution path instead of starting a second charge."],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-white/15 bg-white/[.06] p-4">
                  <ShieldCheck className="h-5 w-5 text-white" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-white/70">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16 text-center sm:px-8 sm:py-20">
          <CreditCard className="mx-auto h-7 w-7 text-cobalt" aria-hidden="true" />
          <h2 className="mt-4 font-serif text-3xl sm:text-4xl">Set up once. Approve each mailing when it matters.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            Create your MailMyPDF account now. Adding a saved payment method is optional, but it makes an explicitly approved
            send-now request much smoother when you use MailMyPDF from ChatGPT.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/account/setup"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
            >
              Set up my account <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/ecosystem"
              className="inline-flex h-11 items-center justify-center rounded-full border border-rule bg-card px-6 text-sm font-semibold text-foreground transition hover:border-cobalt/30 hover:text-cobalt"
            >
              Explore workflows
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
