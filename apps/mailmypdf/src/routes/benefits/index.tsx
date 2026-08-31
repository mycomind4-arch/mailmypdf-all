import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";
export const Route = createFileRoute("/benefits/")({ component: () => <ProductFamilyPage product="Benefits Appeal" route="/benefits" description="Benefits denials, reconsideration, documentation, and review preparation." /> });
