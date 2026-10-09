/**
 * Server-only adapter to Ruthless Investigator's existing Express API.
 * No engine duplication and no arbitrary URL/command/tool proxying.
 */
export type RuthlessReadAction = "health" | "list" | "state" | "events" | "runs" | "cost";
export type RuthlessWriteAction = "start" | "intervene" | "pause" | "resume" | "reopen" | "refresh" | "load";

const LOOPBACK = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const MAX_RESPONSE_LENGTH = 4_000_000;

export class RuthlessUnavailableError extends Error {}

export function validateRuthlessEndpoint(urlRaw: string | undefined, token: string | undefined): URL {
  if (!urlRaw) throw new RuthlessUnavailableError("Ruthless Investigator is not connected. Configure STUDIO_RUTHLESS_API_URL on the Studio server.");
  let url: URL;
  try { url = new URL(urlRaw); } catch { throw new RuthlessUnavailableError("Invalid Ruthless Investigator API URL."); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new RuthlessUnavailableError("Ruthless API URL must contain only its origin, without credentials, a path, or query.");
  }
  const isLocal = LOOPBACK.has(url.hostname.toLowerCase());
  if (isLocal) {
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new RuthlessUnavailableError("Unsupported local Ruthless API protocol.");
  } else if (url.protocol !== "https:" || !token || token.length < 32) {
    throw new RuthlessUnavailableError("Remote Ruthless API requires HTTPS and STUDIO_RUTHLESS_API_TOKEN (at least 32 characters).");
  }
  return url;
}

function config() {
  const token = process.env.STUDIO_RUTHLESS_API_TOKEN?.trim();
  return { origin: validateRuthlessEndpoint(process.env.STUDIO_RUTHLESS_API_URL?.trim(), token), token };
}

function route(action: RuthlessReadAction | RuthlessWriteAction, id?: string): string {
  const investigation = id ? "/api/investigations/" + encodeURIComponent(id) : "/api/investigations";
  switch (action) {
    case "health": return "/api/health";
    case "list": return "/api/investigations";
    case "start": return "/api/investigations";
    case "state": return investigation;
    case "events": return investigation + "/events";
    case "runs": return investigation + "/runs";
    case "cost": return investigation + "/cost";
    case "intervene": return investigation + "/intervene";
    case "pause": return investigation + "/pause";
    case "resume": return investigation + "/resume";
    case "reopen": return investigation + "/reopen";
    case "refresh": return investigation + "/refresh";
    case "load": return investigation + "/load";
  }
}

export async function ruthlessRequest(action: RuthlessReadAction | RuthlessWriteAction, payload: Record<string, unknown> = {}, id?: string): Promise<unknown> {
  const { origin, token } = config();
  const isRead = ["health", "list", "state", "events", "runs", "cost"].includes(action);
  const target = new URL(route(action, id), origin);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const result = await fetch(target, {
      method: isRead ? "GET" : "POST",
      redirect: "error",
      headers: {
        accept: "application/json",
        ...(token ? { authorization: "Bearer " + token } : {}),
        ...(!isRead ? { "content-type": "application/json" } : {}),
      },
      ...(!isRead ? { body: JSON.stringify(payload) } : {}),
      signal: controller.signal,
    });
    if (result.status === 401 || result.status === 403) {
      throw new RuthlessUnavailableError("Ruthless Investigator rejected the service token. Check both servers' authentication settings.");
    }
    if (!result.ok) {
      if (result.status === 404) throw new RuthlessUnavailableError("Investigation not found on the connected Ruthless Investigator instance.");
      throw new RuthlessUnavailableError("Ruthless Investigator returned HTTP " + result.status + ".");
    }
    if (Number(result.headers.get("content-length") ?? 0) > MAX_RESPONSE_LENGTH) {
      throw new RuthlessUnavailableError("Ruthless Investigator response exceeded the Studio safety limit.");
    }
    const raw = await result.text();
    if (raw.length > MAX_RESPONSE_LENGTH) throw new RuthlessUnavailableError("Ruthless Investigator response exceeded the Studio safety limit.");
    return JSON.parse(raw) as unknown;
  } catch (error) {
    if (error instanceof RuthlessUnavailableError) throw error;
    throw new RuthlessUnavailableError("Ruthless Investigator is unreachable or returned an invalid response. Check its service and API URL.");
  } finally {
    clearTimeout(timeout);
  }
}
