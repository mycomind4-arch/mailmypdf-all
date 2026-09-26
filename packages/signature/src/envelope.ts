import type {
  SignatureEnvelope,
  SignatureEnvelopeEvent,
  SignatureFieldLocation,
  SignatureRequest,
  SignerRecord,
} from "./types.js";

function assertSha256(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error(`${label} requires a SHA-256 hex hash.`);
}

function assertLocation(field: SignatureFieldLocation): void {
  if (
    !Number.isInteger(field.page) ||
    field.page < 1 ||
    ![field.x, field.y, field.width, field.height].every(Number.isFinite) ||
    field.width <= 0 ||
    field.height <= 0
  ) {
    throw new Error("Signature field location requires page >= 1 and finite positive dimensions.");
  }
}

export function createSignatureRequest(input: {
  documentId: string;
  documentSha256: string;
  signers: readonly { signer: { id: string; name: string; email: string; role?: string }; field: SignatureFieldLocation }[];
  now: string;
  expiresAt?: string;
}): SignatureRequest {
  if (!input.documentId.trim()) throw new Error("Signature request requires documentId.");
  assertSha256(input.documentSha256, "Signature request");
  if (input.signers.length === 0) throw new Error("Signature request requires at least one signer.");

  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  for (const entry of input.signers) {
    if (!entry.signer.id.trim()) throw new Error("Every signer requires a stable id.");
    if (seenIds.has(entry.signer.id)) throw new Error(`Duplicate signer id: ${entry.signer.id}`);
    seenIds.add(entry.signer.id);
    if (!entry.signer.email.trim()) throw new Error(`Signer ${entry.signer.id} requires an email.`);
    if (seenEmails.has(entry.signer.email.toLowerCase())) {
      throw new Error(`Duplicate signer email: ${entry.signer.email}`);
    }
    seenEmails.add(entry.signer.email.toLowerCase());
    assertLocation(entry.field);
  }

  if (input.expiresAt && Date.parse(input.expiresAt) <= Date.parse(input.now)) {
    throw new Error("Signature request expiresAt must be after now.");
  }

  const signers: SignerRecord[] = input.signers.map((entry) =>
    Object.freeze({
      signer: Object.freeze({ ...entry.signer }),
      field: Object.freeze({ ...entry.field }),
      status: "pending" as const,
    }),
  );

  return Object.freeze({
    documentId: input.documentId,
    documentSha256: input.documentSha256,
    signers: Object.freeze(signers),
    createdAt: input.now,
    expiresAt: input.expiresAt,
  });
}

function isExpired(envelope: Pick<SignatureEnvelope, "expiresAt">, now: string): boolean {
  return envelope.expiresAt !== undefined && Date.parse(now) > Date.parse(envelope.expiresAt);
}

export function applySignatureEvent(
  envelope: SignatureEnvelope,
  event: SignatureEnvelopeEvent,
): SignatureEnvelope {
  if (envelope.status !== "pending") {
    throw new Error(`Cannot apply an event to a ${envelope.status} envelope.`);
  }
  if (event.type !== "expired" && isExpired(envelope, event.at)) {
    throw new Error("Envelope has expired; no further signature events are allowed.");
  }

  const events = Object.freeze([...envelope.events, Object.freeze({ ...event })]);

  switch (event.type) {
    case "created":
    case "viewed":
      return Object.freeze({ ...envelope, events });

    case "voided":
      return Object.freeze({ ...envelope, status: "voided", events });

    case "expired":
      return Object.freeze({ ...envelope, status: "expired", events });

    case "declined": {
      const target = envelope.signers.find((entry) => entry.signer.id === event.signerId);
      if (!target) throw new Error(`Unknown signer: ${event.signerId}`);
      return Object.freeze({ ...envelope, status: "declined", events });
    }

    case "signed": {
      const target = envelope.signers.find((entry) => entry.signer.id === event.signerId);
      if (!target) throw new Error(`Unknown signer: ${event.signerId}`);
      if (target.status !== "pending") throw new Error(`Signer ${event.signerId} is already ${target.status}.`);
      if (!event.consent.intentToSign || !event.consent.consentedToElectronicRecords) {
        throw new Error(`Signer ${event.signerId} did not affirmatively consent to sign electronically.`);
      }

      const signers = envelope.signers.map((entry) =>
        entry.signer.id === event.signerId
          ? Object.freeze({
              ...entry,
              status: "signed" as const,
              consent: Object.freeze({ ...event.consent }),
              signedAt: event.at,
            })
          : entry,
      );

      const allSigned = signers.every((entry) => entry.status === "signed");
      return Object.freeze({
        ...envelope,
        signers: Object.freeze(signers),
        events,
        status: allSigned ? "completed" : "pending",
        completedAt: allSigned ? event.at : undefined,
      });
    }
  }
}

export function isSignatureEnvelopeComplete(envelope: SignatureEnvelope): boolean {
  return envelope.status === "completed" && envelope.signers.every((entry) => entry.status === "signed");
}

export function assertSignatureComplete(envelope: SignatureEnvelope): void {
  if (isSignatureEnvelopeComplete(envelope)) return;
  if (envelope.status === "pending") {
    const missing = envelope.signers.filter((entry) => entry.status !== "signed").map((entry) => entry.signer.id);
    throw new Error(`Signature envelope is not complete; missing signers: ${missing.join(", ")}.`);
  }
  throw new Error(`Signature envelope is ${envelope.status}, not completed.`);
}
