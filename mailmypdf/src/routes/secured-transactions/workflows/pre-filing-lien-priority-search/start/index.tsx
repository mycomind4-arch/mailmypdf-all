// Thin file-route mount for the top-level secured-transactions/workflows/pre-filing-lien-priority-search/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { SecuredTransactionReviewIntake } from "../../../../../../../secured-transactions/shared/components/SecuredTransactionReviewIntake"

export const Route = createFileRoute("/secured-transactions/workflows/pre-filing-lien-priority-search/start/")({
  component: () => <SecuredTransactionReviewIntake workflowId="pre-filing-lien-priority-search" />,
})
