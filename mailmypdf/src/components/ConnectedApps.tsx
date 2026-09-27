import { useEffect, useState } from "react";
import type { OAuthGrant } from "@supabase/supabase-js";
import { ensureSupabase, supabase } from "@/integrations/supabase/client";

export interface ConnectedAppsApi {
  list(): Promise<OAuthGrant[]>;
  revoke(clientId: string): Promise<void>;
}

const connectedAppsApi: ConnectedAppsApi = {
  async list() {
    await ensureSupabase();
    if (!supabase.auth) throw new Error("Authentication is unavailable");
    const { data, error } = await supabase.auth.oauth.listGrants();
    if (error) throw error;
    return data ?? [];
  },
  async revoke(clientId) {
    await ensureSupabase();
    if (!supabase.auth) throw new Error("Authentication is unavailable");
    const { error } = await supabase.auth.oauth.revokeGrant({ clientId });
    if (error) throw error;
  },
};

export function ConnectedApps({ api = connectedAppsApi }: { api?: ConnectedAppsApi }) {
  const [grants, setGrants] = useState<OAuthGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void api.list().then((data) => {
      if (active) setGrants(data);
    }).catch(() => {
      if (active) setError("We couldn’t load your connected apps. Try again.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [api, refresh]);

  async function disconnect(grant: OAuthGrant) {
    setRevoking(grant.client.id);
    setError(null);
    setMessage(null);
    try {
      await api.revoke(grant.client.id);
      setGrants((current) => current.filter((entry) => entry.client.id !== grant.client.id));
      setConfirming(null);
      setMessage(`${grant.client.name || "App"} disconnected. Reconnect from that app if you want to use it again.`);
    } catch {
      setError("Disconnect failed. Access may still be active. Please try again.");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <section className="envelope-card p-6" aria-labelledby="connected-apps-title" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="connected-apps-title" className="font-serif text-lg">Connected apps</h3>
        <button type="button" disabled={loading || revoking !== null}
          className="rounded-full border border-rule px-4 py-2 text-sm disabled:opacity-60"
          onClick={() => { setMessage(null); setRefresh((value) => value + 1); }}>
          Refresh connections
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage apps you’ve authorized to use MailMyPDF, including AI assistants.
        App names are supplied by the app, not a verified publisher badge.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Disconnecting revokes consent and refresh tokens. Existing access tokens may remain valid until they expire.
        It does not cancel paid mail or delete your documents.
      </p>
      {loading && <p role="status" className="mt-4 text-sm">Loading connected apps…</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-4 text-sm text-emerald-700">{message}</p>}
      {!loading && !error && grants.length === 0 && <p className="mt-4 text-sm">No connected apps.</p>}
      {!loading && grants.length > 0 && (
        <ul className="mt-4 space-y-4">
          {grants.map((grant) => (
            <li key={grant.client.id} className="rounded-lg border border-rule p-4">
              <p className="font-medium break-words">{grant.client.name || "Unnamed app"}</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">Client ID: {grant.client.id}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Identity permissions: {grant.scopes.length ? grant.scopes.join(", ") : "None listed"}.
                These are not read-only restrictions on your MailMyPDF account.
              </p>
              {confirming === grant.client.id ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm">Disconnect this app? It will need your permission to reconnect.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={revoking !== null}
                      className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700 disabled:opacity-60"
                      onClick={() => void disconnect(grant)}>
                      {revoking === grant.client.id ? "Disconnecting…" : "Confirm disconnect"}
                    </button>
                    <button type="button" disabled={revoking !== null}
                      className="rounded-full border border-rule px-4 py-2 text-sm disabled:opacity-60"
                      onClick={() => setConfirming(null)}>Keep connected</button>
                  </div>
                </div>
              ) : (
                <button type="button" disabled={revoking !== null}
                  className="mt-3 rounded-full border border-rule px-4 py-2 text-sm disabled:opacity-60"
                  aria-label={`Disconnect ${grant.client.name || "unnamed app"}`}
                  onClick={() => { setError(null); setConfirming(grant.client.id); }}>Disconnect</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
