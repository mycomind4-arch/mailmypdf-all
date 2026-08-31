import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  createSubscriptionCheckout,
  checkSubscriptionStatus,
  cancelSubscription,
} from "@/lib/subscriptions.functions";
import {
  PRO_FREE_LETTERS_PER_MONTH,
  PRO_MEMBER_RATE_CENTS,
  PRO_MONTHLY_PRICE_CENTS,
} from "@/lib/subscriptions";
import {
  mailClassSurchargeLabel,
  colorPerPageLabel,
  mailClassSurchargeUsd,
  colorPerPageUsd,
  MAIL_CLASS_SURCHARGE,
  MAIL_CLASS_LABELS,
} from "@/lib/pricing";
import { SiteHeader } from "@/components/site-chrome";
import { trackProSubscribed, trackProCancelled } from "@/lib/analytics-events";
import { SiteFooter } from "@/components/site-chrome";
import { SectionHeader, FAQList } from "@/components/shared/design-system";
import { Check, ArrowRight, Mail, Palette, Shield, XCircle } from "lucide-react";

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "MailMyPDF Pricing — Transparent per-document and Pro pricing" },
      {
        name: "description",
        content:
          "Mail a document from $4.99. Pro members get 5 free letters every month and discounted rates. Certified Mail, Registered Mail, and color printing available. No hidden fees.",
      },
      { property: "og:title", content: "MailMyPDF Pricing" },
      {
        property: "og:description",
        content: "Transparent per-document pricing. Mail a short document from $4.99.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/pro" }],
  }),
  component: ProPage,
});

function ProPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState("");

  const subscribedTracked = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1" && !subscribedTracked.current) {
      subscribedTracked.current = true;
      void trackProSubscribed(PRO_MONTHLY_PRICE_CENTS);
    }
  }, []);

  const monthlyPrice = `$${(PRO_MONTHLY_PRICE_CENTS / 100).toFixed(2)}`;
  const memberRate = `$${(PRO_MEMBER_RATE_CENTS / 100).toFixed(2)}`;

  async function checkStatus() {
    if (!email) return;
    setError("");
    try {
      const result = await checkSubscriptionStatus({ data: { email } });
      if ("error" in (result as any)) {
        setError((result as any).error);
      } else {
        setStatus(result);
      }
    } catch (e) {
      setError("Could not check subscription status.");
    }
  }

  async function subscribe() {
    if (!email) {
      setError("Enter your email to subscribe.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await createSubscriptionCheckout({ data: { email } });
      if ("error" in result) {
        setError(result.error);
        setLoading(false);
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (e) {
      setError("Could not start checkout. Please try again.");
      setLoading(false);
    }
  }

  async function cancel() {
    if (!email) return;
    if (!confirm("Cancel your MailMyPDF Pro subscription?")) return;
    setLoading(true);
    setError("");
    try {
      const result = await cancelSubscription({ data: { email } });
      if ("error" in result) {
        setError(result.error);
      } else {
        setStatus(null);
        void trackProCancelled();
        alert(
          "Subscription canceled. Your benefits remain active until the end of the billing period.",
        );
      }
    } catch (e) {
      setError("Could not cancel subscription.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="eyebrow">Pricing</div>
            <h1 className="mt-4 text-4xl leading-tight sm:text-5xl md:text-6xl">
              Clear pricing for every document.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Pay per document with no hidden fees, or join Pro for free letters every month.
              Certified Mail, Registered Mail, and color printing are available on every order.
            </p>
          </div>
        </section>

        {/* Per-document pricing */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <SectionHeader
              eyebrow="Per document"
              title="Mail a document from $4.99."
              subtitle="Base price depends on page count. Mailing service and color printing are added at checkout. The total is shown before you pay."
            />

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {/* Base tiers */}
              <div className="envelope-card p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cobalt">
                  Short document
                </div>
                <div className="mt-2 font-serif text-3xl">$4.99</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  1–2 pages, black & white, standard delivery
                </p>
              </div>
              <div className="envelope-card p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cobalt">
                  Medium document
                </div>
                <div className="mt-2 font-serif text-3xl">$6.99</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  3–5 pages, black & white, standard delivery
                </p>
              </div>
              <div className="envelope-card p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cobalt">
                  Long document
                </div>
                <div className="mt-2 font-serif text-3xl">$9.99</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  6+ pages, black & white, standard delivery
                </p>
              </div>
            </div>

            {/* Add-ons */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-lg border border-rule bg-card p-4">
                <Shield className="h-5 w-5 text-cobalt" />
                <div>
                  <div className="text-sm font-medium">Certified Mail</div>
                  <div className="text-xs text-muted-foreground">
                    {mailClassSurchargeLabel("certified")} — delivery tracking + confirmation
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-rule bg-card p-4">
                <Shield className="h-5 w-5 text-cobalt" />
                <div>
                  <div className="text-sm font-medium">Registered Mail</div>
                  <div className="text-xs text-muted-foreground">
                    {mailClassSurchargeLabel("registered")} — secure handling + tracking
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-rule bg-card p-4">
                <Palette className="h-5 w-5 text-cobalt" />
                <div>
                  <div className="text-sm font-medium">Color printing</div>
                  <div className="text-xs text-muted-foreground">
                    {colorPerPageLabel()} per page
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Link
                to="/send"
                className="inline-flex items-center gap-2 rounded-full bg-cobalt px-6 py-3 text-sm font-medium text-white shadow-stamp transition-all duration-200 hover:-translate-y-0.5 hover:bg-cobalt/90"
              >
                Send a Document <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Pro plan */}
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-start">
              {/* Left: benefits */}
              <div>
                <div className="postmark w-fit">MailMyPDF Pro</div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-serif text-5xl">{monthlyPrice}</span>
                  <span className="text-lg text-muted-foreground">/month</span>
                </div>
                <p className="mt-3 max-w-lg text-sm text-muted-foreground">
                  {PRO_FREE_LETTERS_PER_MONTH} free standard letters every month. Discounted rates
                  after that. Same print-and-mail service, better price.
                </p>

                <div className="mt-8 space-y-3">
                  {[
                    {
                      icon: Mail,
                      title: `${PRO_FREE_LETTERS_PER_MONTH} free letters every month`,
                      desc: "Standard letters (up to 5 pages, B&W) included. No rollover — use them or lose them.",
                    },
                    {
                      icon: Check,
                      title: `Only ${memberRate} per letter after that`,
                      desc: "Flat member rate for any letter up to 10 pages. No tier pricing.",
                    },
                    {
                      icon: Palette,
                      title: "Color printing still available",
                      desc: `${colorPerPageLabel()} per page when you need it.`,
                    },
                    {
                      icon: Shield,
                      title: "Certified & Registered mail",
                      desc: `Add Certified (${mailClassSurchargeLabel("certified")}) or Registered (${mailClassSurchargeLabel("registered")}) at normal rates.`,
                    },
                    {
                      icon: XCircle,
                      title: "Cancel anytime",
                      desc: "No commitment. Cancel in one click. Benefits last until your billing period ends.",
                    },
                  ].map((b) => (
                    <div key={b.title} className="flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rule bg-card text-cobalt">
                        <b.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{b.title}</div>
                        <div className="text-xs text-muted-foreground">{b.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: subscribe/manage card */}
              <div>
                {status?.isActive ? (
                  <div className="envelope-card p-6">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-cobalt" />
                      <h2 className="font-serif text-xl">You're a Pro member</h2>
                    </div>
                    <div className="mt-5 space-y-3 text-sm">
                      <div className="flex items-center justify-between border-b border-rule/60 pb-2.5">
                        <span className="text-muted-foreground">Letters used</span>
                        <span className="font-medium">
                          {status.lettersUsedThisPeriod} / {status.freeLettersPerMonth}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-b border-rule/60 pb-2.5">
                        <span className="text-muted-foreground">Remaining free</span>
                        <span className="font-medium text-cobalt">{status.lettersRemaining}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-rule/60 pb-2.5">
                        <span className="text-muted-foreground">Rate after free tier</span>
                        <span className="font-medium">
                          ${(status.memberRateCents / 100).toFixed(2)}/letter
                        </span>
                      </div>
                      {status.currentPeriodEnd && (
                        <div className="flex items-center justify-between border-b border-rule/60 pb-2.5">
                          <span className="text-muted-foreground">Period ends</span>
                          <span className="font-medium">
                            {new Date(status.currentPeriodEnd * 1000).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={cancel}
                      disabled={loading}
                      className="mt-5 w-full rounded-md border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
                    >
                      {loading ? "Canceling..." : "Cancel subscription"}
                    </button>
                  </div>
                ) : (
                  <div className="envelope-card p-7">
                    <h2 className="font-serif text-2xl">Subscribe to Pro</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Enter your email to get started. Secure checkout via Stripe.
                    </p>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-5 w-full rounded-md border border-input bg-transparent px-3 py-2.5 text-sm focus:border-cobalt focus:outline-none focus:ring-1 focus:ring-cobalt"
                    />
                    {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
                    <button
                      onClick={subscribe}
                      disabled={loading}
                      className="mt-4 w-full rounded-md bg-cobalt px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-cobalt/90 disabled:opacity-50"
                    >
                      {loading ? "Redirecting to Stripe..." : `Subscribe — ${monthlyPrice}/month`}
                    </button>
                    <button
                      onClick={checkStatus}
                      className="mt-3 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Already a member? Check your status
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
            <SectionHeader eyebrow="Pricing FAQ" title="Common questions about pricing." />
            <div className="mt-8">
              <FAQList
                items={[
                  {
                    q: 'What counts as a "free letter"?',
                    a: `Standard letters up to 5 pages, black & white, standard delivery. Add-ons like color printing, Certified Mail, and Registered Mail are charged at normal rates even for Pro members.`,
                  },
                  {
                    q: "Do unused letters roll over?",
                    a: `No — your ${PRO_FREE_LETTERS_PER_MONTH} free letters reset at the start of each billing period. Use them or lose them.`,
                  },
                  {
                    q: `What if I send more than ${PRO_FREE_LETTERS_PER_MONTH} letters?`,
                    a: `After your free letters, each letter costs a flat ${memberRate} (up to 10 pages). Color, certified, and registered add-ons are extra.`,
                  },
                  {
                    q: "Can I cancel anytime?",
                    a: "Yes. Cancel in one click from this page. Your Pro benefits stay active until the end of your current billing period.",
                  },
                  {
                    q: "Is the price shown before I pay?",
                    a: "Yes. The total — including base price, mailing service, and any add-ons — is shown before you confirm payment.",
                  },
                  {
                    q: "Do I need a Pro subscription to send mail?",
                    a: "No. Pro is optional. You can always send a single document at the per-document price without a subscription.",
                  },
                ]}
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
