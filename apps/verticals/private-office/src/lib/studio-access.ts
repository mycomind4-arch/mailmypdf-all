/** Studio executes local tools using the developer's machine credentials. */
export function isLocalDevelopmentHost(host: string | null, environment: string | undefined): boolean {
  if (environment !== "development" || !host) return false;
  try {
    const url = new URL(`http://${host}`);
    return url.host === host.toLowerCase() && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function studioAccessError(request: Request, environment = process.env.NODE_ENV): Response | null {
  const url = new URL(request.url);
  if (!isLocalDevelopmentHost(request.headers.get("host"), environment) ||
      !isLocalDevelopmentHost(url.host, environment)) {
    return Response.json({ error: "Studio tools are available only on the local development server." }, { status: 403 });
  }
  // Prevent a remote website from operating the developer's local tools.
  const origin = request.headers.get("origin");
  if ((origin && origin !== url.origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "Studio requires a same-origin request." }, { status: 403 });
  }
  return null;
}
