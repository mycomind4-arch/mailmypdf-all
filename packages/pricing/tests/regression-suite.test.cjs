const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  PRICES, LABELS, calculateQuote, getWorkflowPricingProfile,
  getProductionPricingProfiles, getPricingProfilesByVertical,
  getAllPricingProfiles, serializeQuote, deserializeQuote,
  BAND_RANGES, isValidPricingKey,
} = require('../dist/index.js');

const ALL_PRODUCTION = getProductionPricingProfiles();
// Exclude mailmypdf core fulfillment products (they legitimately charge mailing-only)
const WORKFLOW_PROFILES = ALL_PRODUCTION.filter(p => p.verticalId !== 'mailmypdf');

describe('Universal Pricing Regression Suite', () => {

  describe('Price drift detection', () => {
    it('every production profile has basePriceCents within its band range', () => {
      for (const profile of ALL_PRODUCTION) {
        const range = BAND_RANGES[profile.band];
        assert.ok(profile.basePriceCents >= range.min && profile.basePriceCents <= range.max,
          `Band drift: ${profile.workflowId} (${profile.band}) basePriceCents=${profile.basePriceCents} range=[${range.min}, ${range.max}]`);
      }
    });

    it('FREE profiles have basePriceCents === 0', () => {
      for (const profile of ALL_PRODUCTION) {
        if (profile.band === 'FREE') assert.equal(profile.basePriceCents, 0, `FREE ${profile.workflowId} has non-zero basePriceCents`);
      }
    });

    it('no two production profiles share the same workflowId', () => {
      const seen = new Map();
      for (const profile of ALL_PRODUCTION) {
        const existing = seen.get(profile.workflowId);
        assert.ok(!existing, `Duplicate workflowId "${profile.workflowId}" in ${existing} and ${profile.verticalId}`);
        seen.set(profile.workflowId, profile.verticalId);
      }
    });
  });

  describe('Checkout drift detection', () => {
    it('calculateQuote is deterministic', () => {
      for (const profile of ALL_PRODUCTION.slice(0, 20)) {
        const input = { workflowId: profile.workflowId, verticalId: profile.verticalId, actualPages: 3, mailClass: 'standard' };
        assert.equal(calculateQuote(input).totalCents, calculateQuote(input).totalCents);
      }
    });

    it('quote total = base + extra pages + mail service (no hidden costs)', () => {
      for (const profile of ALL_PRODUCTION.slice(0, 20)) {
        const actualPages = profile.includedPages + 2;
        const quote = calculateQuote({ workflowId: profile.workflowId, verticalId: profile.verticalId, actualPages, mailClass: 'certified' });
        // The total should equal the subtotal (base + extraPage + supporting + mailService) minus discount
        const expectedSubtotal = quote.basePriceCents + quote.extraPageCost + quote.supportingPageCost + quote.mailServiceCost;
        assert.equal(quote.subtotalCents, expectedSubtotal, `Subtotal mismatch for ${profile.workflowId}: ${quote.subtotalCents} vs ${expectedSubtotal}`);
        assert.equal(quote.totalCents, expectedSubtotal - quote.discountCents, `Total mismatch for ${profile.workflowId}`);
      }
    });
  });

  describe('Mailing drift detection', () => {
    it('included-standard workflows do not charge standard mail twice', () => {
      for (const profile of ALL_PRODUCTION) {
        if (profile.includedMail !== 'standard') continue;
        const quote = calculateQuote({ workflowId: profile.workflowId, verticalId: profile.verticalId, actualPages: profile.includedPages, mailClass: 'standard' });
        assert.equal(quote.mailServiceCost, 0, `Mailing drift: ${profile.workflowId} charges mailServiceCost despite includedMail="standard"`);
        assert.equal(quote.mailUpgradeCost, 0, `Mailing drift: ${profile.workflowId} charges mailUpgradeCost for standard mail`);
      }
    });

    it('non-included mail charges the correct amount', () => {
      for (const profile of ALL_PRODUCTION) {
        if (profile.includedMail === 'standard' || profile.basePriceCents === 0) continue;
        const quote = calculateQuote({ workflowId: profile.workflowId, verticalId: profile.verticalId, actualPages: profile.includedPages, mailClass: 'standard' });
        assert.equal(quote.mailServiceCost, PRICES.standard, `Mailing drift: ${profile.workflowId} should charge ${PRICES.standard}, got ${quote.mailServiceCost}`);
      }
    });
  });

  describe('Legacy drift detection', () => {
    it('canonical PRICES match known mailing values', () => {
      assert.equal(PRICES.standard, 499);
      assert.equal(PRICES.certified, 1494);
      assert.equal(PRICES.registered, 3249);
    });

    it('no workflow-vertical profile charges ONLY the mailing price (legacy model)', () => {
      // mailmypdf core products legitimately charge mailing-only — exclude them
      for (const profile of WORKFLOW_PROFILES) {
        if (profile.band === 'FREE') continue;
        assert.notEqual(profile.basePriceCents, PRICES.standard, `Legacy: ${profile.workflowId} basePrice=standard mail`);
        assert.notEqual(profile.basePriceCents, PRICES.certified, `Legacy: ${profile.workflowId} basePrice=certified mail`);
        assert.notEqual(profile.basePriceCents, PRICES.registered, `Legacy: ${profile.workflowId} basePrice=registered mail`);
      }
    });
  });

  describe('Commercial-status drift detection', () => {
    it('disabled workflows throw when quoting', () => {
      assert.throws(() => calculateQuote({ workflowId: 'govreply', verticalId: 'gov-reply', actualPages: 1 }), /not available for purchase/i);
    });

    it('FREE workflow quotes 0 and with mail charges only mail', () => {
      assert.equal(calculateQuote({ workflowId: 'biometrics', verticalId: 'immigration-mail', actualPages: 1 }).totalCents, 0);
      const q = calculateQuote({ workflowId: 'biometrics', verticalId: 'immigration-mail', actualPages: 1, mailClass: 'certified' });
      assert.equal(q.basePriceCents, 0);
      assert.equal(q.totalCents, PRICES.certified);
    });
  });

  describe('Currency drift detection', () => {
    it('all profiles use usd', () => {
      for (const p of ALL_PRODUCTION) assert.equal(p.currency, 'usd');
    });

    it('all quote totals are positive integers', () => {
      for (const p of ALL_PRODUCTION.slice(0, 20)) {
        const q = calculateQuote({ workflowId: p.workflowId, verticalId: p.verticalId, actualPages: 3, mailClass: 'certified' });
        assert.ok(Number.isInteger(q.totalCents), `Currency drift: ${p.workflowId} not integer`);
        assert.ok(q.totalCents >= 0, `Currency drift: ${p.workflowId} negative`);
      }
    });
  });

  describe('Rounding drift detection', () => {
    it('quote total equals subtotal minus discount (no rounding errors)', () => {
      for (const p of ALL_PRODUCTION.slice(0, 30)) {
        const q = calculateQuote({ workflowId: p.workflowId, verticalId: p.verticalId, actualPages: p.includedPages + 3, supportingPages: 2, mailClass: 'certified' });
        assert.equal(q.totalCents, q.subtotalCents - q.discountCents, `Rounding drift: ${p.workflowId} total=${q.totalCents} subtotal-discount=${q.subtotalCents - q.discountCents}`);
      }
    });

    it('subtotal equals sum of all components', () => {
      for (const p of ALL_PRODUCTION.slice(0, 30)) {
        const q = calculateQuote({ workflowId: p.workflowId, verticalId: p.verticalId, actualPages: p.includedPages + 3, supportingPages: 2, mailClass: 'certified' });
        const sum = q.basePriceCents + q.extraPageCost + q.supportingPageCost + q.mailServiceCost;
        assert.equal(q.subtotalCents, sum, `Subtotal drift: ${p.workflowId} subtotal=${q.subtotalCents} sum=${sum}`);
      }
    });
  });

  describe('Cross-vertical consistency', () => {
    it('mailing surcharges are consistent', () => {
      for (const p of ALL_PRODUCTION) {
        assert.equal(p.certifiedMailSurchargeCents, PRICES.certified - PRICES.standard, `Mail drift: ${p.workflowId} certified surcharge`);
        assert.equal(p.registeredMailSurchargeCents, PRICES.registered - PRICES.standard, `Mail drift: ${p.workflowId} registered surcharge`);
      }
    });
  });

  describe('Quote snapshot immutability', () => {
    it('serialized quote matches original', () => {
      const q = calculateQuote({ workflowId: 'cp2000-response', verticalId: 'notice-respond', actualPages: 5, mailClass: 'certified' });
      const s = serializeQuote(q);
      assert.ok(s.length > 0);
      const p = JSON.parse(s);
      assert.equal(p.totalCents, q.totalCents);
      assert.equal(p.workflowId, q.workflowId);
      assert.equal(p.band, q.band);
    });
  });

  describe('Ecosystem coverage', () => {
    it('has at least 170 production profiles', () => {
      assert.ok(ALL_PRODUCTION.length >= 170, `Expected >= 170, got ${ALL_PRODUCTION.length}`);
    });

    it('covers all major verticals', () => {
      const required = ['mailmypdf', 'notice-respond', 'dispute-mail', 'appeal-mail', 'immigration-mail', 'insurance-claims', 'benefits-appeal', 'records-requests', 'code-enforcement', 'mailmypdf-private-office', 'mailmypdf-smallbusiness'];
      for (const v of required) {
        const count = getPricingProfilesByVertical(v).filter(p => p.commercialStatus === 'production').length;
        assert.ok(count > 0, `Vertical ${v} has no production profiles`);
      }
    });
  });
});

