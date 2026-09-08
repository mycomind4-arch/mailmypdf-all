import { createFileRoute } from '@tanstack/react-router';
import { checkoutPayment } from '@/platform/payment-handlers';
export const Route = createFileRoute('/api/workflows/hearing-preparation/checkout')({
  server: { handlers: { POST: ({ request }) => checkoutPayment(request, 'hearing-preparation') } },
});
