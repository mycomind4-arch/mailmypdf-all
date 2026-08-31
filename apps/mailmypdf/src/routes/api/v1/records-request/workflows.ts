import { createFileRoute } from "@tanstack/react-router";
import { RECORDS_REQUEST_WORKFLOWS } from "@/products/records-request/workflows";

export const Route = createFileRoute("/api/v1/records-request/workflows")({
  server: {
    handlers: {
      GET: async () => Response.json({ product: "records-request", count: RECORDS_REQUEST_WORKFLOWS.length, workflows: RECORDS_REQUEST_WORKFLOWS }),
    },
  },
});
