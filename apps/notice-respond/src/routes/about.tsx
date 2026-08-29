import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About — Notice Respond" }, { name: "description", content: "Notice Respond helps people respond to government notices with confidence." }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60"><div className="mx-auto max-w-4xl px-6 py-20">
          <div className="postmark w-fit">About</div>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl">Every notice deserves a response.</h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-soft">When you receive a government notice, the hardest part isn't knowing what to say. It's the logistics: understanding the deadline, organizing your facts, writing a professional response, printing it, and mailing it with proof of delivery — all before time runs out.</p>
        </div></section>
        <section className="border-b border-rule/60"><div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="font-serif text-2xl">Our mission</h2>
          <p className="mt-4 text-muted-foreground leading-7">Notice Respond was built to solve that. We provide guided workflows that walk you through every step — from understanding the notice to mailing a professional response with tracking and proof — all from your phone or computer.</p>
        </div></section>
        <section className="border-b border-rule/60 bg-paper-deep/20"><div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="font-serif text-2xl">What we believe</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <div className="envelope-card p-5"><svg className="h-6 w-6 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M5 3h14v18l-7-3-7 3V3z" /></svg><h3 className="mt-3 font-serif text-lg">Clarity over complexity</h3><p className="mt-2 text-sm text-muted-foreground">Responding to notices should be straightforward, even for first-timers.</p></div>
            <div className="envelope-card p-5"><svg className="h-6 w-6 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4v6c0 5-3.5 7-8 8-4.5-1-8-3-8-8V7l8-4zM9 12l2 2 4-4" /></svg><h3 className="mt-3 font-serif text-lg">Your facts stay yours</h3><p className="mt-2 text-sm text-muted-foreground">AI assists but never invents. You review everything before it's sent.</p></div>
            <div className="envelope-card p-5"><svg className="h-6 w-6 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg><h3 className="mt-3 font-serif text-lg">Proof matters</h3><p className="mt-2 text-sm text-muted-foreground">Notice responses need proof of timely mailing. We handle that.</p></div>
          </div>
        </div></section>
        <section className="border-b border-rule/60"><div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="font-serif text-2xl">Powered by MailMyPDF</h2>
          <p className="mt-4 text-muted-foreground leading-7">Notice Respond is a standalone product built on the MailMyPDF mailing platform, which handles printing, enveloping, USPS delivery, tracking, and proof of delivery.</p>
          <div className="mt-6 flex items-center gap-4 rounded-lg border border-rule/60 bg-paper-deep/30 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-rule bg-card"><svg className="h-6 w-6 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3h10l4 4v14H5V3zM9 7h6M9 11h6M9 15h4" /></svg></div>
            <div><p className="font-medium text-foreground">MailMyPDF</p><p className="text-sm text-muted-foreground">The mailing infrastructure behind Notice Respond</p></div>
          </div>
        </div></section>
        <section className="border-b border-rule/60"><div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <div className="postmark mx-auto w-fit">Ready to respond</div>
          <h2 className="mt-4 font-serif text-4xl">Prepare and send your response today.</h2>
          <Link to="/workflows/irs-notice" className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5">Respond to a notice <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg></Link>
        </div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
