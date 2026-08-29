import { PRICES } from "@mailmypdf/pricing";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ShieldAlert, Mail, ShieldCheck, Sparkles, Clock, PackageCheck, Lock, FileUp, ChevronDown, Send, Eye, Stamp, CreditCard, FileText, TrendingUp, Quote } from "lucide-react";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dispute Mail — Dispute credit errors, debt & billing by mail" },
      { name: "description", content: "Guided workflows to prepare, review, send, and track dispute letters for credit report errors, debt validation, billing errors, and unauthorized charges. Physical mail with proof of delivery." },
      { property: "og:title", content: "Dispute Mail — Dispute credit errors, debt & billing by mail" },
      { property: "og:description", content: "Prepare, review, send, track, and keep a record of your dispute letters. Certified mail with proof of delivery." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Dispute Mail" },
      { property: "og:url", content: "https://dispute-mail.pages.dev/" },
      // TODO: Create /og-image.png (1200x630) — no OG image asset exists yet
      { property: "og:image", content: "https://dispute-mail.pages.dev/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Dispute Mail — Dispute credit errors, debt & billing by mail" },
      { name: "twitter:description", content: "Guided workflows, physical mail with tracking, and proof of delivery." },
      { name: "twitter:image", content: "https://dispute-mail.pages.dev/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://dispute-mail.pages.dev/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Dispute Mail",
          description: "Guided workflows to prepare, review, send, and track dispute letters for credit report errors, debt validation, billing errors, and unauthorized charges.",
          url: "https://dispute-mail.pages.dev",
          publisher: { "@type": "Organization", name: "MailMyPDF" },
          hasPart: [
            { "@type": "WebPage", name: "Dispute a Credit Report Error", url: "https://dispute-mail.pages.dev/workflows/credit-report" },
            { "@type": "WebPage", name: "Request Debt Validation", url: "https://dispute-mail.pages.dev/workflows/debt-validation" },
            { "@type": "WebPage", name: "Dispute a Billing Error", url: "https://dispute-mail.pages.dev/workflows/billing-error" },
            { "@type": "WebPage", name: "Dispute an Unauthorized Charge", url: "https://dispute-mail.pages.dev/workflows/unauthorized-charge" },
            { "@type": "WebPage", name: "Workflow Directory", url: "https://dispute-mail.pages.dev/workflows" },
          ],
        }),
      },
    ],
  }),
  component: HomePage,
});

const workflows = [
  { title: "Dispute a Credit Report Error", description: "Dispute inaccurate items on your credit report with Equifax, Experian, or TransUnion under the FCRA.", icon: FileText, href: "/workflows/credit-report" },
  { title: "Request Debt Validation", description: "Request validation of a debt from a collector under the FDCPA within 30 days of first contact.", icon: ShieldCheck, href: "/workflows/debt-validation" },
  { title: "Dispute a Billing Error", description: "Dispute a medical billing error, utility overcharge, or incorrect service charge with the provider.", icon: CreditCard, href: "/workflows/billing-error" },
  { title: "Dispute an Unauthorized Charge", description: "Dispute an unauthorized or fraudulent charge with your card issuer or bank in writing.", icon: ShieldAlert, href: "/workflows/unauthorized-charge" },
];

const features = [
  { icon: ShieldAlert, title: "Guided dispute workflows", desc: "Start with the error, not a blank page. Each workflow walks you through the steps from issue to mailed dispute." },
  { icon: Sparkles, title: "AI-assisted drafting", desc: "Organize your facts into a professional dispute letter. Everything is editable. The AI never invents facts or legal conclusions." },
  { icon: Send, title: "Physical mail with tracking", desc: "Your dispute is printed, enveloped, and mailed via USPS. Track delivery and keep proof of timely submission." },
  { icon: ShieldCheck, title: "Proof of delivery", desc: "Certified mail options include signature tracking and return receipt — your record that the dispute was received." },
  { icon: Clock, title: "Deadline awareness", desc: "Credit disputes have 30–45 day investigation windows. Debt validation has a 30-day response window. Don't miss yours." },
  { icon: Lock, title: "Secure & private", desc: "Your documents are encrypted, never shared, and never used for marketing or AI training. Delete your data anytime." },
];

