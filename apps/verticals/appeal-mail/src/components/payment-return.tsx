import { useEffect, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useAuth } from '@/lib/auth';

export function PaymentReturn() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const sessionId = query.get('session_id');
    if (query.get('checkout') !== 'success' || !sessionId) { setMessage(''); return; }
    if (loading) return;
    if (!user) { setMessage('Sign in to confirm your mailing status.'); return; }
    let cancelled = false;
    setMessage('Confirming payment and mailing status…'); setFailed(false);
    async function confirm() {
      try {
        const { getSupabaseClient } = await import('@/platform/supabase');
        const client = await getSupabaseClient();
        const session = client ? await client.auth.getSession() : null;
        const token = session?.data.session?.access_token;
        if (!token) throw new Error('Please sign in to confirm your mailing.');
        const response = await fetch('/api/mail/response', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ sessionId }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not confirm mailing. Please retry.');
        if (!cancelled) setMessage('Payment confirmed. Your mailing has been submitted for processing.');
      } catch (error) {
        if (!cancelled) { setFailed(true); setMessage(error instanceof Error ? error.message : 'Could not confirm mailing.'); }
      }
    }
    void confirm();
    return () => { cancelled = true; };
  }, [location.href, user?.id, loading, retry]);
  if (!message) return null;
  return <div role="status" style={{ padding: '16px 24px', borderBottom: '1px solid currentColor' }}>{message}{failed && <button type="button" onClick={() => setRetry(value => value + 1)} style={{ marginLeft: 16 }}>Retry confirmation</button>}</div>;
}
