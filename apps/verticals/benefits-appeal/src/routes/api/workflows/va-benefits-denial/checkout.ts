import { createFileRoute } from '@tanstack/react-router';
import { checkoutPayment } from '@/platform/payment-handlers';
export const Route = createFileRoute('/api/workflows/va-benefits-denial/checkout')({
  server: { handlers: { POST: ({ request }) => checkoutPayment(request, 'va-benefits-denial') } },
});
