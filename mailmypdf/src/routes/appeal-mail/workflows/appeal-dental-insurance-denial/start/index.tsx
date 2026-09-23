// Thin file-route mount for the top-level appeal-mail/workflows/appeal-dental-insurance-denial/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import StartComponent from "../../../../../../../appeal-mail/workflows/appeal-dental-insurance-denial/start/index"

export const Route = createFileRoute("/appeal-mail/workflows/appeal-dental-insurance-denial/start/")({
  component: StartComponent,
})
