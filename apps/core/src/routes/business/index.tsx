import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";
export const Route = createFileRoute("/business/")({ component: () => <ProductFamilyPage product="Small Business Mail" route="/business" description="Business correspondence, reminders, demands, and compliance workflows." /> });
