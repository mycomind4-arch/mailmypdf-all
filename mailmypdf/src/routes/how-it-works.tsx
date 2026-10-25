import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — MailMyPDF" },
      { name: "description", content: "How MailMyPDF works: upload your document, we prepare your letter, and mail it with tracking and proof of delivery." },
    ],
  }),
  component: () => (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="eyebrow">How It Works</div>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Three steps. Real mail. Full record.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          MailMyPDF turns a supported PDF into physical mail without requiring a printer, envelope, or post-office trip. Available tracking and delivery records depend on the mail class you choose.
        </p>
        <div className="mt-12 space-y-8">
          {[
            { num: "01", title: "Upload your PDF", desc: "Drag and drop your document. The mailing flow currently accepts PDF files up to 10 pages and 10 MB." },
            { num: "02", title: "Choose your mail class", desc: "Choose Standard, Certified, or Registered Mail. Tracking and delivery records depend on the mail class selected; review the exact service and price before payment." },
            { num: "03", title: "We print, envelope, and mail", desc: "Your document is printed, enveloped, and sent via USPS. You receive tracking and proof of delivery." },
          ].map((step) => (
            <div key={step.num} className="rounded-2xl border border-rule bg-paper-deep/30 p-6">
              <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">{step.num}</div>
              <h2 className="mt-2 font-serif text-2xl">{step.title}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>

        <section className="mt-16 rounded-3xl border border-cobalt/20 bg-cobalt/5 p-6 sm:p-8">
          <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-cobalt">Use it from ChatGPT</div>
          <h2 className="mt-3 font-serif text-3xl">The same controlled mailing flow can start in a conversation.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            After connecting your MailMyPDF account to ChatGPT, you can draft a letter there or use an existing PDF.
            MailMyPDF still prepares the exact mailing, verifies addresses, shows the price, and keeps approval and payment
            as separate steps.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              "Draft or revise the letter in ChatGPT, or attach the PDF you want to mail.",
              "Review the exact PDF, sender, recipient, service, color choice, and total.",
              "Approve the exact mailing. Approval by itself never charges a card.",
              "Use hosted checkout or separately confirm a saved payment method and send-now request.",
            ].map((item, index) => (
              <div key={item} className="flex gap-3 rounded-xl border border-rule bg-card p-4 text-sm leading-6 text-muted-foreground">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <Link to="/chatgpt" className="mt-6 inline-flex items-center rounded-full bg-cobalt px-5 py-2.5 text-sm font-semibold text-white hover:bg-cobalt/90">
            Read the ChatGPT connector guide
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  ),
});
