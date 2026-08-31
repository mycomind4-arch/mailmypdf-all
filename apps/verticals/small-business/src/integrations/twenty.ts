export interface TwentyClientOptions {
  baseUrl: string;
  apiKey: string;
}

export interface TwentyRecord {
  object: string;
  id: string;
  properties: Record<string, unknown>;
}

/**
 * Lightweight HTTP boundary for Twenty. We keep MailMyPDF's domain model
 * independent so Twenty can be enabled per deployment instead of becoming a
 * hard dependency of the core product.
 */
export class TwentyClient {
  constructor(private readonly options: TwentyClientOptions) {}

  async list(object: string, query: Record<string, string> = {}): Promise<unknown> {
    return this.request(`/rest/${object}`, { method: "GET", query });
  }

  async create(object: string, properties: Record<string, unknown>): Promise<unknown> {
    return this.request(`/rest/${object}`, {
      method: "POST",
      body: JSON.stringify({ properties }),
    });
  }

  async update(object: string, id: string, properties: Record<string, unknown>): Promise<unknown> {
    return this.request(`/rest/${object}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });
  }

  private async request(path: string, init: RequestInit & { query?: Record<string, string> }) {
    const url = new URL(path, this.options.baseUrl);
    for (const [key, value] of Object.entries(init.query ?? {})) url.searchParams.set(key, value);
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${this.options.apiKey}`);
    headers.set("content-type", "application/json");
    const response = await fetch(url, { ...init, headers });
    if (!response.ok) throw new Error(`Twenty request failed: ${response.status}`);
    return response.json();
  }
}
