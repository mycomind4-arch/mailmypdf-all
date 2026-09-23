// Thin file-route mount for the top-level records-request/workflows/public-records-request/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import StartComponent from "../../../../../../../records-request/workflows/public-records-request/start/index"

export const Route = createFileRoute("/records-request/workflows/public-records-request/start/")({
  component: StartComponent,
})
