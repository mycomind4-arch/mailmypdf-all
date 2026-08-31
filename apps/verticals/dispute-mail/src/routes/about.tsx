import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, Sparkles, Mail, ShieldCheck, ArrowRight, FileCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const Route = createFileRoute("/about")({
  head: () => ({ meta: [
    { title: "About — Dispute Mail" },
    { name: "description", content: "Dispute Mail helps people prepare and send dispute letters for credit errors, debt validation, and billing issues." },
  ] }),
  component: AboutPage,
});
function AboutPage() {
  return (
    <main className="min-h-screen bg-cream"><SiteHeader />
      <section style={{ background: "linear-gradient(135deg, #2a2d3f 0%, #1a1d2e 100%)" }} className="py-16 md:py-24">
        <div className="container max-w-2xl text-center">
          <div className="badge badge-rose mb-4" style={{ background: "color-mix(in oklab, var(--stamp) 12%, transparent)", color: "var(--stamp)" }}>About Dispute Mail</div>
          <h1 className="text-4xl font-bold text-white md:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>Every error deserves a response.</h1>
          <p className="mt-5 text-lg leading-8 text-white/60">We believe everyone deserves a clear, professional tool for disputing credit errors, debt collections, and billing issues — without confusion, without guesswork, and without a printer.</p>
        </div>
      </section>
      <section className="py-16 md:py-20"><div className="container max-w-3xl">
        <h2 className="text-2xl font-bold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>Our mission</h2>
        <p className="mt-4 text-sm leading-7 text-slate-400">When there's an error on your credit report, a debt you don't recognize, or a bill with wrong charges, the hardest part isn't knowing what to say. It's the logistics: identifying the issue, organizing your facts, writing a professional letter, printing it, and mailing it with proof of delivery — all before the deadline.</p>
        <p className="mt-3 text-sm leading-7 text-slate-400">Dispute Mail was built to solve that. We provide guided workflows that walk you through every step, AI that helps organize your facts into a draft (but never invents them), and physical mail delivery with tracking and proof — all from your phone or computer.</p>
      </div></section>
      <section className="bg-white py-16"><div className="container max-w-3xl">
        <h2 className="text-2xl font-bold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>What we believe</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="card p-5"><Sparkles size={22} className="text-rose-500" /><h3 className="mt-3 font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>Clarity over complexity</h3><p className="mt-2 text-sm text-slate-400">Dispute tools should be easy to use, even for first-timers.</p></div>
          <div className="card p-5"><ShieldCheck size={22} className="text-rose-500" /><h3 className="mt-3 font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>Your facts stay yours</h3><p className="mt-2 text-sm text-slate-400">AI assists but never invents. You review everything before it's sent.</p></div>
          <div className="card p-5"><Mail size={22} className="text-rose-500" /><h3 className="mt-3 font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>Proof matters</h3><p className="mt-2 text-sm text-slate-400">Some disputes need physical mail with proof of delivery. We handle that.</p></div>
        </div>
      </div></section>
      <section className="py-16"><div className="container max-w-3xl">
        <h2 className="text-2xl font-bold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>Powered by MailMyPDF</h2>
        <p className="mt-4 text-sm leading-7 text-slate-400">Dispute Mail is a standalone product built on the MailMyPDF mailing platform, which handles printing, enveloping, USPS delivery, tracking, and proof of delivery.</p>
        <div className="mt-6 flex items-center gap-4 rounded-xl border border-warm-border bg-white p-5"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50"><FileCheck size={22} className="text-teal-700" /></div><div><p className="font-semibold text-teal-700">MailMyPDF</p><p className="text-sm text-slate-400">The mailing infrastructure behind Dispute Mail</p></div></div>
      </div></section>
      <section style={{ background: "linear-gradient(135deg, #2a2d3f 0%, #1a1d2e 100%)" }} className="py-16"><div className="container text-center"><h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>Ready to dispute?</h2><p className="mx-auto mt-3 max-w-md text-white/60">Prepare and send your dispute today.</p><Link to="/workflows/credit-report" className="btn-rose mt-6 text-base">Start now <ArrowRight size={18} /></Link></div></section>
      <SiteFooter />
    </main>
  );
}
