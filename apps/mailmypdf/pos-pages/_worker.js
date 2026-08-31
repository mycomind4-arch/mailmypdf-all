const WORKER_URL = "https://mailmypdf.mailmypdf.workers.dev";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Static assets — serve from Pages (env.ASSETS)
    if (path.startsWith("/assets/") || path === "/favicon.ico" || path === "/robots.txt" || path === "/_headers") {
      return env.ASSETS.fetch(request);
    }

    // API routes — proxy to Worker
    if (path.startsWith("/api/")) {
      const targetUrl = new URL(path, WORKER_URL);
      targetUrl.search = url.search;
      return fetch(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
      });
    }

    // Verification portal — proxy to Worker
    if (path.startsWith("/verify")) {
      const targetUrl = new URL(path, WORKER_URL);
      targetUrl.search = url.search;
      return fetch(targetUrl, {
        method: request.method,
        headers: request.headers,
      });
    }

    // Everything else (including /) — serve from Pages assets (index.html)
    return env.ASSETS.fetch(request);
  }
};
