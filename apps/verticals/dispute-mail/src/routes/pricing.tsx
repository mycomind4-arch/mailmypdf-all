import { PRICES } from "@mailmypdf/pricing";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, PackageCheck, ShieldCheck, Stamp, Check, ArrowRight, Clock, Shield } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [
    { title: "Pricing — Dispute Mail" },
    { name: "description", content: "Simple per-mailing pricing. Standard $4.99, Certified $14.94, Registered $32.49. Page-count tiers available. No subscription." },
  ] }),
  component: PricingPage,
});
const tiers = [
  { type: "Standard", price: `${(PRICES.standard / 100).toFixed(2)}`, desc: "Standard delivery for non-urgent mail", features: ["3–7 business days", "USPS tracking included", "Professional printing & envelope", "Mailing record retained"], icon: Mail },
  { type: "Certified", price: `${(PRICES.certified / 100).toFixed(2)}`, desc: "Trackable delivery with confirmation", features: ["3–7 business days", "Delivery tracking + confirmation", "Proof of delivery", "Mailing record retained"], icon: PackageCheck, featured: true },
  { type: "Registered", price: `${(PRICES.registered / 100).toFixed(2)}`, desc: "Highest security for sensitive documents", features: ["5–10 business days", "Secure handling + tracking", "Insured delivery", "Signature required"], icon: Stamp },
];
const faqs = [
  { q: "Is there a subscription?", a: "No. You pay per mailing — no monthly fee, no commitment." },
  { q: "What payment methods do you accept?", a: "All major credit and debit cards via Stripe." },
  { q: "Can I get a refund?", a: "If your mailing hasn't been submitted for processing yet, you can request a full refund." },
  { q: "Do you offer bulk pricing?", a: "For high-volume senders, contact us about enterprise pricing." },
];
function PricingPage() {
  return (
    <main className="min-h-screen bg-cream"><SiteHeader />
      <section className="bg-white py-16 md:py-20"><div className="container">
        <div className="mx-auto max-w-2xl text-center"><div className="eyebrow">Simple, transparent pricing</div>
        <h1 className="mt-3 text-4xl font-bold text-teal-700 md:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>Pay per mailing. No subscription.</h1>
        <p className="mt-4 text-slate-400">Every price includes printing, paper, envelope, postage, and tracking.</p></div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{tiers.map(({ type, price, desc, features, icon: Icon, featured }) => (
          <div key={type} className={`card p-6 ${featured ? "ring-2 ring-rose-400" : ""}`}>
            {featured && <div className="badge badge-rose mb-3">Recommended</div>}
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50"><Icon size={24} className="text-teal-700" /></div>
            <h3 className="mt-4 text-lg font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>{type}</h3>
            <p className="mt-1 text-sm text-slate-400">{desc}</p>
            <p className="mt-4 text-4xl font-bold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>{price}</p>
            <p className="text-xs text-slate-300">per mailing</p>
            <ul className="mt-5 space-y-2">{features.map((f) => (<li key={f} className="flex items-center gap-2 text-sm text-slate-500"><Check size={15} className="text-rose-500" /> {f}</li>))}</ul>
            <Link to="/workflows/credit-report" className={`mt-6 w-full justify-center text-center ${featured ? "btn-rose" : "btn-primary"}`}>Start <ArrowRight size={16} /></Link>
          </div>))}</div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-400">
          <span className="flex items-center gap-2"><Clock size={16} className="text-rose-500" /> 3–5 business days</span>
          <span className="flex items-center gap-2"><Shield size={16} className="text-rose-500" /> Bank-grade encryption</span>
          <span className="flex items-center gap-2"><Check size={16} className="text-rose-500" /> Mailing record retained</span>
        </div>
      </div></section>
      <section className="bg-cream py-16"><div className="container max-w-2xl">
        <h2 className="text-2xl font-bold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>Pricing questions</h2>
        <div className="mt-6 space-y-3">{faqs.map(({ q, a }) => (<div key={q} className="card p-5"><h3 className="font-semibold text-teal-700">{q}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{a}</p></div>))}</div>
      </div></section>
      <SiteFooter />
    </main>
  );
}
