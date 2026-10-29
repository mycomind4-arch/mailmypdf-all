import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { renderResponseLetter } from "../src/lib/secure-core/case-approval.server";
import {
  acceptsPacketPdf,
  packetPdfReviewResponse,
} from "../src/lib/secure-core/packet-pdf-review.server";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

describe("authenticated packet PDF review response (no provider calls)", () => {
  test("keeps JSON as default and requires explicit PDF opt-in", () => {
    for (const value of [null, "", "*/*", "application/json", "application/pdf, */*"]) {
      assert.equal(acceptsPacketPdf(value), false);
    }
    assert.equal(acceptsPacketPdf("application/pdf"), true);
    assert.equal(acceptsPacketPdf(" APPLICATION/PDF "), true);
  });

  test("serves the exact generated PDF and digest with private no-store headers", async () => {
    const bytes = await renderResponseLetter("Synthetic IRS notice response. No real mailing.");
    const expected = bytes.slice();
    const packet = {
      bytes,
      packetSha256: sha256(bytes),
      responsePages: 1,
      supportingPages: 0,
    };
    const response = await packetPdfReviewResponse(packet);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/pdf");
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-packet-sha256"), packet.packetSha256);
    assert.equal(response.headers.get("x-response-pages"), "1");
    assert.equal(response.headers.get("x-supporting-pages"), "0");
    assert.match(response.headers.get("content-disposition") ?? "", /^inline;/);

    // The response owns a copy; later mutation of an adapter's source bytes
    // must not change what the customer receives or the digest they review.
    bytes[0] ^= 1;
    const delivered = new Uint8Array(await response.arrayBuffer());
    assert.deepEqual(delivered, expected);
    assert.equal(sha256(delivered), response.headers.get("x-packet-sha256"));
  });

  test("fails closed on a wrong hash, a non-PDF, or invalid page counts", async () => {
    const bytes = await renderResponseLetter("Synthetic notice response.");
    const valid = { bytes, packetSha256: sha256(bytes), responsePages: 1, supportingPages: 0 };
    await assert.rejects(() => packetPdfReviewResponse({
      ...valid, packetSha256: "0".repeat(64),
    }), /integrity/);
    await assert.rejects(() => packetPdfReviewResponse({
      ...valid, bytes: new TextEncoder().encode("not a pdf"),
    }), /Invalid packet/);
    await assert.rejects(() => packetPdfReviewResponse({
      ...valid, responsePages: 0,
    }), /Invalid packet/);
    await assert.rejects(() => packetPdfReviewResponse({
      ...valid, supportingPages: -1,
    }), /Invalid packet/);
  });
});
