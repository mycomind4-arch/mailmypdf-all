import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";

export const Route = createFileRoute("/immigration")({
  head: () => ({ meta: [{ title: "Immigration Mail | MailMyPDF" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => <ProductFamilyPage product="Immigration Mail" route="/immigration" description="Immigration notices, evidence packages, records requests, and explanation letters." />,
});
