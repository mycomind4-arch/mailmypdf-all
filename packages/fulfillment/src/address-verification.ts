export interface PostalAddress {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal: string;
  country?: string;
}

export type AddressValidationLevel =
  | "deliverable"
  | "deliverable_missing_unit"
  | "deliverable_unnecessary_unit"
  | "undeliverable"
  | "missing_information"
  | "provider_unavailable";

export interface AddressCorrections {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal?: string;
}

export interface AddressValidationResult {
  level: AddressValidationLevel;
  isDeliverable: boolean;
  warnings: string[];
  corrections?: AddressCorrections | null;
  provider?: string;
}

export interface AddressVerifier {
  readonly name: string;
  verify(address: PostalAddress): Promise<AddressValidationResult>;
}

export function validatePostalAddressShape(address: PostalAddress): AddressValidationResult | null {
  for (const field of ["name", "line1", "city", "state", "postal"] as const) {
    if (!String(address[field] ?? "").trim()) {
      return {
        level: "missing_information",
        isDeliverable: false,
        warnings: [`Missing required field: ${field}`],
      };
    }
  }

  const warnings: string[] = [];
  if ((address.country ?? "US").toUpperCase() === "US") {
    if (!/^\d{5}(-\d{4})?$/.test(address.postal.trim())) {
      warnings.push("US ZIP code should contain 5 digits or ZIP+4");
    }
    if (!/^[A-Za-z]{2}$/.test(address.state.trim())) {
      warnings.push("US state should be a 2-letter abbreviation");
    }
  }

  return warnings.length
    ? { level: "missing_information", isDeliverable: true, warnings }
    : null;
}

export async function verifyMailingAddresses(
  recipient: PostalAddress,
  sender: PostalAddress,
  verifier: AddressVerifier,
): Promise<{
  recipient: AddressValidationResult;
  sender: AddressValidationResult;
  shouldBlock: boolean;
}> {
  const [recipientResult, senderResult] = await Promise.all([
    verifier.verify(recipient),
    verifier.verify(sender),
  ]);

  return {
    recipient: recipientResult,
    sender: senderResult,
    shouldBlock:
      recipientResult.level === "undeliverable" ||
      (!recipientResult.isDeliverable && recipientResult.level !== "provider_unavailable"),
  };
}

export interface LobAddressVerifierOptions {
  apiKey: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Reusable Lob US-address verifier.
 * Provider outages remain advisory, but explicit undeliverable/missing verdicts fail closed.
 */
export function createLobAddressVerifier(options: LobAddressVerifierOptions): AddressVerifier {
  if (!options.apiKey.trim()) throw new Error("Lob API key is required");

  const fetchImpl = options.fetchImpl ?? fetch;
  const base = (options.apiBaseUrl ?? "https://api.lob.com/v1").replace(/\/$/, "");
  const timeoutMs = options.timeoutMs ?? 10_000;

  return {
    name: "lob",

    async verify(address: PostalAddress): Promise<AddressValidationResult> {
      const shape = validatePostalAddressShape(address);
      if (shape && !shape.isDeliverable) return shape;

      if ((address.country ?? "US").toUpperCase() !== "US") {
        return {
          level: "provider_unavailable",
          isDeliverable: true,
          warnings: ["Lob US verification only supports US addresses"],
          provider: "lob",
        };
      }

      const warnings = [...(shape?.warnings ?? [])];
      const form = new URLSearchParams();
      form.set("address[line1]", address.line1);
      if (address.line2) form.set("address[line2]", address.line2);
      form.set("address[city]", address.city);
      form.set("address[state]", address.state);
      form.set("address[zip]", address.postal.trim());

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(`${base}/us_verifications`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${globalThis.btoa(`${options.apiKey}:`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: form.toString(),
          signal: controller.signal,
        });

        if (response.status === 422) {
          return {
            level: "missing_information",
            isDeliverable: false,
            warnings: [...warnings, "Address could not be verified"],
            provider: "lob",
          };
        }

        if (!response.ok) {
          return {
            level: "provider_unavailable",
            isDeliverable: true,
            warnings: [...warnings, `Lob verification unavailable (HTTP ${response.status})`],
            provider: "lob",
          };
        }

        const payload = (await response.json()) as {
          deliverability?: string;
          address?: {
            address_line1?: string;
            address_line2?: string;
            address_city?: string;
            address_state?: string;
            address_zip?: string;
          } | null;
        };

        const rawLevel = payload.deliverability ?? "missing_information";
        const allowed: AddressValidationLevel[] = [
          "deliverable",
          "deliverable_missing_unit",
          "deliverable_unnecessary_unit",
          "undeliverable",
          "missing_information",
        ];
        const level = allowed.includes(rawLevel as AddressValidationLevel)
          ? (rawLevel as AddressValidationLevel)
          : "missing_information";

        const isDeliverable = [
          "deliverable",
          "deliverable_missing_unit",
          "deliverable_unnecessary_unit",
        ].includes(level);

        const corrections: AddressCorrections = {};
        const verified = payload.address;

        if (verified?.address_line1 && verified.address_line1 !== address.line1) {
          corrections.line1 = verified.address_line1;
        }
        if (
          verified?.address_line2 &&
          verified.address_line2 !== (address.line2 ?? "")
        ) {
          corrections.line2 = verified.address_line2;
        }
        if (verified?.address_city && verified.address_city !== address.city) {
          corrections.city = verified.address_city;
        }
        if (verified?.address_state && verified.address_state !== address.state) {
          corrections.state = verified.address_state;
        }
        if (verified?.address_zip && verified.address_zip !== address.postal) {
          corrections.postal = verified.address_zip;
        }

        if (Object.keys(corrections).length) {
          warnings.push("Address provider suggests corrections");
        }

        return {
          level,
          isDeliverable,
          warnings,
          corrections: Object.keys(corrections).length ? corrections : null,
          provider: "lob",
        };
      } catch (error) {
        return {
          level: "provider_unavailable",
          isDeliverable: true,
          warnings: [
            ...warnings,
            error instanceof Error && error.name === "AbortError"
              ? "Address verification timed out"
              : "Address verification provider unavailable",
          ],
          provider: "lob",
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
