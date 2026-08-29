/* Ecosystem certification ledger: metadata only; sibling repos are not executed here. */
export type EcosystemStatus = "catalog" | "domain-ready" | "executable" | "gold";
export type EcosystemCertification = {
  repo: string; workflow: string;
  engine: "document-action" | "dispute" | "records" | "appeal" | "jurisdictional";
  status: EcosystemStatus;
  executableCapabilities: readonly string[];
  blockedBy: readonly string[];
  evidence: readonly string[];
};

export const ECOSYSTEM_CERTIFICATIONS: readonly EcosystemCertification[] = [
  { repo:"notice-respond", workflow:"cp2000-response", engine:"document-action", status:"domain-ready", executableCapabilities:["classification","extraction","deadlines","discrepancies","evidence","research","strategy","draft","validation","review","approval"], blockedBy:["CP2000 UI still needs explicit approval affordance wired to approveWorkflow","MailingFunnel calls /api/mail/response but no matching route is registered in routeTree","deployed provider/path certification"], evidence:["strict sequential runtime gate","runtime transition regression suite","CP2000 gold-standard analysis pipeline","document-extraction gate","provider submission is fail-closed when endpoint is unavailable"] },
  { repo:"appeal-mail", workflow:"appeal-workflows", engine:"appeal", status:"domain-ready", executableCapabilities:["document-classification","fact-extraction","deadline-analysis","evidence-analysis","contradiction-analysis","drafting","draft-validation","readiness-review"], blockedBy:["remaining appeal workflows still need production factory wiring","production submission/tracking/proof certification","deployed-path verification","CI has not yet reported checks for the latest hardening commits"], evidence:["factory capability gate","pack-backed capability resolution","denied-claim production route now imports insurance pack and constructs/gates workflow before render","production factory registration regression","Gold gate derives from factory executable capabilities","factory regression tests","customer UI derives executable status from runtime pack registration","Stripe checkout enforces owner-scoped isReadyToMail","provider rejects unknown statuses and missing IDs","provider status mapper regression tests","mailed/delivered persistence now requires provider order, mailing timestamp, and provider-backed proof status"] },
  { repo:"dispute-mail", workflow:"credit-report", engine:"dispute", status:"domain-ready", executableCapabilities:["classification","extraction","evidence","strategy","validation","approval","mailing","tracking","proofAudit"], blockedBy:["actual runtime wiring of approval/submission predicates","live payment/fulfillment path","deployed tracking/proof","remote CI verification"], evidence:["credit-report domain analyzer","evidence/finding blocking predicates","consequential submission regression gates","credit-report UI explicitly remains preparation-only and fail-closed"] },
  { repo:"dispute-mail", workflow:"debt-validation,billing-error,unauthorized-charge", engine:"dispute", status:"catalog", executableCapabilities:[], blockedBy:["dedicated domain packs and executable analysis not yet implemented"], evidence:["explicit partial/catalog lifecycle metadata"] },
  { repo:"immigration-mail", workflow:"immigration-response", engine:"document-action", status:"domain-ready", executableCapabilities:["document","facts","deadlines","evidence","authority","strategy","draft","validation","review","approval"], blockedBy:["checkout has no verified Stripe/provider submission path","no dedicated production mailing API route is currently present","deployed fulfillment certification","remote CI verification"], evidence:["document-understanding","preflight","review/approval state model","draft-only mailing helper fails closed","required facts and unresolved placeholders now block preflight readiness with regression coverage"] },
  { repo:"mailmypdf-smallbusiness", workflow:"business-workflows", engine:"document-action", status:"domain-ready", executableCapabilities:["trigger","document","validation","approval","mailing","tracking","proof","archive"], blockedBy:["Gold runner is not referenced by production executor","persistent production storage","authenticated scheduling API","live MailMyPDF credentials","carrier webhooks","permanent proof storage","team permissions","deployed smoke certification"], evidence:["Trigger.dev durable execution boundary","approval-before-send certification","evidence-bearing Gold runner","runner usage audit","MailMyPDF provider response schema validation and mail-job correlation checks","provider acceptance separated from proof-complete mailing events","approval actor must hold request requiredRole","rejection actor/reason provenance enforced","signed webhook events now align with internal event type contract"] },
  { repo:"gov-reply", workflow:"government-response", engine:"document-action", status:"domain-ready", executableCapabilities:["receive","understand","deadline","evidence","strategy","response","review","authorization","submission","tracking","proof"], blockedBy:["Gold runner not referenced by production executor","actual persistence/execution runtime","MailMyPDF fulfillment integration","deployed tracking/proof","live CI verification"], evidence:["evidence-bearing Gold runner","source-grounded AI analysis worker","Gold regression tests","runner usage audit"] },
  { repo:"code-enforcement", workflow:"code-enforcement-response", engine:"jurisdictional", status:"domain-ready", executableCapabilities:["secure-ingest","classify","extract","timeline","evidence","discrepancies","strategy","draft","validate","review","authorization","submit","track","proof"], blockedBy:["Gold runner not referenced by production executor","actual domain runtime wiring","property/jurisdiction infrastructure","MailMyPDF fulfillment","deployed verification"], evidence:["evidence-bearing Gold runner","Gold regression tests","runner usage audit"] },
  { repo:"records-requests", workflow:"records-request", engine:"records", status:"executable", executableCapabilities:["validation","review","approval","PDF rendering","SHA-256 attestation","idempotent submission","tracking","proof callback"], blockedBy:["real D1 provisioning","live MailMyPDF credentials","deployed integration test","authenticated approval resolver installation in deployment","production webhook registration"], evidence:["D1-compatible repository","database lifecycle constraints","attested server-side PDF","mandatory request-idempotency key at fulfillment boundary","incomplete provider responses rejected","HMAC callback verification","approval and submission identities bound to an authenticated principal","resolver errors fail closed with regression coverage"] },
  { repo:"permit-response", workflow:"permit-response", engine:"jurisdictional", status:"domain-ready", executableCapabilities:["permit-specific requirements","evidence mapping","authority checks"], blockedBy:["shared Code Enforcement runtime boundary","actual execution path","fulfillment/tracking/proof"], evidence:["permit-specific domain contract and tests","evidence provenance gate","authoritative-source validation gate"] },
  { repo:"benefits-appeal", workflow:"benefits-appeal", engine:"appeal", status:"domain-ready", executableCapabilities:["issue extraction","evidence gating","authority checks","appeal validation"], blockedBy:["shared Appeal Mail/FairProcess runtime boundary","actual execution path","filing/mail/proof integration"], evidence:["benefits-specific contract and tests","supported/draft-ready issues now require evidence provenance"] },
  { repo:"debt-defense", workflow:"debt-defense", engine:"dispute", status:"catalog", executableCapabilities:[], blockedBy:["dedicated repo contains architecture/SEO decisions only","must first validate reuse inside Dispute Mail"], evidence:["execution decision explicitly defers implementation until reuse is proven"] },
  { repo:"tenant-reply", workflow:"tenant-reply", engine:"document-action", status:"catalog", executableCapabilities:[], blockedBy:["planned vertical; dedicated repo contains architecture/SEO decisions only","shared infrastructure runtime not connected"], evidence:["execution decision explicitly defers implementation"] },
  { repo:"insurance-claims", workflow:"insurance-claims", engine:"document-action", status:"catalog", executableCapabilities:[], blockedBy:["planned vertical","current repo is primarily UI/workflow catalog","shared intelligence and fulfillment runtime not connected"], evidence:["execution decision explicitly defers implementation"] },
] as const;

