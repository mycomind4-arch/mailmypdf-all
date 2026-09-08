import { createFileRoute } from '@tanstack/react-router';
import { checkoutPayment } from '@/platform/payment-handlers';
export const Route = createFileRoute('/api/workflows/housing-benefits-denial/checkout')({
  server: { handlers: { POST: ({ request }) => checkoutPayment(request, 'housing-benefits-denial') } },
});
