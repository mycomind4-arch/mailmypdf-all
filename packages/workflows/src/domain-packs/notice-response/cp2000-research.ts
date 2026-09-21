export interface Cp2000ResearchSource {
  id: string;
  title: string;
  url: string;
  publisher: string;
  sourceType: "official_agency" | "official_publication";
  topics: readonly string[];
}

export interface Cp2000ResearchCitation {
  id: string;
  sourceId: string;
  fact: string;
  interpretation: string;
  isSourceStatement: true;
}

export interface Cp2000ResearchPack {
  sources: readonly Cp2000ResearchSource[];
  citations: readonly Cp2000ResearchCitation[];
}

export const CP2000_RESEARCH_SOURCES: readonly Cp2000ResearchSource[] = [
  {
    id: "irs.cp2000-series",
    title: "Understanding your CP2000 series notice",
    url: "https://www.irs.gov/individuals/understanding-your-cp2000-series-notice",
    publisher: "Internal Revenue Service",
    sourceType: "official_agency",
    topics: ["overview", "response_process", "response_deadline"],
  },
  {
    id: "irs.topic-652",
    title: "Topic no. 652, Notice of underreported income — CP2000",
    url: "https://www.irs.gov/taxtopics/tc652",
    publisher: "Internal Revenue Service",
    sourceType: "official_agency",
    topics: ["overview", "response_process", "response_deadline"],
  },
  {
    id: "irs.pub-5181",
    title: "Publication 5181 — Tax Return Reviews By Mail",
    url: "https://www.irs.gov/pub/irs-pdf/p5181.pdf",
    publisher: "Internal Revenue Service",
    sourceType: "official_publication",
    topics: ["review_process", "response_by_mail", "documentation"],
  },
  {
    id: "irs.pub-1",
    title: "Publication 1 — Your Rights as a Taxpayer",
    url: "https://www.irs.gov/pub/irs-pdf/p1.pdf",
    publisher: "Internal Revenue Service",
    sourceType: "official_publication",
    topics: ["taxpayer_rights", "appeal_rights"],
  },
  {
    id: "irs.pub-5",
    title: "Publication 5 — Your Appeal Rights and How to Prepare a Protest",
    url: "https://www.irs.gov/pub/irs-pdf/p5.pdf",
    publisher: "Internal Revenue Service",
    sourceType: "official_publication",
    topics: ["appeal_rights", "protest_process"],
  },
  {
    id: "irs.notice-746",
    title: "Notice 746 — Information About Your Notice, Penalty and Interest",
    url: "https://www.irs.gov/pub/irs-pdf/n746.pdf",
    publisher: "Internal Revenue Service",
    sourceType: "official_publication",
    topics: ["penalties", "interest"],
  },
  {
    id: "irs.pub-594",
    title: "Publication 594 — The IRS Collection Process",
    url: "https://www.irs.gov/pub/irs-pdf/p594.pdf",
    publisher: "Internal Revenue Service",
    sourceType: "official_publication",
    topics: ["collection_process", "non_response"],
  },
  {
    id: "tas.cp2000",
    title: "Taxpayer Advocate Service — Notice CP2000",
    url: "https://www.taxpayeradvocate.irs.gov/notices/cp-2000/",
    publisher: "Taxpayer Advocate Service",
    sourceType: "official_agency",
    topics: ["overview", "taxpayer_assistance"],
  },
] as const;

export const CP2000_RESEARCH_CITATIONS: readonly Cp2000ResearchCitation[] = [
  {
    id: "cp2000-proposed-mismatch",
    sourceId: "irs.cp2000-series",
    fact: "The notice compares third-party income or payment information with the taxpayer's return and explains proposed changes.",
    interpretation: "A CP2000 is a proposed adjustment notice, not proof that the taxpayer's position or the IRS's position is correct.",
    isSourceStatement: true,
  },
  {
    id: "cp2000-printed-date",
    sourceId: "irs.cp2000-series",
    fact: "The taxpayer should reply by the date printed on the notice.",
    interpretation: "The workflow must preserve and confirm the notice's printed response date rather than calculate a substitute.",
    isSourceStatement: true,
  },
  {
    id: "cp2000-supporting-documentation",
    sourceId: "irs.cp2000-series",
    fact: "The notice instructions address whether the taxpayer agrees or disagrees and may call for supporting documentation.",
    interpretation: "Disputed items should be tied to records actually supplied by the user.",
    isSourceStatement: true,
  },
  {
    id: "cp2000-review-process",
    sourceId: "irs.pub-5181",
    fact: "Publication 5181 describes the IRS tax-return review process that includes CP2000 notices.",
    interpretation: "This publication is an authority source for the review and response process, not a source of user-specific facts.",
    isSourceStatement: true,
  },
  {
    id: "cp2000-appeal-rights",
    sourceId: "irs.pub-5",
    fact: "Publication 5 describes appeal rights and protest preparation when a taxpayer disagrees with an IRS determination.",
    interpretation: "Any appeal-rights discussion must remain separate from the factual CP2000 response draft.",
    isSourceStatement: true,
  },
];

export function getCp2000ResearchPack(): Cp2000ResearchPack {
  return {
    sources: CP2000_RESEARCH_SOURCES,
    citations: CP2000_RESEARCH_CITATIONS,
  };
}

export function findCp2000ResearchSource(sourceId: string): Cp2000ResearchSource | undefined {
  return CP2000_RESEARCH_SOURCES.find((source) => source.id === sourceId);
}
