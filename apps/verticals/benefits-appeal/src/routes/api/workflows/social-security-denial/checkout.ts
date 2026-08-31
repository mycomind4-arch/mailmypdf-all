import { createAPIFileRoute } from "@tanstack/react-start/api";

export const POST = createAPIFileRoute("/api/workflows/social-security-denial/checkout")({
  handler: async ({ request }) => {
    return Response.json({ error: "Not configured" }, { status: 503 });
  },
});