const steps = [
  { n: "01", title: "Identify", desc: "Upload or identify the error, charge, or debt you're disputing." },
  { n: "02", title: "Prepare", desc: "State the facts, let AI organize the draft, and review every word." },
  { n: "03", title: "Send", desc: "Choose your mailing — certified with return receipt is recommended for disputes." },
  { n: "04", title: "Prove", desc: "Track delivery and keep a permanent record of your timely dispute." },
];

const stats = [
  { value: "3–5", label: "Business day delivery" },
  { value: `$${(PRICES.standard / 100).toFixed(2)}`, label: "Starting price for workflow preparation" },
  { value: "100%", label: "You control the facts" },
  { value: "0", label: "Printers needed" },
];

const testimonials = [
  { quote: "There was a collection account on my credit report that wasn't mine. Dispute Mail helped me write the dispute letter and mail it certified to all three bureaus. The account was removed within 30 days.", author: "Rachel D.", role: "Credit Report Dispute" },
  { quote: "A debt collector contacted me about a debt I didn't recognize. I used Dispute Mail to send a validation request within the 30-day window. The certified mail receipt proved I responded on time.", author: "Tony G.", role: "Debt Validation Request" },
  { quote: "My hospital bill had charges for services I never received. The guided workflow helped me organize exactly what was wrong and mail it to the billing department. They corrected it within two weeks.", author: "Maria S.", role: "Medical Billing Dispute" },
];

const comparison = [
  { feature: "Guided dispute workflows (not blank-page chat)", us: true, them: false },
  { feature: "AI never invents facts or legal conclusions", us: true, them: "varies" },
  { feature: "Physical mail with tracking", us: true, them: false },
  { feature: "Certified mail with return receipt", us: true, them: false },
  { feature: "Proof of timely submission records", us: true, them: false },
  { feature: "Dispute mailing history dashboard", us: true, them: false },
  { feature: "No printer or post office visit needed", us: true, them: "DIY" },
  { feature: "You review before anything is sent", us: true, them: "varies" },
];

const faqItems = [
  { q: "Is this legal advice?", a: "No. Dispute Mail is a correspondence tool, not a law firm. We help you prepare and send dispute documents — we do not provide legal advice, and AI never invents facts or legal conclusions." },
  { q: "What types of issues can I dispute?", a: "Credit report errors with the three bureaus, debt validation requests to collectors, medical and utility billing errors, and unauthorized charges with your card issuer or bank." },
  { q: "How does the mailing work?", a: "Your final document is printed, placed in an envelope, and mailed via USPS. You can choose first-class, certified, or certified with return receipt for proof of delivery." },
  { q: "Is my data secure?", a: "All documents are stored with encryption, never shared with third parties, and never used for marketing. You can request full deletion at any time." },
  { q: "What does it cost?", a: "You pay for the workflow preparation (starting at $14.99 for simple disputes), then choose your mailing service ($4.99 standard, $14.94 certified, $32.49 registered). No subscription required." },
];

