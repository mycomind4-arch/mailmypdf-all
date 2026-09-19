import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/print-and-post-documents-online")({
  beforeLoad: () => {
    throw redirect({ href: "/print-and-mail-pdf-online", statusCode: 308 });
  },
  component: () => null,
});
