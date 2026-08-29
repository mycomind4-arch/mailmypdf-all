/**
 * ProUpsell — a small banner shown after checkout to convert one-time
 * letter mailers into Pro subscribers. Renders nothing if the user
 * is already on the /pro page.
 */

export function ProUpsell({ accent = "#0369a1" }: { accent?: string }) {
  return (
    <div className="mt-6 rounded-xl border border-[#17201d]/10 bg-[#f6f4ef] p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl">✉️</span>
        <div className="flex-1">
          <p className="text-sm font-medium">Mail more for less with MailMyPDF Pro</p>
          <p className="mt-0.5 text-xs text-[#17201d]/55">
            5 free letters every month + $3.99/letter after that. Just $9.99/mo. Cancel anytime.
          </p>
        </div>
        <a
          href="/pro"
          className="shrink-0 rounded-full px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
          style={{ background: accent }}
        >
          Go Pro →
        </a>
      </div>
    </div>
  );
}
