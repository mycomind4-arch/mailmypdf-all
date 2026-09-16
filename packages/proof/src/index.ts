import type { PlatformId } from "@mailmypdf/core";

export interface AuditEvent {
  id: PlatformId;
  type: string;
  occurredAt: string;
  actor: "user" | "system" | "ai" | "external";
  subjectId: PlatformId;
  metadata: Record<string, string>;
}

export interface ProofArtifact {
  id: PlatformId;
  kind: "document" | "correspondence" | "attachment" | "receipt" | "tracking" | "delivery" | "other";
  sha256?: string;
  createdAt: string;
  sourceId?: PlatformId;
}

export interface ProofPacket {
  id: PlatformId;
  subjectId: PlatformId;
  artifacts: readonly ProofArtifact[];
  events: readonly AuditEvent[];
  createdAt: string;
}


export interface CustodyEvent {
  timestamp: string;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown>;
  priorEventHash: string | null;
  eventHash: string;
}

export interface AddressVerificationEvidence {
  deliverability: string;
  isDeliverable: boolean;
  standardizedAddress?: Record<string, string | null> | null;
  corrections?: Record<string, { input: string; verified: string }> | null;
  warnings?: readonly string[];
  provider?: string;
  verifiedAt?: string;
}

export function canonicalJSON(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJSON).join(",") + "]";
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    return "{" + Object.keys(object)
      .filter((key) => object[key] !== undefined)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJSON(object[key]))
      .join(",") + "}";
  }
  return JSON.stringify(String(value));
}

function sha256String(value: string): string {
  // Synchronous SHA-256 implementation keeps proof hashing deterministic in
  // Node, Workers, and browser-capable tooling without a node:crypto boundary.
  const bytes = new TextEncoder().encode(value);
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ];
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const rotr = (x:number,n:number)=>(x>>>n)|(x<<(32-n));
  const bitLength=bytes.length*8;
  const paddedLength=Math.ceil((bytes.length+9)/64)*64;
  const padded=new Uint8Array(paddedLength); padded.set(bytes); padded[bytes.length]=0x80;
  const view=new DataView(padded.buffer); view.setUint32(paddedLength-4,bitLength>>>0,false); view.setUint32(paddedLength-8,Math.floor(bitLength/2**32),false);
  const w=new Int32Array(64);
  for(let start=0;start<paddedLength;start+=64){
    for(let i=0;i<16;i++) w[i]=view.getUint32(start+i*4,false);
    for(let i=16;i<64;i++){const s0=rotr(w[i-15],7)^rotr(w[i-15],18)^(w[i-15]>>>3);const s1=rotr(w[i-2],17)^rotr(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)|0;}
    let [a,b,c,d,e,f,g,h]=H;
    for(let i=0;i<64;i++){const S1=rotr(e,6)^rotr(e,11)^rotr(e,25);const ch=(e&f)^(~e&g);const t1=(h+S1+ch+K[i]+w[i])|0;const S0=rotr(a,2)^rotr(a,13)^rotr(a,22);const maj=(a&b)^(a&c)^(b&c);const t2=(S0+maj)|0;h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;}
    H[0]=(H[0]+a)|0;H[1]=(H[1]+b)|0;H[2]=(H[2]+c)|0;H[3]=(H[3]+d)|0;H[4]=(H[4]+e)|0;H[5]=(H[5]+f)|0;H[6]=(H[6]+g)|0;H[7]=(H[7]+h)|0;
  }
  return H.map((word)=>(word>>>0).toString(16).padStart(8,"0")).join("");
}

export function hashRecord(content: Record<string, unknown>): string {
  return sha256String(canonicalJSON(content));
}

export function hashCustodyEvent(input: {
  priorEventHash: string | null;
  timestamp: string;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown>;
}): string {
  return hashRecord({
    priorEventHash: input.priorEventHash,
    timestamp: input.timestamp,
    eventType: input.eventType,
    description: input.description,
    metadata: input.metadata ?? null,
  });
}

export function createCustodyEvent(input: {
  priorEventHash: string | null;
  timestamp?: string;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown>;
}): CustodyEvent {
  const timestamp = input.timestamp ?? new Date().toISOString();
  if (!input.eventType.trim() || !input.description.trim()) throw new Error("Custody event type and description are required");
  const eventHash = hashCustodyEvent({ ...input, timestamp });
  return {
    timestamp,
    eventType: input.eventType,
    description: input.description,
    metadata: input.metadata,
    priorEventHash: input.priorEventHash,
    eventHash,
  };
}

export function verifyCustodyEvent(event: CustodyEvent): boolean {
  return event.eventHash === hashCustodyEvent({
    priorEventHash: event.priorEventHash,
    timestamp: event.timestamp,
    eventType: event.eventType,
    description: event.description,
    metadata: event.metadata,
  });
}

export function verifyCustodyChain(events: readonly CustodyEvent[]): {
  valid: boolean;
  brokenAt: number | null;
} {
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    const expectedPrior = index === 0 ? null : events[index - 1]!.eventHash;
    if (event.priorEventHash !== expectedPrior || !verifyCustodyEvent(event)) {
      return { valid: false, brokenAt: index };
    }
  }
  return { valid: true, brokenAt: null };
}

export interface VerifiableProofBundle {
  subjectId: string;
  documentSha256: string;
  mailingId?: string;
  trackingNumber?: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  addressVerification?: AddressVerificationEvidence | null;
  custodyChain: readonly CustodyEvent[];
  metadata?: Record<string, unknown>;
  bundleSha256: string;
}

