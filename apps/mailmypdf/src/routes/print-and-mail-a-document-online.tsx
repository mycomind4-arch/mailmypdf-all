import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/print-and-mail-a-document-online")({
  beforeLoad: () => {
    throw redirect({ href: "/print-and-mail-pdf-online", statusCode: 308 });
  },
  component: () => null,
});
