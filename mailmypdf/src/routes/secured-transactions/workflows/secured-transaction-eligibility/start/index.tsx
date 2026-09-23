// Thin file-route mount for the top-level secured-transactions/workflows/secured-transaction-eligibility/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { SecuredTransactionEligibilityIntake } from "../../../../../../../secured-transactions/workflows/secured-transaction-eligibility/start/EligibilityIntake"

export const Route = createFileRoute("/secured-transactions/workflows/secured-transaction-eligibility/start/")({
  component: SecuredTransactionEligibilityIntake,
})
