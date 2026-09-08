import { createFileRoute } from '@tanstack/react-router';
import { approvePayment } from '@/platform/payment-handlers';
export const Route = createFileRoute('/api/workflows/edd-denial/approve')({
  server: { handlers: { POST: ({ request }) => approvePayment(request, 'edd-denial') } },
});
