import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";
export const Route = createFileRoute("/records/")({ component: () => <ProductFamilyPage product="Records Request" route="/records" description="Records and public-information request workflows." /> });
