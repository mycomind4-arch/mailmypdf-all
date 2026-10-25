export const FACTORY_JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function factoryJobErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Factory job request failed.";
  const status =
    /not found/i.test(message) ? 404 :
    /concurrently|revision conflict/i.test(message) ? 409 :
    /requires review|not awaiting review|cannot advance|cannot be cancelled|requires an explicit reviewed transition|build executor/i.test(message) ? 409 :
    /required|invalid|limited to/i.test(message) ? 400 :
    500;
  return Response.json({ error: message }, { status });
}
