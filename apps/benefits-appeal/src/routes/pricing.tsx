import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, PackageCheck, ShieldCheck, Stamp, Check, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const SITE_ORIGIN = "https://benefits-appeal.pages.dev";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Benefits Appeal" },
      { name: "description", content: "Simple per-mailing pricing. Standard $4.99, Certified $14.94, Registered $32.49. Page-count tiers available. No subscription." },
      { property: "og:title", content: "Pricing — Benefits Appeal" },
      { property: "og:description", content: "Simple per-mailing pricing. Standard $4.99, Certified $14.94, Registered $32.49. No subscription." },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN + "/pricing" }],
  }),
  component: PricingPage,
});
const tiers = [
  { type: "Standard", price: "$4.99", desc: "Standard delivery for non-urgent mail", features: ["3–7 business days", "USPS tracking included", "Professional printing & envelope", "Mailing record retained"], icon: Mail },
  { type: "Certified", price: "$14.94", desc: "Trackable delivery with confirmation", features: ["3–7 business days", "Delivery tracking + confirmation", "Proof of delivery", "Mailing record retained"], icon: PackageCheck, featured: true },
  { type: "Registered", price: "$32.49", desc: "Highest security for sensitive documents", features: ["5–10 business days", "Secure handling + tracking", "Insured delivery", "Signature required"], icon: Stamp },
];
const faqs = [
  { q: "Is there a subscription?", a: "No. You pay per mailing — no monthly fee, no commitment." },
  { q: "What payment methods do you accept?", a: "All major credit and debit cards via Stripe." },
  { q: "Can I get a refund?", a: "If your mailing hasn't been submitted for processing yet, you can request a full refund." },
  { q: "Do you offer bulk pricing?", a: "For high-volume senders, contact us about enterprise pricing." },
];
function PricingPage() {
  return (
    <main className="min-h-screen bg-paper">
      <SiteHeader />
      <section className="bg-white py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <div className="eyebrow">Simple, transparent pricing</div>
            <h1 className="mt-3 font-serif text-4xl md:text-5xl">Pay per mailing. No subscription.</h1>
            <p className="mt-4 text-muted-foreground">Every price includes printing, paper, envelope, postage, and tracking.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {tiers.map(({ type, price, desc, features, icon: Icon, featured }) => (
              <div key={type} className={`card p-6 ${featured ? "ring-2 ring-stamp" : ""}`}>
                {featured && <div className="badge badge-amber mb-3">Recommended</div>}
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50"><Icon size={24} className="text-ink" /></div>
                <h3 className="mt-4 font-serif text-lg text-ink">{type}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                <p className="mt-4 font-serif text-4xl text-ink">{price}</p>
                <p className="text-xs text-muted-foreground">per mailing</p>
                <ul className="mt-5 space-y-2">
                  {features.map((f) => (<li key={f} className="flex items-center gap-2 text-sm text-muted-foreground"><Check size={15} className="text-stamp" /> {f}</li>))}
                </ul>
                <Link to="/workflows" className={`mt-6 w-full justify-center text-center ${featured ? "btn-amber" : "btn-primary"}`}>Start <ArrowRight size={16} /></Link>
              </div>
            ))}
          </div>
          <div className="mt-12 mx-auto max-w-2xl space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-rule bg-paper-deep/30 p-6">
                <h2 className="font-serif text-lg">{faq.q}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