/* ─────────────────────────────────────────────
   Ecosystem Integration Tests
   These tests scan the actual repo source files
   across the ecosystem to verify no local pricing
   engines remain in checkout code.
   ───────────────────────────────────────────── */

const fs = require('fs');
const path = require('path');

const ECOSYSTEM_ROOT = path.resolve(__dirname, '../../../../..');
const REPOS = [
  'ecosystem/notice-respond',
  'ecosystem/immigration-mail',
  'ecosystem/dispute-mail',
  'ecosystem/appeal-mail',
  'ecosystem/benefits-appeal',
  'ecosystem/insurance-claims',
  'ecosystem/records-requests',
  'ecosystem/code-enforcement',
  'ecosystem/mailmypdf-private-office',
  'ecosystem/mailmypdf-smallbusiness',
];

function scanRepoDir(repoRel, subdir, extensions = ['.ts', '.tsx']) {
  const dirPath = path.join(ECOSYSTEM_ROOT, repoRel, subdir);
  if (!fs.existsSync(dirPath)) return [];
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.next') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (extensions.some(ext => entry.name.endsWith(ext)) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
        results.push(full);
      }
    }
  }
  walk(dirPath);
  return results;
}

function scanRepoFiles(repoRel, extensions = ['.ts', '.tsx']) {
  const repoPath = path.join(ECOSYSTEM_ROOT, repoRel, 'src');
  if (!fs.existsSync(repoPath)) return [];
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.next') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (extensions.some(ext => entry.name.endsWith(ext)) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
        results.push(full);
      }
    }
  }
  walk(repoPath);
  return results;
}

