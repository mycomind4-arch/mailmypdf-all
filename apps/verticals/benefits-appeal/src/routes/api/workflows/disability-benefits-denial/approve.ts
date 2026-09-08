import { createFileRoute } from '@tanstack/react-router';
import { approvePayment } from '@/platform/payment-handlers';
export const Route = createFileRoute('/api/workflows/disability-benefits-denial/approve')({
  server: { handlers: { POST: ({ request }) => approvePayment(request, 'disability-benefits-denial') } },
});
