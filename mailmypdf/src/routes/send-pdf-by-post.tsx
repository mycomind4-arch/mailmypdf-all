import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/send-pdf-by-post")({
  beforeLoad: () => {
    throw redirect({ href: "/print-and-mail-pdf-online", statusCode: 308 });
  },
  component: () => null,
});
