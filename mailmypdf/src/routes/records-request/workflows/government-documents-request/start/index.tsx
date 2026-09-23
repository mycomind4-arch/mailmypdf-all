// Thin file-route mount for the top-level records-request/workflows/government-documents-request/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import StartComponent from "../../../../../../../records-request/workflows/government-documents-request/start/index"

export const Route = createFileRoute("/records-request/workflows/government-documents-request/start/")({
  component: StartComponent,
})
