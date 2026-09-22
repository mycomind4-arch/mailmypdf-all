import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  identifyGeographicJurisdiction,
  canMakeJurisdictionalConclusions,
  validateJurisdictionForCodeEnforcement,
} from "../src/geographic-jurisdiction.js";

test("identifyGeographicJurisdiction - incorporated city", () => {
  const result = identifyGeographicJurisdiction({
    locationName: "Eureka",
    agencyName: "Eureka Code Enforcement",
  });

  assert.equal(result.state, "California");
  assert.equal(result.county, "Humboldt");
  assert.equal(result.municipality, "Eureka");
  assert.equal(result.level, "municipality");
  assert.equal(result.isIncorporated, true);
  assert.equal(result.resolved, true);
  assert(result.confidence >= 0.8);
});

test("identifyGeographicJurisdiction - unincorporated community", () => {
  const result = identifyGeographicJurisdiction({
    locationName: "McKinleyville",
  });

  assert.equal(result.state, "California");
  assert.equal(result.county, "Humboldt");
  assert.equal(result.isIncorporated, false);
  assert.equal(result.resolved, true);
  assert.equal(result.confidence, 0.8);
});

test("identifyGeographicJurisdiction - county by name", () => {
  const result = identifyGeographicJurisdiction({
    countyName: "Humboldt",
  });

  assert.equal(result.state, "California");
  assert.equal(result.county, "Humboldt");
  assert.equal(result.level, "county");
  assert.equal(result.resolved, true);
  assert.equal(result.confidence, 0.75);
});

test("identifyGeographicJurisdiction - county from agency name", () => {
  const result = identifyGeographicJurisdiction({
    agencyName: "Alameda County Code Enforcement",
  });

  assert.equal(result.county, "Alameda");
  assert.equal(result.level, "county");
  assert.equal(result.resolved, true);
  assert.equal(result.confidence, 0.7);
});

test("identifyGeographicJurisdiction - unknown jurisdiction", () => {
  const result = identifyGeographicJurisdiction({
    locationName: "UnknownPlace",
    agencyName: "Unknown Agency",
  });

  assert.equal(result.level, "unknown");
  assert.equal(result.resolved, false);
  assert.equal(result.confidence, 0.2);
});

test("canMakeJurisdictionalConclusions - resolved with sufficient confidence", () => {
  const jurisdiction = identifyGeographicJurisdiction({
    locationName: "Eureka",
  });

  const can = canMakeJurisdictionalConclusions(jurisdiction);
  assert.equal(can, true);
});

test("canMakeJurisdictionalConclusions - unresolved", () => {
  const jurisdiction = identifyGeographicJurisdiction({
    locationName: "UnknownPlace",
  });

  const can = canMakeJurisdictionalConclusions(jurisdiction);
  assert.equal(can, false);
});

test("validateJurisdictionForCodeEnforcement - resolved and sufficient", () => {
  const jurisdiction = identifyGeographicJurisdiction({
    locationName: "Eureka",
  });

  const validation = validateJurisdictionForCodeEnforcement(jurisdiction);
  assert.equal(validation.valid, true);
  assert.equal(validation.blockers.length, 0);
});

test("validateJurisdictionForCodeEnforcement - unresolved", () => {
  const jurisdiction = identifyGeographicJurisdiction({
    locationName: "UnknownPlace",
  });

  const validation = validateJurisdictionForCodeEnforcement(jurisdiction);
  assert.equal(validation.valid, false);
  assert(validation.blockers.length > 0);
});

test("validateJurisdictionForCodeEnforcement - missing agency", () => {
  const jurisdiction = identifyGeographicJurisdiction({
    countyName: "Humboldt",
  });
  jurisdiction.agency = "";

  const validation = validateJurisdictionForCodeEnforcement(jurisdiction);
  assert.equal(validation.valid, false);
  assert(validation.blockers.some(b => b.includes("enforcing agency")));
});

test("identifyGeographicJurisdiction - all California counties", () => {
  // Spot check a few counties to ensure the list is working
  const counties = [
    "Humboldt",
    "Alameda",
    "Los Angeles",
    "San Francisco",
    "Sacramento",
  ];

  for (const county of counties) {
    const result = identifyGeographicJurisdiction({ countyName: county });
    assert.equal(result.resolved, true, `${county} should be recognized`);
    assert.equal(result.county, county);
  }
});
