import { createFileRoute } from "@tanstack/react-router";
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
      </main>
      <SiteFooter />
    </>
  ),
});
