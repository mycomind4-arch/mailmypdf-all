import { createFileRoute } from '@tanstack/react-router';
import { checkoutPayment } from '@/platform/payment-handlers';
export const Route = createFileRoute('/api/workflows/medicaid-denial/checkout')({
  server: { handlers: { POST: ({ request }) => checkoutPayment(request, 'medicaid-denial') } },
});
