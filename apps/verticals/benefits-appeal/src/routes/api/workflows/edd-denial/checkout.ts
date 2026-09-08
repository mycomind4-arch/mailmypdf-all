import { createFileRoute } from '@tanstack/react-router';
import { checkoutPayment } from '@/platform/payment-handlers';
export const Route = createFileRoute('/api/workflows/edd-denial/checkout')({
  server: { handlers: { POST: ({ request }) => checkoutPayment(request, 'edd-denial') } },
});
