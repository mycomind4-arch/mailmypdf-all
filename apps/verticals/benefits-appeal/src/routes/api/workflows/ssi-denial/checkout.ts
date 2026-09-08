import { createFileRoute } from '@tanstack/react-router';
import { checkoutPayment } from '@/platform/payment-handlers';
export const Route = createFileRoute('/api/workflows/ssi-denial/checkout')({
  server: { handlers: { POST: ({ request }) => checkoutPayment(request, 'ssi-denial') } },
});
