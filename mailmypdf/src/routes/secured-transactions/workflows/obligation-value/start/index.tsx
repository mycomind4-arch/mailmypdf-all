// Thin file-route mount for the top-level secured-transactions/workflows/obligation-value/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { ObligationValueIntake } from "../../../../../../../secured-transactions/workflows/obligation-value/start/ObligationValueIntake"

export const Route = createFileRoute("/secured-transactions/workflows/obligation-value/start/")({
  component: ObligationValueIntake,
})