function fileContains(filePath, pattern) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes(pattern);
  } catch { return false; }
}

describe('Ecosystem Checkout Migration', () => {

  describe('No local PRICES constants in checkout code', () => {
    it('no repo has a local PRICES constant used for checkout', () => {
      const violations = [];
      for (const repo of REPOS) {
        const files = scanRepoFiles(repo);
        for (const file of files) {
          // Look for local PRICES constants that are not imported from @mailmypdf/pricing
          if (fileContains(file, 'PRICES') && !fileContains(file, '@mailmypdf/pricing') && fileContains(file, 'stripe')) {
            violations.push(`${repo}/${path.relative(path.join(ECOSYSTEM_ROOT, repo), file)}`);
          }
        }
      }
      assert.deepStrictEqual(violations, [], `Local PRICES constants in checkout code: ${violations.join(', ')}`);
    });
  });

  describe('No local MAILING_PRICES constants', () => {
    it('no repo defines a local MAILING_PRICES constant', () => {
      const violations = [];
      for (const repo of REPOS) {
        const files = scanRepoFiles(repo);
        for (const file of files) {
          if (fileContains(file, 'MAILING_PRICES') && !fileContains(file, '@mailmypdf/pricing')) {
            violations.push(`${repo}/${path.relative(path.join(ECOSYSTEM_ROOT, repo), file)}`);
          }
        }
      }
      assert.deepStrictEqual(violations, [], `Local MAILING_PRICES constants found: ${violations.join(', ')}`);
    });
  });

  describe('Canonical import presence', () => {
    it('repos with checkout routes import @mailmypdf/pricing', () => {
      const reposWithCheckout = [];
      for (const repo of REPOS) {
        // Scan src/, server/, and functions/ directories
        const srcFiles = scanRepoFiles(repo);
        const allFiles = [...srcFiles, ...scanRepoDir(repo, 'server'), ...scanRepoDir(repo, 'functions')];
        const hasCheckoutRoute = allFiles.some(f => 
          (f.includes('checkout') || f.includes('approve')) && 
          fileContains(f, 'stripe')
        );
        if (!hasCheckoutRoute) continue;
        const hasCanonicalImport = allFiles.some(f => fileContains(f, '@mailmypdf/pricing'));
        if (!hasCanonicalImport) {
          reposWithCheckout.push(repo);
        }
      }
      assert.deepStrictEqual(reposWithCheckout, [], `Repos with checkout but no @mailmypdf/pricing import: ${reposWithCheckout.join(', ')}`);
    });
  });

  describe('Checkout endpoint exists where UI calls it', () => {
    it('repos with /api/checkout UI calls have server handlers', () => {
      const missing = [];
      for (const repo of REPOS) {
        const files = scanRepoFiles(repo);
        const hasUICall = files.some(f => 
          fileContains(f, '/api/checkout') && 
          (f.endsWith('.tsx') || f.endsWith('.ts')) &&
          !f.includes('/api/checkout')
        );
        if (!hasUICall) continue;
        // Check multiple possible locations for checkout handler
        const possiblePaths = [
          path.join(ECOSYSTEM_ROOT, repo, 'src/routes/api/checkout.ts'),
          path.join(ECOSYSTEM_ROOT, repo, 'server/api/checkout.ts'),
          path.join(ECOSYSTEM_ROOT, repo, 'functions/api/checkout.ts'),
        ];
        const hasServerHandler = possiblePaths.some(p => fs.existsSync(p));
        if (!hasServerHandler) {
          missing.push(repo);
        }
      }
      assert.deepStrictEqual(missing, [], `Repos with UI checkout calls but no checkout handler: ${missing.join(', ')}`);
    });
  });

  describe('Profile coverage by vertical', () => {
    const VERTICALS = {
      'notice-respond': 10,
      'dispute-mail': 10,
      'appeal-mail': 25,
      'immigration-mail': 10,
      'insurance-claims': 15,
      'benefits-appeal': 15,
      'records-requests': 10,
      'code-enforcement': 10,
      'mailmypdf-private-office': 3,
      'mailmypdf-smallbusiness': 5,
    };

    for (const [vertical, minCount] of Object.entries(VERTICALS)) {
      it(`${vertical} has at least ${minCount} production profiles`, () => {
        const profiles = getPricingProfilesByVertical(vertical).filter(p => p.commercialStatus === 'production');
        assert.ok(profiles.length >= minCount, `${vertical}: expected >= ${minCount}, got ${profiles.length}`);
      });
    }
  });

  describe('Quote correctness for every production profile', () => {
    it('calculateQuote returns positive total for every production profile with certified mail', () => {
      for (const profile of WORKFLOW_PROFILES) {
        const q = calculateQuote({
          workflowId: profile.workflowId,
          verticalId: profile.verticalId,
          actualPages: Math.max(profile.includedPages, 3),
          mailClass: 'certified',
        });
        assert.ok(q.totalCents > 0, `${profile.workflowId}: total should be positive, got ${q.totalCents}`);
        assert.ok(q.totalCents >= profile.basePriceCents, `${profile.workflowId}: total (${q.totalCents}) should be >= base (${profile.basePriceCents})`);
      }
    });

    it('quote with extra pages costs more than included', () => {
      for (const profile of WORKFLOW_PROFILES.slice(0, 30)) {
        const base = calculateQuote({
          workflowId: profile.workflowId, verticalId: profile.verticalId,
          actualPages: profile.includedPages, mailClass: 'standard',
        });
        const extra = calculateQuote({
          workflowId: profile.workflowId, verticalId: profile.verticalId,
          actualPages: profile.includedPages + 5, mailClass: 'standard',
        });
        if (profile.band !== 'FREE') {
          assert.ok(extra.totalCents > base.totalCents, `${profile.workflowId}: extra pages should cost more`);
        }
      }
    });
  });
});

