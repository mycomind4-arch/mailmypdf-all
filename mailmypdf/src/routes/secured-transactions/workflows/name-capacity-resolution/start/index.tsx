// Thin file-route mount for the top-level secured-transactions/workflows/name-capacity-resolution/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { NameCapacityIntake } from "../../../../../../../secured-transactions/workflows/name-capacity-resolution/start/NameCapacityIntake"

export const Route = createFileRoute("/secured-transactions/workflows/name-capacity-resolution/start/")({
  component: NameCapacityIntake,
})
