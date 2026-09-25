/**
 * Legacy vertical compatibility API.
 *
 * The canonical product topology is now the root-level section registry in
 * src/lib/section-registry.ts. Keep this module only for older callers while
 * they migrate from "vertical" terminology.
 */

import {
  LEGACY_SECTION_ALIASES,
  SECTION_REGISTRY,
  getSectionByPath,
  resolveSectionId,
} from "../lib/section-registry";
import type { VerticalDefinition, VerticalCategory, VerticalStatus } from "./types";

function toVertical(section: (typeof SECTION_REGISTRY)[number]): VerticalDefinition {
  return {
    id: section.id,
    slug: section.id,
    name: section.name,
    shortName: section.shortName,
    tagline: section.tagline,
    description: section.description,
    category: section.category,
    status: section.status,
    executionState: section.executionState,
    route: section.path,
    icon: section.icon,
    primaryCTA: section.primaryCTA,
    enabled: section.enabled,
    capabilities: section.capabilities,
    seo: {
      title: `${section.name} | MailMyPDF`,
      description: section.description,
      canonical: section.path,
      robots: section.status === "live" ? "index,follow" : "noindex,nofollow",
    },
  };
}

export const verticals: VerticalDefinition[] = SECTION_REGISTRY.map(toVertical);

export function getVerticalBySlug(slug: string): VerticalDefinition | undefined {
  const resolved = resolveSectionId(slug);
  return resolved ? verticals.find((vertical) => vertical.id === resolved) : undefined;
}

export function getVerticalByRoute(route: string): VerticalDefinition | undefined {
  const section = getSectionByPath(route);
  return section ? verticals.find((vertical) => vertical.id === section.id) : undefined;
}

export function getVerticalsByCategory(category: VerticalCategory): VerticalDefinition[] {
  return verticals.filter((vertical) => vertical.category === category);
}

export function getVerticalsByStatus(status: VerticalStatus): VerticalDefinition[] {
  return verticals.filter((vertical) => vertical.status === status);
}

export function getNavigationVerticals(): VerticalDefinition[] {
  return verticals.filter((vertical) => vertical.enabled);
}

export function getLiveVerticals(): VerticalDefinition[] {
  return verticals.filter((vertical) => vertical.status === "live");
}

export function shouldIndexVertical(slug: string): boolean {
  return getVerticalBySlug(slug)?.status === "live";
}

export function getVerticalsByCategoryForNav(): Array<{
  category: VerticalCategory;
  verticals: VerticalDefinition[];
}> {
  const categories: VerticalCategory[] = [
    "government",
    "legal",
    "appeals",
    "disputes",
    "housing",
    "professional",
    "business",
  ];

  return categories
    .map((category) => ({
      category,
      verticals: getNavigationVerticals().filter((vertical) => vertical.category === category),
    }))
    .filter((group) => group.verticals.length > 0);
}

export function isVerticalLive(slug: string): boolean {
  return getVerticalBySlug(slug)?.status === "live";
}

/** @deprecated Use LEGACY_SECTION_ALIASES from the section registry. */
export const legacyVerticalAliases = LEGACY_SECTION_ALIASES;
