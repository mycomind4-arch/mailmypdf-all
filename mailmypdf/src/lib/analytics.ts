const CONSENT_KEY = "mmp_consent_v1";
const VISITOR_KEY = "mmp_visitor_id";
const SESSION_KEY = "mmp_session_id";
const SESSION_STARTED_KEY = "mmp_session_started_at";
const CONSENT_VERSION = "1.0";
const ENDPOINT = "/api/analytics/events";

export type ConsentState = {
  essential: true;
  analytics: boolean;
  personalization: boolean;
  advertising: boolean;
  version: string;
  updatedAt: string;
};

type EventProperties = Record<string, unknown>;

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as ConsentState) : null;
  } catch {
    return null;
  }
}

function writeConsent(state: ConsentState) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
}

function getOrCreate(key: string) {
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const value = uuid();
  localStorage.setItem(key, value);
  return value;
}

function getSessionId() {
  const started = Number(sessionStorage.getItem(SESSION_STARTED_KEY) || 0);
  if (!started || Date.now() - started > 30 * 60 * 1000) {
    const id = uuid();
    sessionStorage.setItem(SESSION_KEY, id);
    sessionStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
    return id;
  }
  return getOrCreateSession();
}

function getOrCreateSession() {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id = uuid();
  sessionStorage.setItem(SESSION_KEY, id);
  sessionStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
  return id;
}

function collectTechnicalContext() {
  if (typeof window === "undefined") return {};
  return {
    browser_language: navigator.language,
    languages: navigator.languages?.slice(0, 10),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezone_offset_minutes: new Date().getTimezoneOffset(),
    platform: navigator.platform,
    user_agent: navigator.userAgent,
    cookie_enabled: navigator.cookieEnabled,
    online: navigator.onLine,
    hardware_concurrency: navigator.hardwareConcurrency,
    device_memory_gb: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    screen_pixel_ratio: window.devicePixelRatio,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    color_depth: window.screen.colorDepth,
    reduced_motion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    dark_mode: window.matchMedia("(prefers-color-scheme: dark)").matches,
    connection: (() => {
      const connection = (navigator as Navigator & { connection?: Record<string, unknown> }).connection;
      if (!connection) return undefined;
      return {
        effective_type: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        save_data: connection.saveData,
      };
    })(),
  };
}

export function getConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  return readConsent();
}

export function setConsent(input: Omit<ConsentState, "essential" | "version" | "updatedAt">) {
  const state: ConsentState = {
    essential: true,
    analytics: input.analytics,
    personalization: input.personalization,
    advertising: input.advertising,
    version: CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
  };
  writeConsent(state);
  if (state.analytics) {
    void track("consent_granted", { consent: state });
  }
  window.dispatchEvent(new CustomEvent("mmp-consent-changed", { detail: state }));
  return state;
}

export function clearConsent() {
  localStorage.removeItem(CONSENT_KEY);
  localStorage.removeItem(VISITOR_KEY);
  window.dispatchEvent(new CustomEvent("mmp-consent-changed", { detail: null }));
}

export async function track(eventName: string, properties: EventProperties = {}) {
  if (typeof window === "undefined") return;
  const consent = readConsent();
  if (!consent?.analytics) return;

  const payload = {
    event_id: uuid(),
    event_name: eventName,
    occurred_at: new Date().toISOString(),
    visitor_id: getOrCreate(VISITOR_KEY),
    session_id: getSessionId(),
    page: window.location.pathname,
    url: window.location.href,
    referrer: document.referrer || null,
    title: document.title,
    properties,
    technical: collectTechnicalContext(),
    attribution: getAttribution(),
    consent_version: consent.version,
  };

  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Analytics must never interfere with the product experience.
  }
}

export function getAttribution() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "gbraid",
    "wbraid",
    "fbclid",
    "msclkid",
    "ttclid",
    "li_fat_id",
    "ref",
    "affiliate_id",
  ];
  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = params.get(key);
    if (value) values[key] = value.slice(0, 500);
  }
  return values;
}

export function startPageTracking() {
  if (typeof window === "undefined" || !readConsent()?.analytics) return () => undefined;

  void track("page_view");

  const clickHandler = (event: MouseEvent) => {
    const target = (event.target as HTMLElement | null)?.closest("a,button,[data-track]");
    if (!target) return;
    const element = target as HTMLElement;
    void track("interaction", {
      tag: element.tagName.toLowerCase(),
      text: (element.innerText || element.getAttribute("aria-label") || "").slice(0, 200),
      href: element instanceof HTMLAnchorElement ? element.href : undefined,
      track_id: element.dataset.track,
    });
  };

  document.addEventListener("click", clickHandler, { passive: true });
  return () => document.removeEventListener("click", clickHandler);
}
