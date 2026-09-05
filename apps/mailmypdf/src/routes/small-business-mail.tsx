import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/small-business-mail")({
  beforeLoad: () => {
    throw redirect({ href: "/small-business", statusCode: 308 });
  },
  component: () => null,
});
