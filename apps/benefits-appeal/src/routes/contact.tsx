import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageSquare, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Benefits Appeal" },
      { name: "description", content: "Get in touch with the Benefits Appeal team." },
      { property: "og:title", content: "Contact — Benefits Appeal" },
      { property: "og:description", content: "Get in touch with the Benefits Appeal team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Contact — Benefits Appeal" },
      { name: "twitter:description", content: "Get in touch with the Benefits Appeal team." },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});
function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  return (
    <main className="min-h-screen bg-cream"><SiteHeader />
      <section className="bg-white py-16 md:py-20 border-b border-warm-border"><div className="container max-w-2xl">
        <div className="eyebrow">Contact</div>
        <h1 className="mt-3 text-4xl font-bold text-indigo-700 md:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>Get in touch</h1>
        <p className="mt-4 text-slate-400">Questions, feedback, or partnership ideas? We'd love to hear from you.</p>
      </div></section>
      <section className="py-12 md:py-16"><div className="container max-w-4xl"><div className="grid gap-8 md:grid-cols-[1fr_1.5fr]">
        <div>
          <div className="card p-5"><Mail size={22} className="text-amber-500" /><h2 className="mt-3 font-semibold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>Email us</h2><p className="mt-1 text-sm text-slate-400">For general questions and support:</p><p className="mt-2 font-semibold text-indigo-700">support@appealmail.app</p></div>
          <div className="mt-4 card p-5"><Clock size={22} className="text-amber-500" /><h2 className="mt-3 font-semibold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>Response time</h2><p className="mt-1 text-sm text-slate-400">Typically within 1–2 business days.</p></div>
          <div className="mt-4 card p-5"><MessageSquare size={22} className="text-amber-500" /><h2 className="mt-3 font-semibold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>What we can help with</h2><ul className="mt-2 space-y-1.5 text-sm text-slate-400"><li>· Mailing status and tracking</li><li>· Billing and refund questions</li><li>· Product feedback</li><li>· Partnership inquiries</li></ul></div>
          <div className="mt-4 alert alert-warning"><p className="text-xs"><strong>Legal questions:</strong> Benefits Appeal is not a law firm and cannot provide legal advice.</p></div>
        </div>
        <div className="card p-6 md:p-8">
          {submitted ? (<div className="text-center py-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50"><CheckCircle2 size={32} className="text-amber-600" /></div><h2 className="mt-5 text-xl font-bold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>Message sent!</h2><p className="mt-3 text-sm text-slate-400">Thanks, {form.name || "there"}. We'll get back to you within 1–2 business days.</p><Link to="/" className="btn-outline mt-6">Back to home</Link></div>) : (<>
            <h2 className="text-xl font-bold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>Send a message</h2>
            <p className="mt-1 text-sm text-slate-400">Fill out the form and we'll get back to you.</p>
            <div className="mt-6 space-y-4">
              <div><label className="input-label">Name</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></div>
              <div><label className="input-label">Email</label><input className="input-field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></div>
              <div><label className="input-label">Subject</label><select className="input-field" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}><option value="">Select a topic...</option><option value="support">Support question</option><option value="billing">Billing or refund</option><option value="feedback">Product feedback</option><option value="partnership">Partnership</option><option value="other">Other</option></select></div>
              <div><label className="input-label">Message</label><textarea className="input-field min-h-32" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How can we help?" /></div>
              <button onClick={() => form.email.trim() && form.message.trim() && setSubmitted(true)} disabled={!form.email.trim() || !form.message.trim()} className="btn-primary w-full justify-center">Send message <ArrowRight size={16} /></button>
            </div>
          </>)}
        </div>
      </div></div></section>
      <SiteFooter />
    </main>
  );
}
