import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LABELS, BAND_LABELS, getProductionPricingProfiles, getPricingProfilesByVertical, type PricingBand } from "@mailmypdf/pricing";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [
    { title: "Pricing — Notice Respond" },
    { name: "description", content: "Transparent pricing: pay for the workflow preparation, then choose your mailing service. Preparation starts at $24.99. Mailing from $4.99." },
  ] }),
  component: PricingPage,
});

const mailingTiers = [
  { type: "Standard", price: `$${(499 / 100).toFixed(2)}`, desc: "Standard delivery for non-urgent mail", features: ["3–7 business days", "USPS tracking included", "Professional printing & envelope", "Mailing record retained"] },
  { type: "Certified", price: `$${(1494 / 100).toFixed(2)}`, desc: "Trackable delivery with confirmation", features: ["3–7 business days", "Delivery tracking + confirmation", "Proof of delivery", "Mailing record retained"], featured: true },
  { type: "Registered", price: `$${(3249 / 100).toFixed(2)}`, desc: "Highest security for sensitive documents", features: ["5–10 business days", "Secure handling + tracking", "Insured delivery", "Signature required"] },
];

// Show representative preparation fees by band
const noticeProfiles = getPricingProfilesByVertical("notice-respond");
const bandExamples: { band: PricingBand; label: string; price: string; desc: string }[] = [];
const seenBands = new Set<string>();
for (const p of noticeProfiles) {
  if (p.commercialStatus !== "production") continue;
  if (seenBands.has(p.band)) continue;
  seenBands.add(p.band);
  bandExamples.push({
    band: p.band,
    label: BAND_LABELS[p.band],
    price: p.basePriceCents === 0 ? "Free" : `$${(p.basePriceCents / 100).toFixed(2)}`,
    desc: p.pricingRationale?.split("—")[0]?.trim() || p.band,
  });
}
bandExamples.sort((a, b) => {
  const order: PricingBand[] = ["FREE", "ESSENTIAL", "STANDARD", "ADVANCED", "HIGH_STAKES"];
  return order.indexOf(a.band) - order.indexOf(b.band);
});

const faqs = [
  { q: "How does pricing work?", a: "You pay for the workflow preparation — the AI-assisted analysis, document drafting, and review — then choose how you want to send it. Mailing is a separate service." },
  { q: "Is there a subscription?", a: "No. You pay per workflow — no monthly fee, no commitment." },
  { q: "What payment methods do you accept?", a: "All major credit and debit cards via Stripe." },
  { q: "Can I get a refund?", a: "If your mailing hasn't been submitted for processing yet, you can request a full refund." },
  { q: "Does the mailing price include postage?", a: "Yes. Printing, paper, envelope, and USPS postage are all included in the mailing price." },
  { q: "Why are different workflows priced differently?", a: "Some workflows involve more complex analysis — IRS notices, court summons, and high-stakes appeals require deeper evidence review than a simple records request. The preparation fee reflects the actual work performed." },
];

function PricingPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60"><div className="mx-auto max-w-4xl px-6 py-20">
          <div className="postmark w-fit">Pricing</div>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl">Pay for the work, then choose your mailing.</h1>
          <p className="mt-4 text-muted-foreground">Every workflow has a preparation fee based on its complexity. Mailing is separate — you choose how to send it.</p>
        </div></section>

        {/* Preparation fees by band */}
        <section className="border-b border-rule/60 bg-paper-deep/20"><div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-serif text-2xl mb-2">Workflow preparation</h2>
          <p className="text-muted-foreground mb-6">The preparation fee covers document analysis, response drafting, and your review before anything is sent. Different workflows have different complexity, so prices vary.</p>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {bandExamples.map((b) => (
              <div key={b.band} className="envelope-card p-5">
                <h3 className="font-serif text-lg">{b.label}</h3>
                <p className="mt-2 text-3xl font-serif">{b.price}</p>
                <p className="text-xs text-muted-foreground mt-1">{b.desc}</p>
              </div>
            ))}
          </div>
        </div></section>

        {/* Mailing services */}
        <section className="border-b border-rule/60"><div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-serif text-2xl mb-2">Mailing service</h2>
          <p className="text-muted-foreground mb-6">After your document is prepared and reviewed, choose how to send it. Every price includes printing, paper, envelope, and postage.</p>
          <div className="grid gap-5 md:grid-cols-3">
            {mailingTiers.map((t) => (
              <div key={t.type} className={`envelope-card p-6 ${t.featured ? "ring-1 ring-stamp/40" : ""}`}>
                {t.featured && <div className="postmark w-fit mb-3">Recommended</div>}
                <h3 className="font-serif text-2xl">{t.type}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
                <p className="mt-4 text-4xl font-serif">{t.price}</p>
                <p className="text-xs text-muted-foreground">per mailing</p>
                <ul className="mt-5 space-y-2">{t.features.map((f) => (<li key={f} className="flex items-center gap-2 text-sm text-ink-soft"><svg className="h-3.5 w-3.5 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{f}</li>))}</ul>
                <Link to="/workflows/irs-notice" className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5 ${t.featured ? "bg-primary text-primary-foreground shadow-stamp" : "border border-input text-foreground hover:bg-muted"}`}>Start <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg></Link>
              </div>
            ))}
          </div>
        </div></section>

        <section className="border-b border-rule/60"><div className="mx-auto max-w-2xl px-6 py-16">
          <div className="postmark w-fit">FAQ</div>
          <h2 className="mt-4 font-serif text-3xl">Pricing questions</h2>
          <div className="mt-6 divide-y divide-rule/70 border-y border-rule/70">
            {faqs.map((f) => (<details key={f.q} className="group py-5"><summary className="flex cursor-pointer items-center justify-between list-none"><span className="font-serif text-xl">{f.q}</span><span className="text-stamp transition-transform group-open:rotate-45">＋</span></summary><p className="mt-3 text-muted-foreground">{f.a}</p></details>))}
          </div>
        </div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
