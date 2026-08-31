import { createFileRoute, Link } from "@tanstack/react-router";
import { Stamp, Sparkles, Mail, ShieldCheck, ArrowRight, FileCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Appeal Mail" },
      { name: "description", content: "Appeal Mail helps people prepare and send appeals for denied claims and decisions with guided workflows, AI-assisted drafting, and physical mail with tracking." },
      { property: "og:title", content: "About — Appeal Mail" },
      { property: "og:description", content: "Appeal Mail helps people prepare and send appeals for denied claims and decisions with guided workflows, AI-assisted drafting, and physical mail with tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "About — Appeal Mail" },
      { name: "twitter:description", content: "Appeal Mail helps people prepare and send appeals for denied claims and decisions with guided workflows, AI-assisted drafting, and physical mail with tracking." },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});
function AboutPage() {
  return (
    <main className="min-h-screen bg-cream"><SiteHeader />
      <section style={{ background: "linear-gradient(135deg, var(--ink) 0%, color-mix(in oklab, var(--ink) 85%, var(--paper-deep)) 100%)" }} className="py-16 md:py-24">
        <div className="container max-w-2xl text-center">
          <div className="badge badge-amber mb-4" >About Appeal Mail</div>
          <h1 className="text-4xl font-bold text-white md:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>Every denial deserves a response.</h1>
          <p className="mt-5 text-lg leading-8 text-white/60">We believe everyone deserves a clear, professional tool for appealing denied claims and decisions — without confusion, without guesswork, and without a printer.</p>
        </div>
      </section>
      <section className="py-16 md:py-20"><div className="container max-w-3xl">
        <h2 className="text-2xl font-bold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>Our mission</h2>
        <p className="mt-4 text-sm leading-7 text-slate-400">When a claim is denied or a decision goes against you, the hardest part isn't knowing what to say. It's the logistics: understanding the denial, organizing your response, writing a professional letter, printing it, and mailing it with proof of timely filing — all before the deadline expires.</p>
        <p className="mt-3 text-sm leading-7 text-slate-400">Appeal Mail was built to solve that. We provide guided workflows that walk you through every step, AI that helps organize your facts into a draft (but never invents them), and physical mail delivery with tracking and proof — all from your phone or computer.</p>
      </div></section>
      <section className="bg-white py-16"><div className="container max-w-3xl">
        <h2 className="text-2xl font-bold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>What we believe</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="card p-5"><Sparkles size={22} className="text-amber-500" /><h3 className="mt-3 font-semibold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>Clarity over complexity</h3><p className="mt-2 text-sm text-slate-400">Appeal tools should be easy to use, even for first-timers.</p></div>
          <div className="card p-5"><ShieldCheck size={22} className="text-amber-500" /><h3 className="mt-3 font-semibold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>Your facts stay yours</h3><p className="mt-2 text-sm text-slate-400">AI assists but never invents. You review everything before it's sent.</p></div>
          <div className="card p-5"><Mail size={22} className="text-amber-500" /><h3 className="mt-3 font-semibold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>Proof matters</h3><p className="mt-2 text-sm text-slate-400">Some appeals need physical mail with proof of timely filing. We handle that.</p></div>
        </div>
      </div></section>
      <section className="py-16"><div className="container max-w-3xl">
        <h2 className="text-2xl font-bold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>Powered by MailMyPDF</h2>
        <p className="mt-4 text-sm leading-7 text-slate-400">Appeal Mail is a standalone product built on the MailMyPDF mailing platform, which handles printing, enveloping, USPS delivery, tracking, and proof of delivery.</p>
        <div className="mt-6 flex items-center gap-4 rounded-xl border border-warm-border bg-white p-5"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50"><FileCheck size={22} className="text-indigo-700" /></div><div><p className="font-semibold text-indigo-700">MailMyPDF</p><p className="text-sm text-slate-400">The mailing infrastructure behind Appeal Mail</p></div></div>
      </div></section>
      <section style={{ background: "linear-gradient(135deg, var(--ink) 0%, color-mix(in oklab, var(--ink) 85%, var(--paper-deep)) 100%)" }} className="py-16"><div className="container text-center"><h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>Ready to appeal?</h2><p className="mx-auto mt-3 max-w-md text-white/60">Prepare and send your appeal today.</p><Link to="/workflows/denied-claim" className="btn-amber mt-6 text-base">Start now <ArrowRight size={18} /></Link></div></section>
      <SiteFooter />
    </main>
  );
}
