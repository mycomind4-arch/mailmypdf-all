import { useEffect, useState } from "react";
import { getConsent, setConsent, type ConsentState } from "../lib/analytics";

export function AnalyticsConsent() {
  const [consent, setLocalConsent] = useState<ConsentState | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLocalConsent(getConsent());
    const handler = (event: Event) => {
      setLocalConsent((event as CustomEvent<ConsentState | null>).detail);
    };
    window.addEventListener("mmp-consent-changed", handler);
    return () => window.removeEventListener("mmp-consent-changed", handler);
  }, []);

  if (consent) return null;

  const choose = (analytics: boolean, personalization: boolean, advertising: boolean) => {
    setLocalConsent(setConsent({ analytics, personalization, advertising }));
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-background/95 p-4 shadow-2xl backdrop-blur md:p-5">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-foreground">Your privacy, your choice</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            MailMyPDF uses essential storage to operate the service. With your opt-in, we can also collect detailed product and technical analytics to understand how the service is used, improve it, measure campaigns, and personalize experiences. We never need analytics consent to mail your documents.
          </p>
          {expanded && (
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <div><strong className="text-foreground">Analytics</strong><br />Pages, interactions, sessions, funnels, performance, device/browser context, and attribution.</div>
              <div><strong className="text-foreground">Personalization</strong><br />Preferences, feature usage, cohorts, and experience optimization.</div>
              <div><strong className="text-foreground">Advertising</strong><br />Campaign attribution and advertising measurement when enabled.</div>
            </div>
          )}
          <button
            type="button"
            className="mt-2 text-xs font-medium text-primary underline underline-offset-4"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Hide details" : "See what optional data is collected"}
          </button>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={() => choose(false, false, false)} className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Essential only</button>
          <button type="button" onClick={() => choose(true, true, false)} className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Analytics + personalization</button>
          <button type="button" onClick={() => choose(true, true, true)} className="rounded-md bg-cobalt px-4 py-2 text-sm font-medium text-white hover:opacity-90">Accept all optional</button>
        </div>
      </div>
    </div>
  );
}