export function getEcosystemCertification(repo:string, workflow:string):EcosystemCertification|undefined { return ECOSYSTEM_CERTIFICATIONS.find(e=>e.repo===repo&&e.workflow===workflow); }
export function isEcosystemExecutable(entry:EcosystemCertification):boolean { return entry.status === "executable" || entry.status === "gold"; }
export function isEcosystemGold(entry:EcosystemCertification):boolean { return entry.status === "gold" && entry.blockedBy.length === 0; }

export type CertificationInvariant = {
  repo: string;
  workflow: string;
  valid: boolean;
  reasons: string[];
};

/**
 * Validate the ledger itself. This prevents certification metadata from
 * becoming less trustworthy than the underlying workflow evidence.
 */
export function validateEcosystemCertificationLedger(
  entries: readonly EcosystemCertification[] = ECOSYSTEM_CERTIFICATIONS,
): CertificationInvariant[] {
  return entries.map((entry) => {
    const reasons: string[] = [];
    if (entry.status === "gold" && entry.blockedBy.length > 0) {
      reasons.push("Gold certification cannot have unresolved blockers");
    }
    if (isEcosystemExecutable(entry) && entry.evidence.length === 0) {
      reasons.push("Executable certification requires evidence");
    }
    if (entry.status === "catalog" && entry.executableCapabilities.length > 0) {
      reasons.push("Catalog entries cannot claim executable capabilities");
    }
    return {
      repo: entry.repo,
      workflow: entry.workflow,
      valid: reasons.length === 0,
      reasons,
    };
  });
}
