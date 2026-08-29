import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { faqJsonLd } from "@/components/seo-landing";

const PATH = "/certified-mail-guide";
const TITLE = "Certified Mail Guide: What It Is and When People Use It | MailMyPDF";
const DESC = "Learn what certified mail is, when people use it, and how it differs from standard mail. MailMyPDF offers certified and registered mail as add-on options at checkout.";

const FAQ = [
  {
    q: "Does MailMyPDF offer certified mail?",
    a: "Yes. MailMyPDF offers Certified Mail (tracking + signature) and Registered Mail (insured + tracking) as add-on options at checkout.",
  },
  {
    q: "What is certified mail used for?",
    a: "Certified mail is commonly used when the sender wants proof that a letter was mailed and delivered or delivery was attempted.",
  },
  {
    q: "Can I use standard mail instead of certified mail?",
    a: "It depends on your situation. MailMyPDF does not provide legal, tax, financial, or professional advice. You are responsible for confirming what mailing method is required.",
  },
  {
    q: "Does MailMyPDF guarantee delivery?",
    a: "No. MailMyPDF helps print and mail your document, but we do not guarantee delivery, acceptance, or recipient action.",
  },
  {
    q: "Can I choose between standard and certified mail?",
    a: "Certified mail is available now as an add-on option at checkout. You can choose standard, certified, or registered mail when sending your letter.",
  },
];

const RELATED_LINKS = [
  { to: "/send-letter-online", label: "Send a letter online" },
  { to: "/mail-a-pdf", label: "Mail a PDF" },
  { to: "/send-a-letter-without-a-printer", label: "Send a letter without a printer" },
  { to: "/send-documents-by-mail-online", label: "Send documents by mail online" },
  { to: "/send-letter-to-landlord", label: "Send a letter to a landlord" },
  { to: "/mail-tax-documents-online", label: "Mail tax documents online" },
];

const STEPS = [
  { n: "01", t: "Upload your PDF", d: "Drag in your PDF. Up to 10 pages, under 10MB." },
  { n: "02", t: "Enter the mailing address", d: "U.S. domestic addresses only in this release." },
  { n: "03", t: "Review the price and pay online", d: "Secure Stripe checkout. Starts at $4.99." },
  { n: "04", t: "We print and mail your letter", d: "Printed and dropped in the mail through our print partner." },
];

const BREADCRUMB_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://mailmypdf.com/" },
    { "@type": "ListItem", position: 2, name: "Certified Mail Guide", item: "https://mailmypdf.com/certified-mail-guide" },
  ],
};

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8h10m0 0L9 4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PrimaryCta() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Link
        to="/send"
        className="inline-flex items-center gap-2 rounded-full bg-cobalt px-6 py-3 text-base font-medium text-white shadow-stamp transition-transform hover:-translate-y-0.5"
      >
        Upload PDF <ArrowRight />
      </Link>
      <span className="font-mono text-xs uppercase tracking-widest text-cobalt">Starting at $4.99</span>
    </div>
  );
}

export const Route = createFileRoute("/certified-mail-guide")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PATH },
    ],
    links: [{ rel: "canonical", href: PATH }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(faqJsonLd(FAQ)) },
      { type: "application/ld+json", children: JSON.stringify(BREADCRUMB_JSON_LD) },
    ],
  }),
  component: CertifiedMailGuidePage,
});

function CertifiedMailGuidePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-6 py-20 md:py-24">
          <div className="postmark w-fit">Guide</div>
          <h1 className="mt-6 text-4xl leading-[1.05] md:text-6xl">Certified Mail Guide</h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-soft">
            Certified mail is often used when someone wants proof that a letter was mailed and delivered or delivery
            was attempted. This guide explains what certified mail is, when people commonly use it, and how it differs
            from sending a standard physical letter.
          </p>
          <div className="mt-6 rounded-md border border-rule/70 bg-paper-deep/60 p-4 text-sm text-foreground">
            <span className="font-semibold text-cobalt">Good news:</span> MailMyPDF offers Certified Mail (tracking + signature) and Registered Mail (insured + tracking) as add-on options at checkout.
          </div>
        </div>
      </section>

      {/* What is certified mail? */}
      <section className="border-t border-rule/60 bg-paper-deep/40">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="postmark w-fit">Definition</div>
          <h2 className="mt-4 text-3xl md:text-4xl">What is certified mail?</h2>
          <p className="mt-6 text-lg text-ink-soft">
            Certified mail is a USPS service that gives the sender proof that a letter was mailed and that delivery was
            made or attempted. The sender typically receives a receipt at the time of mailing and may also receive a
            record of delivery, including the recipient's signature if return receipt service is requested.
          </p>
        </div>
      </section>

      {/* When do people use it? */}
      <section className="border-t border-rule/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <div className="postmark w-fit">Use cases</div>
            <h2 className="mt-4 text-3xl md:text-4xl">When do people use certified mail?</h2>
          </div>
          <div className="mt-8 grid gap-x-8 gap-y-3 md:grid-cols-2">
            {[
              "Important notices",
              "Business correspondence",
              "Landlord or tenant letters",
              "Tax or agency correspondence",
              "Cancellation letters",
              "Formal complaints",
              "Documents where the sender wants a mailing record",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 border-b border-rule/70 py-3">
                <div className="h-1.5 w-1.5 rounded-full bg-stamp" />
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="border-t border-rule/60 bg-paper-deep/40">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="postmark w-fit">Compare</div>
          <h2 className="mt-4 text-3xl md:text-4xl">Certified mail vs. standard mail</h2>
          <div className="mt-8 overflow-hidden rounded-md border border-rule/70">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Standard Mail</th>
                  <th className="px-4 py-3 font-semibold">Certified Mail</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-rule/70">
                  <td className="px-4 py-3">Lower cost</td>
                  <td className="px-4 py-3">Provides proof of mailing and delivery/attempt</td>
                </tr>
                <tr className="border-t border-rule/70">
                  <td className="px-4 py-3">Good for everyday letters</td>
                  <td className="px-4 py-3">Often used for important correspondence</td>
                </tr>
                <tr className="border-t border-rule/70">
                  <td className="px-4 py-3">No certified-mail proof</td>
                  <td className="px-4 py-3">May cost more</td>
                </tr>
                <tr className="border-t border-rule/70">
                  <td className="px-4 py-3">Available through MailMyPDF</td>
                  <td className="px-4 py-3">Available as an add-on at checkout</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Does MailMyPDF offer certified mail? */}
      <section className="border-t border-rule/60">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="postmark w-fit">Service</div>
          <h2 className="mt-4 text-3xl md:text-4xl">Does MailMyPDF offer certified mail?</h2>
          <p className="mt-6 text-lg text-ink-soft">
            Yes. MailMyPDF offers Certified Mail (tracking + signature) and Registered Mail (insured + tracking) as add-on options at checkout. You can choose your preferred mail class when placing your order.
          </p>
        </div>
      </section>

      {/* Can I still use MailMyPDF? */}
      <section className="border-t border-rule/60 bg-paper-deep/40">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="postmark w-fit">Standard mail</div>
          <h2 className="mt-4 text-3xl md:text-4xl">Can I still use MailMyPDF to mail important documents?</h2>
          <p className="mt-6 text-lg text-ink-soft">
            Yes, if standard physical mail is acceptable for your situation. Users are responsible for confirming
            whether standard mail, certified mail, or another delivery method is required.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-rule/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <div className="postmark w-fit">Process</div>
            <h2 className="mt-4 text-3xl md:text-4xl">How MailMyPDF works</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="envelope-card p-6">
                <div className="font-mono text-xs text-cobalt">{s.n}</div>
                <div className="mt-3 font-serif text-2xl">{s.t}</div>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="border-t border-rule/60 bg-paper-deep/40">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <div className="postmark mx-auto w-fit">Send now</div>
          <h2 className="mt-4 text-3xl md:text-4xl">Need to mail a PDF?</h2>
          <p className="mt-4 text-lg text-ink-soft">
            If standard U.S. domestic mail works for your document, MailMyPDF lets you upload your PDF and send it as a
            physical letter without a printer, envelope, stamp, or post office trip.
          </p>
          <div className="mt-8 flex justify-center">
            <PrimaryCta />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-rule/60">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="postmark mx-auto w-fit">FAQ</div>
          <h2 className="mt-4 text-center text-3xl md:text-4xl">Questions people ask</h2>
          <div className="mt-10 divide-y divide-rule/70 border-y border-rule/70">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between list-none">
                  <span className="font-serif text-xl">{item.q}</span>
                  <span className="text-cobalt transition-transform group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-3 text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related links */}
      <section className="border-t border-rule/60 bg-paper-deep/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="postmark w-fit">Related</div>
          <h2 className="mt-4 font-serif text-3xl">More ways to mail a PDF</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {RELATED_LINKS.map((r) => (
              <Link
                key={r.to}
                to={r.to}
                className="envelope-card block px-5 py-4 text-sm font-medium text-foreground hover:text-cobalt"
              >
                {r.label} →
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-rule/60">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="rounded-md border border-rule/70 bg-paper-deep/40 p-6 text-sm text-muted-foreground">
            <div className="font-mono text-xs uppercase tracking-widest text-cobalt">Disclaimer</div>
            <p className="mt-2">
              MailMyPDF provides document printing and mailing tools. We do not provide legal, tax, financial, or
              professional advice. Users are responsible for confirming whether standard mail, certified mail, or
              another delivery method is required for their situation.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-rule/60">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <div className="postmark mx-auto w-fit">Ready to mail</div>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl">
            Upload. Address. <span className="italic text-cobalt">Mailed.</span>
          </h2>
          <div className="mt-8 flex justify-center">
            <PrimaryCta />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
