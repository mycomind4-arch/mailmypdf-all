import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mail-a-pdf")({
  beforeLoad: () => {
    throw redirect({ to: "https://mailmypdf-etc.pages.dev/mail-a-pdf" });
  },
  component: () => null,
});
