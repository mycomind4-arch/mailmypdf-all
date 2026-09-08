import { createFileRoute } from '@tanstack/react-router';
import { approvePayment } from '@/platform/payment-handlers';
export const Route = createFileRoute('/api/workflows/social-security-denial/approve')({
  server: { handlers: { POST: ({ request }) => approvePayment(request, 'social-security-denial') } },
});
