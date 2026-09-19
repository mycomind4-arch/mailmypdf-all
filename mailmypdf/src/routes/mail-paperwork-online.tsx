import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mail-paperwork-online")({
  beforeLoad: () => {
    throw redirect({ href: "/send-documents-by-mail-online", statusCode: 308 });
  },
  component: () => null,
});
