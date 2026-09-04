import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";

export const Route = createFileRoute("/notice-response")({
  head: () => ({ meta: [{ title: "Notice Respond | MailMyPDF" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => <ProductFamilyPage product="Notice Respond" route="/notice-response" description="Official notices, agency actions, summonses, and formal responses." />,
});
