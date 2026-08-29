import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";

export function PriorAuthorizationDenialPricing() {
  const profile = getWorkflowPricingProfile("prior-authorization-denial");
  if (!profile) return null;
  const base = profile.basePriceCents / 100;
  const standard = PRICES.standard / 100;
  const certified = PRICES.certified / 100;
  const registered = PRICES.registered / 100;

  return <section className="mx-auto mt-8 max-w-5xl rounded-2xl border border-rule bg-paper-deep p-6">
    <div className="text-xs uppercase tracking-widest text-muted-foreground">Transparent pricing</div>
    <h2 className="mt-2 font-serif text-2xl">Starting at ${base.toFixed(2)} + mailing</h2>
    <div className="mt-4 grid gap-3 md:grid-cols-4 text-sm">
      <div><b>Preparation</b><p>${base.toFixed(2)}</p></div>
      <div><b>Included</b><p>{profile.includedPages} pages</p></div>
      <div><b>Mailing</b><p>Standard ${standard.toFixed(2)} · Certified ${certified.toFixed(2)} · Registered ${registered.toFixed(2)}</p></div>
      <div><b>Extra pages</b><p>Charged at canonical rate</p></div>
    </div>
    <p className="mt-4 text-sm leading-6 text-muted-foreground">The exact total is calculated from the approved physical packet before payment.</p>
  </section>;
}
