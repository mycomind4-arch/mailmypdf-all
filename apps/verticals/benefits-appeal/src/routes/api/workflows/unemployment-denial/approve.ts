import { createFileRoute } from '@tanstack/react-router';
import { approvePayment } from '@/platform/payment-handlers';
export const Route = createFileRoute('/api/workflows/unemployment-denial/approve')({
  server: { handlers: { POST: ({ request }) => approvePayment(request, 'unemployment-denial') } },
});
