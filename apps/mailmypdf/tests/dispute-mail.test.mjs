import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname_test = dirname(fileURLToPath(import.meta.url));

// ── Unit Tests for DisputeMail Categories ─────────────────────────────────────

describe("DisputeMail — Categories", () => {
  const categoriesSource = readFileSync(
    join(__dirname_test, "..", "src", "verticals", "dispute-mail", "categories.ts"),
    "utf-8",
  );

  it("has all required dispute categories", () => {
    const required = [
      "incorrect_charge",
      "billing_dispute",
      "refund_dispute",
      "service_dispute",
      "contract_dispute",
      "record_correction",
      "product_warranty",
      "fee_dispute",
      "account_dispute",
      "cancellation_dispute",
      "other",
    ];
    for (const id of required) {
      assert.ok(
        categoriesSource.includes(`id: "${id}"`),
        `Category "${id}" must be defined`,
      );
    }
  });

  it("includes 'Something else' for users who don't fit a category", () => {
    assert.ok(
      categoriesSource.includes('"Something else"'),
      "Must have a 'Something else' option",
    );
  });

  it("does not force users into legal categories", () => {
    // There should be no categories with 'legal' in the id or label
    assert.ok(!categoriesSource.match(/id: "legal_/), "No legal_ prefixed categories");
  });
});

// ── Unit Tests for DisputeMail AI Config ──────────────────────────────────────

describe("DisputeMail — AI Config", () => {
  const aiConfigSource = readFileSync(
    join(__dirname_test, "..", "src", "verticals", "dispute-mail", "ai-config.ts"),
    "utf-8",
  );

  it("uses canonical AI workflow infrastructure", () => {
    assert.ok(
      aiConfigSource.includes("registerVerticalAI"),
      "Must use registerVerticalAI from canonical infrastructure",
    );
    assert.ok(
      !aiConfigSource.includes("Anthropic"),
      "Must NOT import Anthropic directly — use shared infra",
    );
    assert.ok(
      !aiConfigSource.includes("fetch("),
      "Must NOT make direct API calls — use shared infra",
    );
  });

  it("analysis prompt does not fabricate facts", () => {
    assert.ok(
      aiConfigSource.includes("Never fabricate information"),
      "Analysis prompt must prohibit fabrication",
    );
    assert.ok(
      aiConfigSource.includes("Only extract facts"),
      "Analysis prompt must require extraction-only",
    );
  });

  it("draft prompt does not fabricate facts", () => {
    assert.ok(
      aiConfigSource.includes("Never fabricate facts"),
      "Draft prompt must prohibit fabrication",
    );
    assert.ok(
      aiConfigSource.includes("Never fabricate evidence"),
      "Draft prompt must prohibit evidence fabrication",
    );
  });

  it("prompts distinguish fact types", () => {
    assert.ok(
      aiConfigSource.includes("USER PROVIDED FACT"),
      "Must distinguish user-provided facts",
    );
    assert.ok(
      aiConfigSource.includes("DOCUMENT EXTRACTED FACT"),
      "Must distinguish document-extracted facts",
    );
    assert.ok(
      aiConfigSource.includes("AI INFERENCE"),
      "Must distinguish AI inferences",
    );
  });

  it("prompts prohibit legal advice", () => {
    assert.ok(
      aiConfigSource.includes("Never provide legal advice"),
      "Must prohibit legal advice",
    );
    assert.ok(
      aiConfigSource.includes("Never claim legal representation"),
      "Must prohibit legal representation claims",
    );
  });

  it("does not expose API keys", () => {
    assert.ok(
      !aiConfigSource.includes("ANTHROPIC_API_KEY"),
      "Must not hardcode API keys",
    );
    assert.ok(
      !aiConfigSource.includes("CLAUDE_API_KEY"),
      "Must not hardcode API keys",
    );
  });
});

// ── Unit Tests for DisputeMail API Endpoints ──────────────────────────────────

describe("DisputeMail — API Endpoints", () => {
  it("analyze-file endpoint validates input", () => {
    const source = readFileSync(
      join(__dirname_test, "..", "src", "routes", "api", "v1", "dispute-mail", "analyze-file.ts"),
      "utf-8",
    );
    assert.ok(source.includes("documentText"), "Must validate documentText");
    assert.ok(source.includes("50_000"), "Must bound payload size");
    assert.ok(source.includes("400"), "Must return 400 for bad input");
  });

  it("analyze-file endpoint is rate-limited", () => {
    const source = readFileSync(
      join(__dirname_test, "..", "src", "routes", "api", "v1", "dispute-mail", "analyze-file.ts"),
      "utf-8",
    );
    assert.ok(source.includes("rateLimit"), "Must use rate limiting");
    assert.ok(source.includes("429"), "Must return 429 when rate-limited");
    assert.ok(source.includes("dispute-mail-analyze"), "Must use dispute-mail-specific bucket");
  });

  it("draft endpoint validates intake", () => {
    const source = readFileSync(
      join(__dirname_test, "..", "src", "routes", "api", "v1", "dispute-mail", "draft.ts"),
      "utf-8",
    );
    assert.ok(source.includes("recipientName"), "Must validate recipientName");
    assert.ok(source.includes("disputeSubject"), "Must validate disputeSubject");
    assert.ok(source.includes("whatHappened"), "Must validate whatHappened");
    assert.ok(source.includes("400"), "Must return 400 for bad input");
    assert.ok(source.includes("10_000"), "Must bound description length");
  });

  it("draft endpoint is rate-limited", () => {
    const source = readFileSync(
      join(__dirname_test, "..", "src", "routes", "api", "v1", "dispute-mail", "draft.ts"),
      "utf-8",
    );
    assert.ok(source.includes("rateLimit"), "Must use rate limiting");
    assert.ok(source.includes("429"), "Must return 429 when rate-limited");
    assert.ok(source.includes("dispute-mail-draft"), "Must use dispute-mail-specific bucket");
  });

  it("finalize endpoint creates canonical order (not duplicate)", () => {
    const source = readFileSync(
      join(__dirname_test, "..", "src", "routes", "api", "v1", "dispute-mail", "finalize.ts"),
      "utf-8",
    );
    assert.ok(source.includes("getMailService"), "Must use canonical MailService");
    assert.ok(source.includes("createOrderFromLetter"), "Must use canonical order creation");
    assert.ok(source.includes("vertical_slug"), "Must tag order with vertical_slug");
    assert.ok(source.includes("dispute-mail"), "Must tag as dispute-mail vertical");
    assert.ok(
      !source.includes("createStripeClient"),
      "Must NOT create its own Stripe checkout",
    );
    assert.ok(
      !source.includes("createLobLetter"),
      "Must NOT create its own Lob fulfillment",
    );
  });

  it("finalize endpoint is rate-limited", () => {
    const source = readFileSync(
      join(__dirname_test, "..", "src", "routes", "api", "v1", "dispute-mail", "finalize.ts"),
      "utf-8",
    );
    assert.ok(source.includes("rateLimit"), "Must use rate limiting");
    assert.ok(source.includes("429"), "Must return 429 when rate-limited");
  });

  it("finalize endpoint validates addresses with zod", () => {
    const source = readFileSync(
      join(__dirname_test, "..", "src", "routes", "api", "v1", "dispute-mail", "finalize.ts"),
      "utf-8",
    );
    assert.ok(source.includes("z.object"), "Must use zod validation");
    assert.ok(source.includes("addressSchema"), "Must validate addresses");
    assert.ok(source.includes("postalCode"), "Must validate ZIP code");
    assert.ok(source.includes("state"), "Must validate state");
  });

  it("finalize endpoint does not expose secrets", () => {
    const source = readFileSync(
      join(__dirname_test, "..", "src", "routes", "api", "v1", "dispute-mail", "finalize.ts"),
      "utf-8",
    );
    assert.ok(!source.includes("STRIPE_SECRET"), "Must not expose Stripe secret");
    assert.ok(!source.includes("LOB_API_KEY"), "Must not expose Lob key");
    assert.ok(!source.includes("ANTHROPIC"), "Must not expose Claude key");
  });
});

// ── DisputeMail catalog boundary ─────────────────────────────────────────────

describe("DisputeMail — Catalog Boundary", () => {
  it("keeps the root route internal and explicitly prelaunch", () => {
    const routeSource = readFileSync(join(__dirname_test, "..", "src", "routes", "dispute-mail.tsx"), "utf-8");
    assert.ok(routeSource.includes('createFileRoute("/dispute-mail")'));
    assert.ok(routeSource.includes('product="Dispute Mail"'));
    assert.ok(routeSource.includes('content: "noindex,nofollow"'));
    assert.ok(!routeSource.includes("window.location.replace"));
  });

  it("does not mount payment or fulfillment in the prelaunch catalog", () => {
    const routeSource = readFileSync(join(__dirname_test, "..", "src", "routes", "dispute-mail.tsx"), "utf-8");
    assert.ok(!routeSource.includes("createCheckoutForOrder"));
    assert.ok(!routeSource.includes("getStripe"));
    assert.ok(!routeSource.includes("calculateTotalPrice"));
  });
});

// ── Copy Audit ────────────────────────────────────────────────────────────────

describe("DisputeMail — Copy Audit", () => {
  it("route does not make unsupported legal claims", () => {
    const routeSource = readFileSync(
      join(__dirname_test, "..", "src", "routes", "dispute-mail.tsx"),
      "utf-8",
    );
    assert.ok(!routeSource.includes("guaranteed result"), "No 'guaranteed result'");
    assert.ok(!routeSource.includes("win your dispute"), "No 'win your dispute'");
    assert.ok(!routeSource.includes("force them to respond"), "No 'force them to respond'");
    assert.ok(!routeSource.includes("legally enforceable"), "No 'legally enforceable'");
    assert.ok(!routeSource.match(/[Ww]e provide legal advice/), "No legal advice claims");
  });

  it("route does not claim an unfinished fulfillment experience", () => {
    const routeSource = readFileSync(
      join(__dirname_test, "..", "src", "routes", "dispute-mail.tsx"),
      "utf-8",
    );
    assert.ok(routeSource.includes("ProductFamilyPage"), "Must render the shared prelaunch catalog");
    assert.ok(!routeSource.includes("Start checkout"), "Must not advertise unavailable checkout");
    assert.ok(!routeSource.includes("Ready to mail"), "Must not advertise unavailable fulfillment");
  });

  it("no FairProcess/FairProcessMaps references in any DisputeMail file", () => {
    const files = [
      "src/routes/dispute-mail.tsx",
      "src/verticals/dispute-mail/index.ts",
      "src/verticals/dispute-mail/types.ts",
      "src/verticals/dispute-mail/categories.ts",
      "src/verticals/dispute-mail/ai-config.ts",
      "src/routes/api/v1/dispute-mail/analyze-file.ts",
      "src/routes/api/v1/dispute-mail/draft.ts",
      "src/routes/api/v1/dispute-mail/finalize.ts",
    ];
    for (const file of files) {
      const source = readFileSync(join(__dirname_test, "..", file), "utf-8");
      assert.ok(!source.includes("FairProcess"), `${file} must not reference FairProcess`);
      assert.ok(!source.includes("FairProcessMaps"), `${file} must not reference FairProcessMaps`);
    }
  });
});

// ── Dead Code Check ───────────────────────────────────────────────────────────

describe("DisputeMail — Dead Code Check", () => {
  it("no duplicate AI client is created", () => {
    const aiConfigSource = readFileSync(
      join(__dirname_test, "..", "src", "verticals", "dispute-mail", "ai-config.ts"),
      "utf-8",
    );
    assert.ok(
      !aiConfigSource.includes("new Anthropic"),
      "Must not create its own Anthropic client",
    );
    assert.ok(
      !aiConfigSource.includes("fetch("),
      "Must not make direct fetch calls to Claude API",
    );
  });

  it("no duplicate pricing logic", () => {
    const finalizeSource = readFileSync(
      join(__dirname_test, "..", "src", "routes", "api", "v1", "dispute-mail", "finalize.ts"),
      "utf-8",
    );
    assert.ok(
      !finalizeSource.includes("basePriceCents"),
      "Finalize must not calculate prices directly",
    );
    assert.ok(
      !finalizeSource.includes("MAIL_CLASS_SURCHARGE"),
      "Finalize must not reference surcharge constants directly",
    );
  });
});
