import { createFileRoute, Link } from "@tanstack/react-router";
import { PRICES, BAND_LABELS, getPricingProfilesByVertical } from "@mailmypdf/pricing";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Immigration Mail" },
      { name: "description", content: "Pay for the workflow preparation, then choose your mailing. Preparation starts at $12.99. Mailing from $4.99." },
    ],
  }),
  component: PricingPage,
});

const tiers = [
  { type: "Standard", price: `$${(PRICES.standard / 100).toFixed(2)}`, desc: "Standard delivery for non-urgent mail", features: ["3–7 business days", "USPS tracking included", "Professional printing & envelope", "Mailing record retained"] },
  { type: "Certified", price: `$${(PRICES.certified / 100).toFixed(2)}`, desc: "Trackable delivery with confirmation", features: ["3–7 business days", "Delivery tracking + confirmation", "Proof of delivery", "Mailing record retained"], featured: true },
  { type: "Registered", price: `$${(PRICES.registered / 100).toFixed(2)}`, desc: "Highest security for sensitive documents", features: ["5–10 business days", "Secure handling + tracking", "Insured delivery", "Signature required"] },
];

const faqs = [
  { q: "How does pricing work?", a: "You pay for the workflow preparation — the analysis, document drafting, and review — then choose how to send it. Mailing is a separate service." },
  { q: "What payment methods do you accept?", a: "All major credit and debit cards via Stripe." },
  { q: "Can I get a refund?", a: "If your mailing hasn't been submitted for processing yet, you can request a full refund." },
  { q: "Does the price include postage?", a: "Yes. Printing, paper, envelope, and USPS postage are all included." },
];

function PricingPage() {
  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
            <div className="postmark w-fit">Pricing</div>
            <h1 className="mt-4 font-serif text-3xl sm:text-4xl md:text-5xl">Pay for the work, then choose your mailing.</h1>
            <p className="mt-4 text-sm text-muted-foreground sm:text-base">Every workflow has a preparation fee based on its complexity. Mailing is separate.</p>
          </div>
        </section>
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
              {tiers.map((t) => (
                <div key={t.type} className={`envelope-card p-5 sm:p-6 ${t.featured ? "ring-1 ring-stamp/40" : ""}`}>
                  {t.featured && <div className="postmark w-fit mb-3">Recommended</div>}
                  <h3 className="font-serif text-2xl">{t.type}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
                  <p className="mt-4 text-4xl font-serif">{t.price}</p>
                  <p className="text-xs text-muted-foreground">per mailing, starting</p>
                  <ul className="mt-5 space-y-2">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-ink-soft">
                        <svg className="h-3.5 w-3.5 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/workflows/respond-to-notice" className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5 ${t.featured ? "bg-primary text-primary-foreground shadow-stamp" : "border border-input text-foreground hover:bg-muted"}`}>
                    Start <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="postmark w-fit">FAQ</div>
            <h2 className="mt-4 font-serif text-2xl sm:text-3xl">Pricing questions</h2>
            <div className="mt-6 divide-y divide-rule/70 border-y border-rule/70">
              {faqs.map((f) => (
                <details key={f.q} className="group py-4 sm:py-5">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
                    <span className="font-serif text-lg sm:text-xl">{f.q}</span>
                    <span className="shrink-0 text-stamp transition-transform group-open:rotate-45">＋</span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
