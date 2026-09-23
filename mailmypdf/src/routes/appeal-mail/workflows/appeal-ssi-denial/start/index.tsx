// Thin file-route mount for the top-level appeal-mail/workflows/appeal-ssi-denial/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import SsiDenialWorkflow from "../../../../../../../appeal-mail/workflows/appeal-ssi-denial/start/index"

export const Route = createFileRoute("/appeal-mail/workflows/appeal-ssi-denial/start/")({
  component: SsiDenialWorkflow,
})
