import { PRICES } from "@mailmypdf/pricing";

export function SsdiDenialPricing() {
  const standard = PRICES.standard / 100;
  const certified = PRICES.certified / 100;
  const registered = PRICES.registered / 100;

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Beta pricing
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              Workflow work is included. Pay only for mailing.
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Your exact mailing total is shown before payment.
          </p>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["Workflow work", "Included"],
            ["Standard mail", `$${standard.toFixed(2)}`],
            ["Certified mail", `$${certified.toFixed(2)}`],
            ["Registered mail", `$${registered.toFixed(2)}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">{label}</div>
              <div className="mt-1 font-semibold">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
          <p>
            The exact mailing total is calculated from the approved physical
            packet before payment. Nothing is mailed until you approve the
            response.
          </p>
        </div>
      </div>
    </section>
  );
}
