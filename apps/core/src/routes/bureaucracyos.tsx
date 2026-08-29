import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * BureaucracyOS is permanently retired.
 * Redirect to /products (the canonical ecosystem catalog).
 */
export const Route = createFileRoute("/bureaucracyos")({
  beforeLoad: () => {
    throw redirect({ to: "/products" });
  },
  component: () => null,
});
