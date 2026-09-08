/** All checkout callers use the authenticated approval-required HTTP routes. */
async function post(path: string, body: unknown) {
  const { getSupabaseClient } = await import('./supabase');
  const client = await getSupabaseClient();
  const session = client ? await client.auth.getSession() : null;
  const token = session?.data.session?.access_token;
  if (!token) throw new Error('Please sign in before checkout.');
  const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Payment request failed.');
  return result;
}
export async function createCheckoutSession({ data }: { data: {
  appealId: string; workflowId: string; mailingMethod: 'standard' | 'certified' | 'registered';
  recipient: { name: string; address1: string; address2?: string; city: string; state: string; zip: string };
} }) {
  const base = `/api/workflows/${encodeURIComponent(data.workflowId)}`;
  const approval = await post(`${base}/approve`, data);
  return post(`${base}/checkout`, { appealId: data.appealId, approvalId: approval.approvalId });
}
export async function verifyCheckoutSession({ data }: { data: { sessionId: string } }) {
  return post('/api/mail/response', data);
}
