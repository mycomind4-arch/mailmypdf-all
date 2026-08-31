import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";

export function InsuranceDenialLetterPricing() {
  const profile = getWorkflowPricingProfile("insurance-denial-letter");
  if (!profile) return null;
  const base = profile.basePriceCents / 100;
  const standard = PRICES.standard / 100;
  const certified = PRICES.certified / 100;
  const registered = PRICES.registered / 100;
  const start = base + standard;

  return <section className="mx-auto max-w-6xl px-6 py-10">
    <div className="rounded-3xl border border-rule bg-paper-deep p-8">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Transparent pricing</div>
      <h2 className="mt-3 font-serif text-3xl">Starting at ${start.toFixed(2)}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Includes preparation, up to {profile.includedPages} pages, and standard mailing. Additional pages are charged at the canonical rate.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-rule bg-paper p-5"><div className="text-xs uppercase tracking-widest text-muted-foreground">Standard</div><div className="mt-2 text-xl font-semibold">${standard.toFixed(2)}</div></div>
        <div className="rounded-2xl border border-rule bg-paper p-5"><div className="text-xs uppercase tracking-widest text-muted-foreground">Certified</div><div className="mt-2 text-xl font-semibold">${certified.toFixed(2)}</div></div>
        <div className="rounded-2xl border border-rule bg-paper p-5"><div className="text-xs uppercase tracking-widest text-muted-foreground">Registered</div><div className="mt-2 text-xl font-semibold">${registered.toFixed(2)}</div></div>
      </div>
      <p className="mt-5 text-xs text-muted-foreground">Your exact price is calculated from the final approved packet before payment.</p>
    </div>
  </section>;
}
