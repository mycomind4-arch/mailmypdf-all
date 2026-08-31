const WORKER_URL = "https://mailmypdf.mailmypdf.workers.dev";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Static assets — serve from Pages (fast, no Worker roundtrip)
    if (path.startsWith("/assets/") || path === "/favicon.ico" || path === "/robots.txt" || path === "/_headers") {
      return env.ASSETS.fetch(request);
    }

    // Everything else (SSR pages, API, etc.) — proxy to Worker
    const targetUrl = new URL(path, WORKER_URL);
    targetUrl.search = url.search;
    
    // Clone headers and remove host-related ones
    const headers = new Headers(request.headers);
    headers.delete("host");
    
    return fetch(targetUrl, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    });
  }
};