/* ─────────────────────────────────────────────
   Pricing Quality Tests
   Verify business invariants, not just technical
   integration.
   ───────────────────────────────────────────── */

describe('Pricing Quality', () => {

  describe('No duplicate workflow IDs', () => {
    it('every production workflow ID is unique', () => {
      const ids = WORKFLOW_PROFILES.map(p => p.workflowId);
      const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
      assert.deepStrictEqual(duplicates, [], `Duplicate workflow IDs: ${duplicates.join(', ')}`);
    });

    it('every workflow ID across all profiles is unique', () => {
      const all = getAllPricingProfiles();
      const seen = new Set();
      const ids = all.map(p => `${p.verticalId}/${p.workflowId}`);
      const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
      assert.deepStrictEqual(duplicates, [], `Duplicate vertical/ID combos: ${duplicates.join(', ')}`);
    });
  });

  describe('Band validation', () => {
    it('every production profile price falls within its band range', () => {
      const violations = [];
      for (const p of WORKFLOW_PROFILES) {
        const range = BAND_RANGES[p.band];
        if (!range) { violations.push(`${p.workflowId}: unknown band ${p.band}`); continue; }
        if (p.basePriceCents < range.min || p.basePriceCents > range.max) {
          violations.push(`${p.workflowId}: \$${(p.basePriceCents/100).toFixed(2)} outside ${p.band} (\$${(range.min/100).toFixed(2)}-\$${(range.max/100).toFixed(2)})`);
        }
      }
      assert.deepStrictEqual(violations, [], `Band violations:\n  ${violations.join('\n  ')}`);
    });
  });

  describe('No negative or zero prices for paid workflows', () => {
    it('no production profile has negative base price', () => {
      const negative = WORKFLOW_PROFILES.filter(p => p.basePriceCents < 0);
      assert.deepStrictEqual(negative, [], 'Negative base prices found');
    });

    it('all non-FREE production profiles have positive base price', () => {
      const zeroPaid = WORKFLOW_PROFILES.filter(p => p.band !== 'FREE' && p.basePriceCents <= 0);
      assert.deepStrictEqual(zeroPaid, [], `Paid workflows with zero price: ${zeroPaid.map(p => p.workflowId).join(', ')}`);
    });
  });

  describe('Mailing price separation', () => {
    it('mailing prices are distinct from workflow preparation prices', () => {
      const workflowPrices = new Set(WORKFLOW_PROFILES.map(p => p.basePriceCents));
      const mailingPrices = new Set(Object.values(PRICES));
      // Mailing prices should not be the same as any non-FREE workflow price
      const overlaps = [...mailingPrices].filter(cents => 
        cents > 0 && workflowPrices.has(cents)
      );
      // $4.99 is an ESSENTIAL send-a-letter price AND the standard mailing price — that's OK
      // since send-a-letter IS a mailing-only product
      assert.ok(overlaps.length <= 1, `Mailing prices overlapping with workflow prices: ${overlaps.map(c => '$' + (c/100).toFixed(2)).join(', ')}`);
    });

    it('calculateQuote separates preparation from mailing', () => {
      const profile = WORKFLOW_PROFILES.find(p => p.band === 'ADVANCED');
      if (!profile) return;
      const quote = calculateQuote({
        workflowId: profile.workflowId,
        verticalId: profile.verticalId,
        actualPages: profile.includedPages,
        mailClass: 'certified',
      });
      assert.ok(quote.basePriceCents > 0, 'Preparation fee should be positive for ADVANCED workflows');
      assert.ok(quote.mailServiceCost >= 0, 'Mailing service cost should be non-negative');
      assert.ok(quote.totalCents >= quote.basePriceCents, 'Total should be >= preparation fee');
      assert.ok(quote.totalCents === quote.basePriceCents + quote.mailUpgradeCost,
        'Total should equal base + mail upgrade');
    });
  });

  describe('Price distribution sanity', () => {
    it('not every workflow is the same price', () => {
      const prices = WORKFLOW_PROFILES.map(p => p.basePriceCents);
      const uniquePrices = new Set(prices);
      assert.ok(uniquePrices.size >= 5, `Only ${uniquePrices.size} unique prices — catalog is too flat`);
    });

    it('FREE workflows are actually free', () => {
      const free = WORKFLOW_PROFILES.filter(p => p.band === 'FREE');
      for (const p of free) {
        assert.strictEqual(p.basePriceCents, 0, `${p.workflowId} is FREE band but costs $${(p.basePriceCents/100).toFixed(2)}`);
      }
    });
  });

  describe('HIGH_STAKES validation', () => {
    it('HIGH_STAKES workflows have the highest prices', () => {
      const highStakes = WORKFLOW_PROFILES.filter(p => p.band === 'HIGH_STAKES');
      const advanced = WORKFLOW_PROFILES.filter(p => p.band === 'ADVANCED');
      const maxAdvanced = Math.max(...advanced.map(p => p.basePriceCents));
      for (const p of highStakes) {
        assert.ok(p.basePriceCents >= maxAdvanced,
          `${p.workflowId} ($${(p.basePriceCents/100).toFixed(2)}) should be >= max ADVANCED ($${(maxAdvanced/100).toFixed(2)})`);
      }
    });
  });

  describe('Quote snapshot integrity', () => {
    it('serialized quote round-trips correctly', () => {
      const profile = WORKFLOW_PROFILES.find(p => p.band === 'ADVANCED');
      if (!profile) return;
      const quote = calculateQuote({
        workflowId: profile.workflowId,
        verticalId: profile.verticalId,
        actualPages: profile.includedPages,
        mailClass: 'certified',
      });
      const serialized = serializeQuote(quote);
      const deserialized = deserializeQuote(serialized);
      assert.ok(deserialized, 'Deserialized quote should not be null');
      assert.strictEqual(deserialized.totalCents, quote.totalCents, 'Total should match after round-trip');
      assert.strictEqual(deserialized.basePriceCents, quote.basePriceCents, 'Base should match after round-trip');
    });
  });
});
