import type {
  VerificationCheckResult,
  VerificationSession,
  VerificationSessionRequest,
  VerifiedIdentity,
} from "./types.js";

export function createVerificationSession(
  request: VerificationSessionRequest,
): Omit<VerificationSession, "id"> {
  if (!request.subject.name.trim()) throw new Error("Verification subject requires a name.");
  if (!request.subject.matterId.trim()) throw new Error("Verification subject requires a matterId.");
  if (request.requiredMethods.length === 0) {
    throw new Error("A verification session requires at least one required method.");
  }
  if (new Set(request.requiredMethods).size !== request.requiredMethods.length) {
    throw new Error("requiredMethods must not contain duplicates.");
  }
  if (request.expiresAt && Date.parse(request.expiresAt) <= Date.parse(request.now)) {
    throw new Error("Verification session expiresAt must be after now.");
  }

  return Object.freeze({
    subject: Object.freeze({ ...request.subject }),
    requiredMethods: Object.freeze([...request.requiredMethods]),
    status: "pending",
    results: Object.freeze([]),
    createdAt: request.now,
    expiresAt: request.expiresAt,
  });
}

function isExpired(session: Pick<VerificationSession, "expiresAt">, now: string): boolean {
  return session.expiresAt !== undefined && Date.parse(now) > Date.parse(session.expiresAt);
}

/**
 * Records one check's outcome. A session becomes "verified" only once every
 * required method has independently passed; any failed required check fails
 * the whole session immediately (a real vendor session is not retried in
 * place — the caller creates a fresh session for another attempt).
 */
export function recordCheckResult(
  session: VerificationSession,
  result: VerificationCheckResult,
): VerificationSession {
  if (session.status !== "pending") {
    throw new Error(`Cannot record a check result on a ${session.status} session.`);
  }
  if (isExpired(session, result.at)) {
    throw new Error("Verification session has expired.");
  }
  if (!session.requiredMethods.includes(result.method)) {
    throw new Error(`Method ${result.method} was not requested for this session.`);
  }
  if (session.results.some((existing) => existing.method === result.method)) {
    throw new Error(`Method ${result.method} already has a recorded result.`);
  }
  if (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1) {
    throw new Error("confidence must be between 0 and 1.");
  }

  const results = Object.freeze([...session.results, Object.freeze({ ...result })]);

  if (!result.passed) {
    return Object.freeze({ ...session, results, status: "failed" });
  }

  const allRequiredPassed = session.requiredMethods.every((method) =>
    results.some((entry) => entry.method === method && entry.passed),
  );

  if (!allRequiredPassed) {
    return Object.freeze({ ...session, results });
  }

  const verifiedIdentity: VerifiedIdentity = Object.freeze({
    name: session.subject.name,
    dateOfBirth: session.subject.dateOfBirth,
    verifiedAt: result.at,
  });

  return Object.freeze({ ...session, results, status: "verified", verifiedIdentity });
}

export function cancelVerificationSession(
  session: VerificationSession,
  reason: string,
  now: string,
): VerificationSession {
  if (session.status !== "pending") {
    throw new Error(`Cannot cancel a ${session.status} session.`);
  }
  return Object.freeze({ ...session, status: isExpired(session, now) ? "expired" : "canceled", cancelReason: reason });
}

export function isIdentityVerified(session: VerificationSession): boolean {
  return session.status === "verified" && session.verifiedIdentity !== undefined;
}

export function assertIdentityVerified(session: VerificationSession): void {
  if (isIdentityVerified(session)) return;
  throw new Error(`Identity verification session is ${session.status}, not verified.`);
}
