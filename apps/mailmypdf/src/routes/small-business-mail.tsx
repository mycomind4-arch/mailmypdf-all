import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";

export const Route = createFileRoute("/small-business-mail")({
  head: () => ({ meta: [{ title: "Small Business Mail | MailMyPDF" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => <ProductFamilyPage product="Small Business Mail" route="/small-business-mail" description="Business correspondence, reminders, demands, and compliance workflows." />,
});
