import { createFileRoute } from '@tanstack/react-router';
import { returnPayment } from '@/platform/payment-handlers';
export const Route = createFileRoute('/api/mail/response')({ server: { handlers: { POST: ({ request }) => returnPayment(request) } } });
