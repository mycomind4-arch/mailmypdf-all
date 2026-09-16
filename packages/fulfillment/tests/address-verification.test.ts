import assert from "node:assert/strict";
import test from "node:test";
import {
  createLobAddressVerifier,
  verifyMailingAddresses,
} from "../src/address-verification.js";

const address = {
  name: "Jane Doe",
  line1: "123 Main St",
  city: "Eureka",
  state: "CA",
  postal: "95501",
};

test("Lob verifier maps deliverability and corrections", async () => {
  let body = "";
  const verifier = createLobAddressVerifier({
    apiKey: "test",
    fetchImpl: async (_url, init) => {
      body = String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          deliverability: "deliverable",
          address: {
            address_line1: "123 MAIN ST",
            address_city: "EUREKA",
            address_state: "CA",
            address_zip: "95501-0001",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });

  const result = await verifier.verify(address);
  assert.equal(result.isDeliverable, true);
  assert.equal(result.corrections?.postal, "95501-0001");
  assert.match(body, /address%5Bline1%5D/);
});

test("explicit undeliverable recipient blocks mailing", async () => {
  const verifier = {
    name: "fake",
    async verify() {
      return {
        level: "undeliverable" as const,
        isDeliverable: false,
        warnings: [],
      };
    },
  };

  const result = await verifyMailingAddresses(address, address, verifier);
  assert.equal(result.shouldBlock, true);
});
