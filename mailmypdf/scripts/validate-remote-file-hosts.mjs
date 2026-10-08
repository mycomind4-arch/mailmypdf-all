/**
 * Validate domain-only host allowlists for temporary assistant attachments.
 * This is a configuration gate; runtime ingress separately validates all
 * individual URLs and every redirect hop.
 */
export function validateTrustedRemoteFileHosts(value) {
  const entries = typeof value === "string" ? value.split(",").map((x) => x.trim()) : [];
  if (entries.length === 0 || entries.some((host) => !host)) return { ok: false, count: 0 };

  // ASCII DNS name, optional one-label wildcard, and at least one dot.
  const fqdn = /^(?:\*\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
  const valid = entries.every((raw) => {
    const host = raw.toLowerCase();
    const suffix = host.startsWith("*.") ? host.slice(2) : host;
    return fqdn.test(host) &&
      !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(suffix) &&
      !/\.(?:local|localhost|internal|invalid|test|home|lan)$/i.test(suffix) &&
      !(host.startsWith("*.") && suffix.split(".").length < 2);
  });
  return { ok: valid, count: valid ? entries.length : 0 };
}
