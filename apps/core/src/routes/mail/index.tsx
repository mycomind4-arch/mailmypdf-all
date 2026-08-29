import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";
export const Route = createFileRoute("/mail/")({ component: () => <ProductFamilyPage product="MailMyPDF" route="/mail" description="Core document and letter mailing workflows." /> });