function HomePage() {
  return (
    <main>
      <SiteHeader variant="transparent" />

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #2a2d3f 0%, #1a1d2e 60%, #0f1119 100%)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f43f5e' fill-opacity='0.12'%3E%3Cpath d='M30 12l-6 6h12l-6-6zm0 24l-6-6h12l-6 6zM12 30l6-6v12l-6-6zm36 0l-6-6v12l6-6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="container relative py-20 md:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <div className="badge badge-rose mb-5" style={{ background: "color-mix(in oklab, var(--stamp) 12%, transparent)", color: "var(--stamp)" }}>Stand your ground</div>
              <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl" style={{ fontFamily: "var(--font-serif)" }}>
                Dispute the error. Keep the proof.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">
                Prepare professional dispute letters for credit report errors, debt validation, billing issues, and unauthorized charges. Send physical mail with tracking and keep proof of timely submission.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/workflows/credit-report" className="btn-rose text-base">
                  Start a Dispute <ArrowRight size={18} />
                </Link>
                <a href="#workflows" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10">
                  See what you can dispute
                </a>
              </div>
              <p className="mt-5 text-sm text-white/50">Not a law firm. Not legal advice. You remain in control of the facts and final document.</p>
            </div>

            {/* Visual mockup */}
            <div className="relative hidden lg:block">
              <div className="card relative p-6 shadow-2xl">
                <div className="flex items-center gap-3 border-b border-warm-border pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700">
                    <ShieldAlert size={20} className="text-stamp-soft" />
                  </div>
                  <div>
                    <p className="font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>Your dispute workflow</p>
                    <p className="text-sm text-slate-400">From error to mailed dispute</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    { icon: FileUp, text: "Identify the error or charge", done: true },
                    { icon: FileText, text: "State the facts and what's wrong", done: true },
                    { icon: Sparkles, text: "Draft and edit your dispute letter", done: true },
                    { icon: Send, text: "Mail certified with return receipt", done: false },
                  ].map(({ icon: Icon, text, done }) => (
                    <div key={text} className="flex items-center gap-3 text-sm">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${done ? "bg-rose-50" : "bg-gray-100"}`}>
                        <Icon size={15} className={done ? "text-stamp" : "text-gray-400"} />
                      </div>
                      <span className={done ? "text-teal-700" : "text-slate-400"}>{text}</span>
                      {done && <CheckCircle2 size={15} className="ml-auto text-stamp" />}
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between rounded-xl bg-teal-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-teal-600">
                    <PackageCheck size={16} className="text-stamp" />
                    <span>Proof of timely submission</span>
                  </div>
                  <span className="badge badge-green">Ready</span>
                </div>
              </div>
              <div className="absolute -bottom-3 -right-3 flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-lg">
                <Stamp size={16} /> Return receipt
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-warm-border bg-white py-8">
        <div className="container grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-bold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>{value}</p>
              <p className="mt-1 text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-warm-border bg-cream py-6">
        <div className="container flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-slate-400">
          {[
            { icon: Lock, text: "Bank-grade encryption" },
            { icon: PackageCheck, text: "USPS tracking included" },
            { icon: ShieldCheck, text: "Proof of timely submission" },
            { icon: Eye, text: "You review before anything is sent" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon size={16} className="text-stamp" /> {text}
            </div>
          ))}
        </div>
      </section>

      {/* Workflows */}
      <section id="workflows" className="bg-cream py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <div className="eyebrow">Start with the error</div>
            <h2 className="mt-3 text-3xl font-bold text-teal-700 md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>What are you disputing?</h2>
            <p className="mt-4 text-slate-400">Choose a guided starting point. Dispute Mail is designed around dispute correspondence, not generic AI chat.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map(({ title, description, icon: Icon, href }) => (
              <Link key={title} to={href} className="card group p-6 transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
                  <Icon size={24} className="text-teal-700" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-rose-600">
                  Start workflow <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="bg-white py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl">
            <div className="eyebrow">The process</div>
            <h2 className="mt-3 text-3xl font-bold text-teal-700 md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>How Dispute Mail works</h2>
            <p className="mt-4 text-slate-400">From error to mailed dispute in four clear steps. Nothing is sent until you review and approve it.</p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {steps.map(({ n, title, desc }, i) => (
              <div key={n} className="relative">
                {i < steps.length - 1 && (
                  <div className="absolute left-[2.2rem] top-12 hidden h-px w-[calc(100%-2rem)] bg-gradient-to-r from-warm-border to-transparent md:block" />
                )}
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700 text-white">
                  <span className="text-sm font-bold">{n}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-cream py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl">
            <div className="eyebrow">Why Dispute Mail</div>
            <h2 className="mt-3 text-3xl font-bold text-teal-700 md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>Built for dispute deadlines</h2>
            <p className="mt-4 text-slate-400">Everything you need to prepare, send, and prove your dispute — in one place.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-50">
                  <Icon size={22} className="text-stamp" />
                </div>
                <h3 className="mt-4 font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="bg-white py-16 md:py-24">
        <div className="container max-w-3xl">
          <div className="text-center">
            <div className="eyebrow">The difference</div>
            <h2 className="mt-3 text-3xl font-bold text-teal-700 md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>Dispute Mail vs. doing it yourself</h2>
          </div>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full text-sm border border-warm-border rounded-xl overflow-hidden">
              <thead className="bg-teal-700 text-white">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">Feature</th>
                  <th className="px-5 py-4 text-center font-semibold" style={{ fontFamily: "var(--font-serif)" }}>Dispute Mail</th>
                  <th className="px-5 py-4 text-center font-semibold">DIY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border">
                {comparison.map(({ feature, us, them }) => (
                  <tr key={feature} className="hover:bg-cream/50">
                    <td className="px-5 py-3.5 text-slate-500 font-medium">{feature}</td>
                    <td className="px-5 py-3.5 text-center">
                      {us === true ? <CheckCircle2 size={18} className="mx-auto text-stamp" /> : <span className="text-slate-400">{us}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {them === false ? <span className="text-slate-300">—</span> : <span className="text-slate-400">{them}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-cream py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <div className="eyebrow">What people say</div>
            <h2 className="mt-3 text-3xl font-bold text-teal-700 md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>Real disputes, real outcomes</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.author} className="card p-6">
                <Quote size={24} className="text-rose-200" />
                <p className="mt-3 text-sm leading-7 text-slate-500">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-500" style={{ fontFamily: "var(--font-serif)" }}>
                    {t.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-teal-700">{t.author}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="bg-white py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <div className="eyebrow">Simple pricing</div>
            <h2 className="mt-3 text-3xl font-bold text-teal-700 md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>Pay per mailing. No subscription.</h2>
            <p className="mt-4 text-slate-400">Prices include printing, paper, envelope, and postage.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-4">
            {[
              { type: "Standard", price: `$${(PRICES.standard / 100).toFixed(2)}`, desc: "3–7 business days, tracking included", icon: Mail },
              { type: "Certified", price: `$${(PRICES.certified / 100).toFixed(2)}`, desc: "Delivery tracking + confirmation", icon: PackageCheck },
              { type: "Registered", price: `$${(PRICES.registered / 100).toFixed(2)}`, desc: "Secure handling + tracking, insured", icon: Stamp, featured: true },
            ].map(({ type, price, desc, icon: Icon, featured }) => (
              <div key={type} className={`card p-6 text-center ${featured ? "ring-2 ring-rose-400" : ""}`}>
                {featured && <div className="badge badge-rose mb-3">Most popular</div>}
                <Icon size={28} className="mx-auto text-teal-700" />
                <h3 className="mt-4 font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>{type}</h3>
                <p className="mt-2 text-3xl font-bold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>{price}</p>
                <p className="mt-2 text-xs text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/pricing" className="btn-outline">See full pricing <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section id="trust" className="bg-cream py-16 md:py-20">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="card p-6">
              <Lock size={24} className="text-stamp" />
              <h2 className="mt-4 text-lg font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>Your facts stay yours</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">AI assists with organization and drafting. It will never invent facts or legal conclusions. Your documents are encrypted and never shared.</p>
            </div>
            <div className="card p-6">
              <Clock size={24} className="text-stamp" />
              <h2 className="mt-4 text-lg font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>Deadlines matter</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Credit disputes have 30–45 day investigation windows. Debt validation has a 30-day response window. Certified mail with return receipt proves you submitted on time.</p>
            </div>
            <div className="card p-6">
              <ShieldAlert size={24} className="text-stamp" />
              <h2 className="mt-4 text-lg font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>Know what we're not</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Dispute Mail is not a law firm and does not provide legal advice. If your dispute involves complex legal questions, consult a qualified attorney.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section id="faq" className="bg-white py-16 md:py-24">
        <div className="container max-w-3xl">
          <div className="text-center">
            <div className="eyebrow">Questions</div>
            <h2 className="mt-3 text-3xl font-bold text-teal-700 md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>Frequently asked</h2>
          </div>
          <div className="mt-10 space-y-3">
            {faqItems.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/faq" className="btn-outline">See all questions <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "linear-gradient(135deg, #2a2d3f 0%, #1a1d2e 100%)" }} className="py-16 md:py-20">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>Ready to dispute?</h2>
          <p className="mx-auto mt-4 max-w-lg text-white/60">Start a guided workflow, review your draft, and mail it — all in one place.</p>
          <Link to="/workflows/credit-report" className="btn-rose mt-8 text-base">Start now <ArrowRight size={18} /></Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button className="flex w-full items-center justify-between p-5 text-left" onClick={() => setOpen(!open)}>
        <span className="font-semibold text-teal-700">{q}</span>
        <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-5 text-sm leading-6 text-slate-400">{a}</div>}
    </div>
  );
}
