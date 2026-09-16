import { PRICES } from "@mailmypdf/pricing";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldAlert, Mail, ShieldCheck, Sparkles, Clock, PackageCheck, Lock, Send, Eye, Stamp, CreditCard, FileText, ChevronDown } from "lucide-react";
import { createElement, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createTrustStrip, createVerticalHero } from "../../../../../packages/design-system/src/index";

const SITE_ORIGIN = "https://dispute-mail.pages.dev";
const VerticalHero = createVerticalHero(createElement);
const SharedTrustStrip = createTrustStrip(createElement);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dispute Mail — Handle disputes with confidence" },
      { name: "description", content: "Guided workflows to prepare, review, send, and track dispute letters for credit report errors, debt validation, billing errors, and unauthorized charges." },
      { property: "og:title", content: "Dispute Mail — Handle disputes with confidence" },
      { property: "og:description", content: "Prepare, review, send, track, and keep a record of dispute correspondence with MailMyPDF." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Dispute Mail" },
      { property: "og:url", content: SITE_ORIGIN + "/" },
      { property: "og:image", content: SITE_ORIGIN + "/ecosystem-hero-sprite.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: SITE_ORIGIN + "/ecosystem-hero-sprite.jpg" },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN + "/" }],
  }),
  component: HomePage,
});

const workflows = [
  { title: "Dispute a Credit Report Error", description: "Prepare a focused written dispute for inaccurate credit-report information.", icon: FileText, href: "/workflows/credit-report" },
  { title: "Request Debt Validation", description: "Organize the collector's information and prepare a written validation request.", icon: ShieldCheck, href: "/workflows/debt-validation" },
  { title: "Dispute a Billing Error", description: "Document a medical, utility, or service billing problem and prepare the dispute.", icon: CreditCard, href: "/workflows/billing-error" },
  { title: "Dispute an Unauthorized Charge", description: "Organize the facts behind an unauthorized charge and prepare correspondence for the issuer or bank.", icon: ShieldAlert, href: "/workflows/unauthorized-charge" },
];

const steps = [
  ["01", "Identify", "Choose the error, charge, debt, or billing issue you're disputing."],
  ["02", "Prepare", "State the facts, organize supporting material, and build a reviewable draft."],
  ["03", "Approve", "Review the exact correspondence and approve what may move forward."],
  ["04", "Send & prove", "Choose mailing, track it when available, and keep the record together."],
] as const;

const features = [
  [ShieldAlert, "Guided dispute workflows", "Start with the problem instead of a blank page."],
  [Sparkles, "AI-assisted drafting", "Organize supplied facts into an editable, reviewable draft."],
  [Eye, "Human approval", "Nothing is mailed until you review the exact correspondence."],
  [Send, "Optional physical mailing", "Choose a MailMyPDF mailing service after approval."],
  [PackageCheck, "Tracking & proof options", "Available services can provide tracking and delivery evidence."],
  [Lock, "Account-scoped workflow", "Protected intake, drafts, and mailing records stay tied to your account context."],
] as const;

const mailingPlans = [
  { type: "Standard", cents: PRICES.standard, icon: Mail, description: "Standard mailing service" },
  { type: "Certified", cents: PRICES.certified, icon: PackageCheck, description: "Delivery tracking and confirmation options" },
  { type: "Registered", cents: PRICES.registered, icon: Stamp, description: "Higher-assurance handling and tracking" },
] as const;

const faqItems = [
  ["Is this legal advice?", "No. Dispute Mail is a correspondence tool, not a law firm. It helps prepare and send dispute documents and does not provide legal advice."],
  ["What types of issues can I dispute?", "Current workflows cover credit report errors, debt validation requests, billing errors, and unauthorized charges. Browse the workflow directory for the current catalog."],
  ["How does mailing work?", "After you approve the final correspondence, choose a MailMyPDF mailing service. Tracking and proof options depend on the selected service."],
  ["How are my documents handled?", "Protected workflow access is tied to your MailMyPDF account and workflow context. Review the platform Security & Trust and privacy controls for current handling and retention details."],
  ["What does it cost?", `Standard mailing starts at $${(PRICES.standard / 100).toFixed(2)}. Certified and Registered options are priced separately. Workflow preparation pricing is shown for the selected workflow before purchase.`],
] as const;

