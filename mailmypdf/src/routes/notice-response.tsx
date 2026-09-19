import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/notice-response")({
  beforeLoad: () => {
    throw redirect({ href: "/notice-respond", statusCode: 308 });
  },
  component: () => null,
});
