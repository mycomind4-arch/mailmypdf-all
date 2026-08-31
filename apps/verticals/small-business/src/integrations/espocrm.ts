export interface EspoClientOptions {
  baseUrl: string;
  apiKey: string;
}

/** Optional CRM adapter for teams that already run EspoCRM. */
export class EspoCrmClient {
  constructor(private readonly options: EspoClientOptions) {}

  async list(entity: string, params: Record<string, string> = {}) {
    return this.request(`/api/v1/${encodeURIComponent(entity)}`, { method: "GET", params });
  }

  async create(entity: string, data: Record<string, unknown>) {
    return this.request(`/api/v1/${encodeURIComponent(entity)}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async update(entity: string, id: string, data: Record<string, unknown>) {
    return this.request(`/api/v1/${encodeURIComponent(entity)}/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  private async request(path: string, init: RequestInit & { params?: Record<string, string> }) {
    const url = new URL(path, this.options.baseUrl);
    for (const [key, value] of Object.entries(init.params ?? {})) url.searchParams.set(key, value);
    const response = await fetch(url, {
      ...init,
      headers: {
        "content-type": "application/json",
        "X-Api-Key": this.options.apiKey,
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) throw new Error(`EspoCRM request failed: ${response.status}`);
    return response.json();
  }
}
