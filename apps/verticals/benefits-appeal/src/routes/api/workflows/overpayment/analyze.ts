import { createAPIFileRoute } from "@tanstack/react-start/api";

export const GET = createAPIFileRoute("/api/workflows/overpayment/analyze")({
  handler: async ({ request }) => {
    return Response.json({ error: "Not configured" }, { status: 503 });
  },
});

export const POST = createAPIFileRoute("/api/workflows/overpayment/analyze")({
  handler: async ({ request }) => {
    return Response.json({ error: "Not configured" }, { status: 503 });
  },
});
