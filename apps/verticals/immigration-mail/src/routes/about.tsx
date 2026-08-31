import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [
    { title: "About — Immigration Mail" },
    { name: "description", content: "Immigration Mail helps people prepare and send important immigration correspondence with confidence." },
  ],
    links: [{ rel: "canonical", href: "https://immigrationmail.com/about" }],  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
            <div className="postmark w-fit">About</div>
            <h1 className="mt-4 font-serif text-3xl sm:text-4xl md:text-5xl">Every letter deserves clarity.</h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-soft">We believe everyone deserves a clear, professional tool for preparing and mailing important immigration correspondence — without confusion, without guesswork, and without a printer.</p>
          </div>
        </section>
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="font-serif text-2xl">Our mission</h2>
            <p className="mt-4 text-muted-foreground leading-7">When you receive an immigration notice, the hardest part isn't knowing what to say. It's the logistics: identifying the issue, organizing your facts, writing a professional letter, printing it, and mailing it with proof of delivery — all before the deadline.</p>
            <p className="mt-3 text-muted-foreground leading-7">Immigration Mail was built to solve that. We provide guided workflows that walk you through every step, AI that helps organize your facts into a draft (but never invents them), and physical mail delivery with tracking and proof — all from your phone or computer.</p>
          </div>
        </section>
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="font-serif text-2xl">What we believe</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <div className="envelope-card p-5">
                <svg className="h-6 w-6 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2a5 5 0 0 1 5 5c0 1.5-.5 3-1.5 4 .5 1 1.5 1.5 1.5 3a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3c0-1.5 1-2 1.5-3-1-1-1.5-2.5-1.5-4a5 5 0 0 1 5-5z" /></svg>
                <h3 className="mt-3 font-serif text-lg">Clarity over complexity</h3>
                <p className="mt-2 text-sm text-muted-foreground">Correspondence tools should be easy to use, even for first-timers.</p>
              </div>
              <div className="envelope-card p-5">
                <svg className="h-6 w-6 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4v6c0 5-3.5 7-8 8-4.5-1-8-3-8-8V7l8-4zM9 12l2 2 4-4" /></svg>
                <h3 className="mt-3 font-serif text-lg">Your facts stay yours</h3>
                <p className="mt-2 text-sm text-muted-foreground">AI assists but never invents. You review everything before it's sent.</p>
              </div>
              <div className="envelope-card p-5">
                <svg className="h-6 w-6 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                <h3 className="mt-3 font-serif text-lg">Proof matters</h3>
                <p className="mt-2 text-sm text-muted-foreground">Immigration correspondence needs proof of delivery. We handle that.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="font-serif text-2xl">Powered by MailMyPDF</h2>
            <p className="mt-4 text-muted-foreground leading-7">Immigration Mail is a standalone product built on the MailMyPDF mailing platform, which handles printing, enveloping, USPS delivery, tracking, and proof of delivery.</p>
            <div className="mt-6 flex items-center gap-4 rounded-lg border border-rule/60 bg-paper-deep/30 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-rule bg-card">
                <svg className="h-6 w-6 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3h10l4 4v14H5V3zM9 7h6M9 11h6M9 15h4" /></svg>
              </div>
              <div><p className="font-medium text-foreground">MailMyPDF</p><p className="text-sm text-muted-foreground">The mailing infrastructure behind Immigration Mail</p></div>
            </div>
          </div>
        </section>
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20 text-center">
            <div className="postmark mx-auto w-fit">Ready to mail</div>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl">Prepare and send your letter today.</h2>
            <Link to="/workflows/respond-to-notice" className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5">Start your letter <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
