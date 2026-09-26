import type { SectionLandingConfig } from "@mailmypdf/design-system"
import appealMailConfig from "../../../appeal-mail/config"
import benefitsAppealConfig from "../../../benefits-appeal/config"
import claimProofConfig from "../../../claim-proof/config"
import codeEnforcementConfig from "../../../code-enforcement/config"
import disputeMailConfig from "../../../dispute-mail/config"
import immigrationMailConfig from "../../../immigration-mail/config"
import insuranceClaimsConfig from "../../../insurance-claims/config"
import legalDefenseConfig from "../../../legal-defense/config"
import noticeRespondConfig from "../../../notice-respond/config"
import permitReplyConfig from "../../../permit-reply/config"
import privateOfficeConfig from "../../../private-office/config"
import recordsRequestConfig from "../../../records-request/config"
import securedTransactionsConfig from "../../../secured-transactions/config"
import smallBusinessConfig from "../../../small-business/config"
import tenantReplyConfig from "../../../tenant-reply/config"

/**
 * Compatibility projection for the older "vertical" directory UI.
 *
 * Public section copy now lives only in each canonical root section's config.ts.
 * This module adapts those configs to the legacy directory component while the
 * remaining directory routes are migrated to the canonical section UI.
 */
export type PublicVerticalId = Exclude<SectionLandingConfig["id"], "mailmypdf">

export type PublicVerticalCategory = {
  label: string
  terms: ReadonlyArray<string>
}

export type PublicVerticalConfig = {
  id: PublicVerticalId
  path: `/${string}`
  product: string
  verticalKeys: ReadonlyArray<string>
  eyebrow: string
  heroTitle: string
  description: string
  directoryDescription: string
  helperTitle: string
  helperDescription: string
  heroImage: string
  categories: ReadonlyArray<PublicVerticalCategory>
  steps: ReadonlyArray<{ title: string; description: string }>
}

const SECTION_CONFIGS = [
  appealMailConfig,
  benefitsAppealConfig,
  claimProofConfig,
  codeEnforcementConfig,
  disputeMailConfig,
  immigrationMailConfig,
  insuranceClaimsConfig,
  legalDefenseConfig,
  noticeRespondConfig,
  permitReplyConfig,
  privateOfficeConfig,
  recordsRequestConfig,
  securedTransactionsConfig,
  smallBusinessConfig,
  tenantReplyConfig,
] as const satisfies ReadonlyArray<SectionLandingConfig>

const LEGACY_VERTICAL_KEYS: Readonly<Record<PublicVerticalId, ReadonlyArray<string>>> = {
  "appeal-mail": ["appeal"],
  "benefits-appeal": ["benefits"],
  "claim-proof": ["claim"],
  "code-enforcement": ["code-enforcement"],
  "dispute-mail": ["dispute"],
  "immigration-mail": ["immigration"],
  "insurance-claims": ["insurance", "insurance-claims"],
  "legal-defense": ["legal-defense"],
  "notice-respond": ["notice"],
  "permit-reply": ["permit"],
  "private-office": ["private-office"],
  "records-request": ["records"],
  "secured-transactions": ["secured-transactions"],
  "small-business": ["business"],
  "tenant-reply": ["tenant"],
}

const STANDARD_STEPS = [
  {
    title: "Identify the source record",
    description: "Start from the notice, decision, agreement, claim, request, or other document that defines the matter.",
  },
  {
    title: "Organize facts and evidence",
    description: "Keep verified facts, dates, people, amounts, records, and unresolved questions connected to their sources.",
  },
  {
    title: "Prepare and review",
    description: "Build the workflow output from the controlled record and review the exact draft or packet before consequential action.",
  },
  {
    title: "Preserve the record",
    description: "Keep the approved output together with available mailing, submission, tracking, or proof information.",
  },
] as const

function topicTerms(title: string, text: string): string[] {
  const phrases = [title.toLowerCase()]
  const words = (`${title} ${text}`.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? [])
    .filter((term) => term.length >= 4)
  return [...new Set([...phrases, ...words])]
}

function projectSection(config: SectionLandingConfig): PublicVerticalConfig {
  const id = config.id as PublicVerticalId
  return {
    id,
    path: config.path as `/${string}`,
    product: config.name,
    verticalKeys: LEGACY_VERTICAL_KEYS[id],
    eyebrow: config.eyebrow,
    heroTitle: config.heroTitle,
    description: config.heroDescription,
    directoryDescription: config.introText,
    helperTitle: "Choose the workflow that matches the matter.",
    helperDescription: "Start with the source document or situation and use the workflow whose facts, evidence, and requested outcome most closely match the record you need to handle.",
    heroImage: config.heroImage,
    categories: config.topics.map((topic) => ({
      label: topic.title,
      terms: topicTerms(topic.title, topic.text),
    })),
    steps: STANDARD_STEPS,
  }
}

export const PUBLIC_VERTICALS: readonly PublicVerticalConfig[] = SECTION_CONFIGS.map(projectSection)

export function publicVerticalById(id: string | undefined): PublicVerticalConfig | null {
  return PUBLIC_VERTICALS.find((vertical) => vertical.id === id) ?? null
}

export function publicVerticalByPath(path: string): { config: PublicVerticalConfig; kind: "landing" | "directory" } | null {
  const normalized = path.replace(/\/+$/, "") || "/"
  for (const config of PUBLIC_VERTICALS) {
    if (normalized === config.path) return { config, kind: "landing" }
    if (normalized === `${config.path}/workflows`) return { config, kind: "directory" }
  }
  return null
}

export function categoryForWorkflow(config: PublicVerticalConfig, searchableText: string): string {
  const haystack = searchableText.toLowerCase()
  const match = config.categories.find((category) =>
    category.terms.some((term) => haystack.includes(term.toLowerCase())),
  )
  return match?.label ?? "Other workflows"
}
