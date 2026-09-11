import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/start")({
  beforeLoad: ({ search }) => {
    const returnTo = (search as { returnTo?: string })?.returnTo;
    if (returnTo) {
      throw redirect({ to: "/auth", search: { redirect: returnTo } });
    }
    throw redirect({ to: "/ecosystem" });
  },
  component: () => null,
});
