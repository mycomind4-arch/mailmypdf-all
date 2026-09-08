import { createFileRoute } from '@tanstack/react-router';
import { checkoutPayment } from '@/platform/payment-handlers';
export const Route = createFileRoute('/api/workflows/benefits-reconsideration/checkout')({
  server: { handlers: { POST: ({ request }) => checkoutPayment(request, 'benefits-reconsideration') } },
});
