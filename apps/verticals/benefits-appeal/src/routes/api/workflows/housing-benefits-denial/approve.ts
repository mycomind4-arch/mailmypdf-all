import { createFileRoute } from '@tanstack/react-router';
import { approvePayment } from '@/platform/payment-handlers';
export const Route = createFileRoute('/api/workflows/housing-benefits-denial/approve')({
  server: { handlers: { POST: ({ request }) => approvePayment(request, 'housing-benefits-denial') } },
});
