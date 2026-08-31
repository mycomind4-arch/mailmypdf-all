import { createAPIFileRoute } from "@tanstack/react-start/api";

export const POST = createAPIFileRoute("/api/workflows/unemployment-denial/approve")({
  handler: async ({ request }) => {
    return Response.json({ error: "Not configured" }, { status: 503 });
  },
});
