import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { lookupOrder } from "@/lib/orders.functions";
import { requestOrderRecoveryEmail } from "@/lib/recovery.functions";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Find your order — MailMyPDF" },
      { name: "description", content: "Recover the tracking link for a letter you sent through MailMyPDF." },
      { property: "og:title", content: "Find your order — MailMyPDF" },
      { property: "og:description", content: "Recover your MailMyPDF letter tracking link." },
      { property: "og:url", content: "/orders" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/orders" }],
  }),
  component: LookupPage,
});

function LookupPage() {
  const [tab, setTab] = useState<"email" | "id">("email");
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-6 py-20">
        <div className="postmark w-fit">Order lookup</div>
        <h1 className="mt-6 font-serif text-4xl md:text-5xl">Find your letter.</h1>

        <div className="mt-8 flex gap-2 border-b border-rule">
          <TabButton active={tab === "email"} onClick={() => setTab("email")}>Email me my links</TabButton>
          <TabButton active={tab === "id"} onClick={() => setTab("id")}>I have my order ID</TabButton>
        </div>

        <div className="mt-8">
          {tab === "email" ? <EmailRecoveryForm /> : <OrderIdForm />}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
        active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function EmailRecoveryForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestOrderRecoveryEmail({ data: { email: email.trim() } });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-md border border-rule bg-card p-6">
        <div className="postmark w-fit">Check your inbox</div>
        <p className="mt-3 text-sm">
          If <span className="font-mono">{email}</span> has any MailMyPDF orders, we've just emailed the tracking links. Give it a minute, then check spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Enter the email you used to place your order(s). We'll send you a private link for each one.
      </p>
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="you@example.com"
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Email me my order links"}
      </button>
    </form>
  );
}

function OrderIdForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await lookupOrder({ data: { email: email.trim(), orderId: orderId.trim() } });
      if ("error" in result) { setError(result.error); return; }
      navigate({ to: "/orders/$id", params: { id: orderId.trim() }, search: { token: result.token, paid: false } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Enter the email and order ID from your confirmation email.
      </p>
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="you@example.com" />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Order ID</span>
        <input type="text" required value={orderId} onChange={(e) => setOrderId(e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
          placeholder="00000000-0000-0000-0000-000000000000" />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={submitting}
        className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
        {submitting ? "Looking up…" : "Find my order"}
      </button>
    </form>
  );
}
