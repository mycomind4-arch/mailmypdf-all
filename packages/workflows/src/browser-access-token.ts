/**
 * Lets a workflow package's browser code (e.g. notice-respond's
 * NoticeResponseWorkflow) obtain the current user's access token for
 * @mailmypdf/workflows' generic HTTP matter client, without depending on the
 * host app's Supabase client directly — a vertical package cannot import
 * from the host app it is bundled into (that dependency runs the other way),
 * and constructing a second Supabase client in the browser would create a
 * second GoTrueClient instance racing the host's own session refresh.
 *
 * Instead, the host registers a token provider once, as early as possible
 * (module scope, not inside an effect, so it runs before any workflow
 * component's own effects) and every workflow package reads through this
 * same registry.
 */
let provider: (() => Promise<string | null>) | null = null;

export function registerWorkflowAccessTokenProvider(next: () => Promise<string | null>): void {
  provider = next;
}

export function getWorkflowAccessToken(): Promise<string | null> {
  return provider ? provider() : Promise.resolve(null);
}