export function createVerifiableProofBundle(
  content: Omit<VerifiableProofBundle, "bundleSha256">,
): VerifiableProofBundle {
  if (!/^[0-9a-f]{64}$/i.test(content.documentSha256)) throw new Error("Proof bundle requires a valid document SHA-256");
  const chain = verifyCustodyChain(content.custodyChain);
  if (!chain.valid) throw new Error(`Proof custody chain is broken at event ${chain.brokenAt}`);
  return { ...content, bundleSha256: hashRecord(content as unknown as Record<string, unknown>) };
}

export function verifyProofBundle(bundle: VerifiableProofBundle): boolean {
  const { bundleSha256, ...content } = bundle;
  return verifyCustodyChain(bundle.custodyChain).valid &&
    bundleSha256 === hashRecord(content as unknown as Record<string, unknown>);
}

export function computeResponseWindowEnds(sentAt: string | null, days: number | null): string | null {
  if (!sentAt || days == null) return null;
  const sent = Date.parse(sentAt);
  if (!Number.isFinite(sent) || !Number.isFinite(days) || days <= 0) return null;
  return new Date(sent + days * 86_400_000).toISOString();
}


export interface MatterArchiveManifest {
  matterId: string;
  workflowId: string;
  finalDocumentSha256: string;
  artifactIds: readonly string[];
  proofBundleSha256?: string | null;
  completedAt: string;
  createdAt: string;
  archiveSha256: string;
}

export function createMatterArchiveManifest(
  input: Omit<MatterArchiveManifest, "archiveSha256">,
): MatterArchiveManifest {
  if (!input.matterId.trim() || !input.workflowId.trim()) throw new Error("Matter archive identity is required");
  if (!/^[0-9a-f]{64}$/i.test(input.finalDocumentSha256)) throw new Error("Matter archive requires final document SHA-256");
  if (input.proofBundleSha256 && !/^[0-9a-f]{64}$/i.test(input.proofBundleSha256)) {
    throw new Error("Matter archive proof hash is invalid");
  }
  const normalized = {
    ...input,
    artifactIds: [...new Set(input.artifactIds)].sort(),
  };
  return {
    ...normalized,
    archiveSha256: hashRecord(normalized as unknown as Record<string, unknown>),
  };
}

export function verifyMatterArchiveManifest(manifest: MatterArchiveManifest): boolean {
  const { archiveSha256, ...content } = manifest;
  return archiveSha256 === hashRecord(content as unknown as Record<string, unknown>);
}


export interface MatterArchiveArtifact {
  id: string;
  kind: ProofArtifact["kind"];
  sha256: string;
  sizeBytes?: number;
}

export interface VerifiedMatterArchiveManifest {
  matterId: string;
  workflowId: string;
  finalDocumentSha256: string;
  artifacts: readonly MatterArchiveArtifact[];
  proofBundleSha256?: string | null;
  completedAt: string;
  createdAt: string;
  archiveSha256: string;
}

function normalizeArchiveArtifacts(
  artifacts: readonly MatterArchiveArtifact[],
): MatterArchiveArtifact[] {
  const byId = new Map<string, MatterArchiveArtifact>();

  for (const artifact of artifacts) {
    if (!artifact.id.trim()) throw new Error("Archive artifact id is required");
    if (!/^[0-9a-f]{64}$/i.test(artifact.sha256)) {
      throw new Error(`Archive artifact ${artifact.id} requires a valid SHA-256`);
    }
    if (
      artifact.sizeBytes !== undefined &&
      (!Number.isSafeInteger(artifact.sizeBytes) || artifact.sizeBytes < 0)
    ) {
      throw new Error(`Archive artifact ${artifact.id} has invalid sizeBytes`);
    }

    const existing = byId.get(artifact.id);
    if (
      existing &&
      (existing.sha256 !== artifact.sha256 ||
        existing.kind !== artifact.kind ||
        existing.sizeBytes !== artifact.sizeBytes)
    ) {
      throw new Error(
        `Archive artifact ${artifact.id} was supplied with conflicting metadata`,
      );
    }
    byId.set(artifact.id, { ...artifact });
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function createVerifiedMatterArchiveManifest(
  input: Omit<VerifiedMatterArchiveManifest, "archiveSha256">,
): VerifiedMatterArchiveManifest {
  if (!input.matterId.trim() || !input.workflowId.trim()) {
    throw new Error("Matter archive identity is required");
  }
  if (!/^[0-9a-f]{64}$/i.test(input.finalDocumentSha256)) {
    throw new Error("Matter archive requires final document SHA-256");
  }
  if (
    input.proofBundleSha256 &&
    !/^[0-9a-f]{64}$/i.test(input.proofBundleSha256)
  ) {
    throw new Error("Matter archive proof hash is invalid");
  }

  const normalized = {
    ...input,
    artifacts: normalizeArchiveArtifacts(input.artifacts),
  };

  return {
    ...normalized,
    archiveSha256: hashRecord(
      normalized as unknown as Record<string, unknown>,
    ),
  };
}

export function verifyVerifiedMatterArchiveManifest(
  manifest: VerifiedMatterArchiveManifest,
): boolean {
  try {
    const { archiveSha256, ...content } = manifest;
    const normalized = {
      ...content,
      artifacts: normalizeArchiveArtifacts(content.artifacts),
    };
    return (
      archiveSha256 ===
      hashRecord(normalized as unknown as Record<string, unknown>)
    );
  } catch {
    return false;
  }
}
