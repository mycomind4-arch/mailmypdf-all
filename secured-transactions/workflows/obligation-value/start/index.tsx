import { createFileRoute } from "@tanstack/react-router";
import { ObligationValueIntake } from "./ObligationValueIntake";

export const Route = createFileRoute("/secured-transactions/workflows/obligation-value/start/")({
  component: ObligationValueIntake,
});

export default ObligationValueIntake;
