import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — Notice Respond" }, { name: "description", content: "Get in touch with the Notice Respond team." }] }),
  component: ContactPage,
});

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60"><div className="mx-auto max-w-2xl px-6 py-16">
          <div className="postmark w-fit">Contact</div>
          <h1 className="mt-4 font-serif text-4xl">Get in touch</h1>
          <p className="mt-4 text-muted-foreground">Questions, feedback, or need help? We'd love to hear from you.</p>
        </div></section>
        <section className="border-b border-rule/60"><div className="mx-auto max-w-4xl px-6 py-12">
          <div className="grid gap-8 md:grid-cols-[1fr_1.5fr]">
            <div>
              <div className="envelope-card p-5"><svg className="h-5 w-5 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" /></svg><h2 className="mt-3 font-serif text-lg">Email us</h2><p className="mt-1 text-sm text-muted-foreground">For general questions and support:</p><p className="mt-2 font-medium text-foreground">support@noticerespond.app</p></div>
              <div className="mt-4 envelope-card p-5"><svg className="h-5 w-5 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" /></svg><h2 className="mt-3 font-serif text-lg">Response time</h2><p className="mt-1 text-sm text-muted-foreground">Typically within 1–2 business days.</p></div>
              <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-xs text-muted-foreground"><strong>Legal questions:</strong> Notice Respond is not a law firm and cannot provide legal advice.</div>
            </div>
            <div className="envelope-card p-6 md:p-8">
              {submitted ? (
                <div className="py-10 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stamp/10"><svg className="h-8 w-8 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>
                  <h2 className="mt-5 font-serif text-2xl">Message sent!</h2>
                  <p className="mt-3 text-sm text-muted-foreground">Thanks, {form.name || "there"}. We'll get back to you within 1–2 business days.</p>
                  <Link to="/" className="mt-6 inline-flex items-center rounded-full border border-input px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted">Back to home</Link>
                </div>
              ) : (
                <>
                  <h2 className="font-serif text-xl">Send a message</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Fill out the form and we'll get back to you.</p>
                  <div className="mt-6 space-y-4">
                    <div><label className="input-label">Name</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></div>
                    <div><label className="input-label">Email</label><input className="input-field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></div>
                    <div><label className="input-label">Subject</label><select className="input-field" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}><option value="">Select a topic...</option><option value="support">Support question</option><option value="billing">Billing or refund</option><option value="feedback">Product feedback</option><option value="other">Other</option></select></div>
                    <div><label className="input-label">Message</label><textarea className="input-field min-h-32" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How can we help?" /></div>
                    <button onClick={() => form.email.trim() && form.message.trim() && setSubmitted(true)} disabled={!form.email.trim() || !form.message.trim()} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5 disabled:opacity-30 disabled:transform-none disabled:shadow-none">Send message →</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
