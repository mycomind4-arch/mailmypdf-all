import { createFileRoute } from "@tanstack/react-router";
import { NameCapacityIntake } from "./NameCapacityIntake";

export const Route = createFileRoute("/secured-transactions/workflows/name-capacity-resolution/start/")({
  component: NameCapacityIntake,
});

export default NameCapacityIntake;
