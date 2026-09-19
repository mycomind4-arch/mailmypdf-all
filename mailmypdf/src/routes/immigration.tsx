import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/immigration")({
  beforeLoad: () => {
    throw redirect({ href: "/immigration-mail", statusCode: 308 });
  },
  component: () => null,
});