function HomePage() {
  return (
    <main>
      <SiteHeader />
      <VerticalHero
        theme="dispute-mail"
        tone="dark"
        eyebrow="Dispute. Document. Resolve."
        title="Handle disputes with confidence."
        description="Prepare professional dispute correspondence for credit report errors, debt validation, billing issues, and unauthorized charges. Organize the facts, review the draft, and choose optional mailing with tracking and proof."
        imageSrc="/ecosystem-hero-sprite.jpg"
        imageAlt="Premium pen over financial and dispute documents"
        imageBackgroundSize="200% 300%"
        imageBackgroundPosition="100% 50%"
        actions={<><Link to="/workflows/credit-report" className="btn-rose text-base">Start a Dispute <ArrowRight size={18} /></Link><Link to="/workflows" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/5 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10">Find Your Dispute</Link></>}
        meta={<><span>Not a law firm</span><span>Review before mailing</span><span>MailMyPDF fulfillment</span></>}
      />

      <SharedTrustStrip items={[
        { icon: <FileText size={16} />, title: "No printer required", description: "Prepare and mail online" },
        { icon: <ShieldAlert size={16} />, title: "Guided dispute workflow", description: "Built around the issue you're disputing" },
        { icon: <Eye size={16} />, title: "You approve before mailing", description: "Review the exact correspondence first" },
        { icon: <Mail size={16} />, title: "Tracking & proof available", description: "Keep the mailing record together" },
      ]} />

      <section className="bg-white py-8"><div className="container grid grid-cols-2 gap-6 md:grid-cols-4">{[
        [`$${(PRICES.standard / 100).toFixed(2)}`, "Standard mailing"],
        [String(workflows.length), "Featured workflows"],
        ["100%", "You control the facts"],
        ["0", "Printers needed"],
      ].map(([value,label]) => <div key={label} className="text-center"><p className="text-3xl font-bold text-teal-700" style={{fontFamily:"var(--font-serif)"}}>{value}</p><p className="mt-1 text-xs text-slate-400">{label}</p></div>)}</div></section>

      <section id="workflows" className="bg-cream py-16 md:py-24"><div className="container"><div className="mx-auto max-w-2xl"><div className="eyebrow">Featured workflows</div><h2 className="mt-3 text-3xl font-bold text-teal-700 md:text-4xl" style={{fontFamily:"var(--font-serif)"}}>Start with the dispute you actually have</h2><p className="mt-4 text-slate-400">Each workflow focuses intake, evidence, drafting, review, and mailing around one dispute type.</p></div><div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{workflows.map(({title,description,icon:Icon,href}) => <Link key={title} to={href} className="card group flex flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-50"><Icon size={22} className="text-stamp"/></div><h3 className="mt-5 text-lg font-semibold text-teal-700" style={{fontFamily:"var(--font-serif)"}}>{title}</h3><p className="mt-3 flex-1 text-sm leading-6 text-slate-400">{description}</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-rose-600">Start workflow <ArrowRight size={16}/></span></Link>)}</div></div></section>

      <section id="how" className="bg-white py-16 md:py-24"><div className="container"><div className="mx-auto max-w-2xl"><div className="eyebrow">The process</div><h2 className="mt-3 text-3xl font-bold text-teal-700 md:text-4xl" style={{fontFamily:"var(--font-serif)"}}>How Dispute Mail works</h2><p className="mt-4 text-slate-400">From issue to approved correspondence in four clear steps.</p></div><div className="mt-12 grid gap-8 md:grid-cols-4">{steps.map(([n,title,desc]) => <div key={n}><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700 text-white"><span className="text-sm font-bold">{n}</span></div><h3 className="mt-4 text-lg font-semibold text-teal-700" style={{fontFamily:"var(--font-serif)"}}>{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p></div>)}</div></div></section>

      <section className="bg-cream py-16 md:py-24"><div className="container"><div className="mx-auto max-w-2xl"><div className="eyebrow">Why Dispute Mail</div><h2 className="mt-3 text-3xl font-bold text-teal-700 md:text-4xl" style={{fontFamily:"var(--font-serif)"}}>Built for documented disputes</h2><p className="mt-4 text-slate-400">Keep preparation, approval, mailing, and the resulting record in one workflow.</p></div><div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{features.map(([Icon,title,desc]) => <div key={title} className="card p-6"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-50"><Icon size={22} className="text-stamp"/></div><h3 className="mt-4 font-semibold text-teal-700" style={{fontFamily:"var(--font-serif)"}}>{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p></div>)}</div></div></section>

      <section id="pricing" className="bg-white py-16 md:py-24"><div className="container"><div className="mx-auto max-w-2xl text-center"><div className="eyebrow">Mailing pricing</div><h2 className="mt-3 text-3xl font-bold text-teal-700 md:text-4xl" style={{fontFamily:"var(--font-serif)"}}>Choose the mailing service that fits the matter</h2><p className="mt-4 text-slate-400">Workflow preparation is priced separately where applicable.</p></div><div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-3">{mailingPlans.map(({type,cents,icon:Icon,description}) => <div key={type} className="card p-6 text-center"><Icon size={28} className="mx-auto text-teal-700"/><h3 className="mt-4 font-semibold text-teal-700" style={{fontFamily:"var(--font-serif)"}}>{type}</h3><p className="mt-2 text-3xl font-bold text-teal-700" style={{fontFamily:"var(--font-serif)"}}>${(cents/100).toFixed(2)}</p><p className="mt-2 text-xs text-slate-400">{description}</p></div>)}</div><div className="mt-8 text-center"><Link to="/pricing" className="btn-outline">See full pricing <ArrowRight size={16}/></Link></div></div></section>

      <section className="bg-cream py-16 md:py-20"><div className="container grid gap-8 md:grid-cols-3"><div className="card p-6"><Lock size={24} className="text-stamp"/><h2 className="mt-4 text-lg font-semibold text-teal-700">Your facts stay under your control</h2><p className="mt-2 text-sm leading-6 text-slate-400">AI can assist with organization and drafting, but the final correspondence requires your review.</p></div><div className="card p-6"><Clock size={24} className="text-stamp"/><h2 className="mt-4 text-lg font-semibold text-teal-700">Dates are surfaced for review</h2><p className="mt-2 text-sm leading-6 text-slate-400">Verify any deadline against the underlying notice, account records, or correspondence before relying on it.</p></div><div className="card p-6"><ShieldAlert size={24} className="text-stamp"/><h2 className="mt-4 text-lg font-semibold text-teal-700">Know what we're not</h2><p className="mt-2 text-sm leading-6 text-slate-400">Dispute Mail is not a law firm and does not provide legal advice.</p></div></div></section>

      <section id="faq" className="bg-white py-16 md:py-24"><div className="container max-w-3xl"><div className="text-center"><div className="eyebrow">Questions</div><h2 className="mt-3 text-3xl font-bold text-teal-700 md:text-4xl" style={{fontFamily:"var(--font-serif)"}}>Frequently asked</h2></div><div className="mt-10 space-y-3">{faqItems.map(([q,a]) => <FAQItem key={q} q={q} a={a}/>)}</div></div></section>

      <section style={{background:"linear-gradient(135deg,#2a2d3f 0%,#1a1d2e 100%)"}} className="py-16 md:py-20"><div className="container text-center"><h2 className="text-3xl font-bold text-white md:text-4xl" style={{fontFamily:"var(--font-serif)"}}>Ready to document the dispute?</h2><p className="mx-auto mt-4 max-w-lg text-white/60">Start the workflow, review the exact correspondence, and choose mailing when you're ready.</p><Link to="/workflows/credit-report" className="btn-rose mt-8 text-base">Start a Dispute <ArrowRight size={18}/></Link></div></section>
      <SiteFooter />
    </main>
  );
}

function FAQItem({q,a}:{q:string;a:string}) {
  const [open,setOpen]=useState(false);
  return <div className="card overflow-hidden"><button className="flex w-full items-center justify-between p-5 text-left" onClick={()=>setOpen(!open)}><span className="font-semibold text-teal-700">{q}</span><ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${open?"rotate-180":""}`}/></button>{open&&<div className="px-5 pb-5 text-sm leading-6 text-slate-400">{a}</div>}</div>;
}
