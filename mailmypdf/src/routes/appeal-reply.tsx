import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/appeal-reply")({
  beforeLoad: () => {
    throw redirect({ href: "/appeal-mail", statusCode: 308 });
  },
  component: () => null,
});
