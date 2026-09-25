import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import assert from "node:assert/strict"

const root = path.resolve(import.meta.dirname, "..")
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8")

test("authenticated shell owns the global sidebar", () => {
  const parentRoute = read("src/routes/_authenticated/route.tsx")
  const dashboardRoute = read("src/routes/_authenticated/dashboard/route.tsx")
  assert.match(parentRoute, /AuthenticatedSidebar/)
  assert.doesNotMatch(dashboardRoute, /AuthenticatedSidebar/)
})

test("sidebar uses server-verified admin access and exposes Studio", () => {
  const sidebar = read("src/components/authenticated-sidebar.tsx")
  assert.match(sidebar, /isCurrentUserAdmin/)
  assert.match(sidebar, /label: "Studio"/)
  assert.doesNotMatch(sidebar, /user_metadata\?\.role|user_metadata\?\.is_admin/)
})

test("workflow navigation covers every canonical section without a hard-coded workflow count", () => {
  const registry = read("src/lib/workflow-navigation.ts")
  const sections = read("src/lib/section-registry.ts")
  const sidebar = read("src/components/authenticated-sidebar.tsx")

  const navSectionIds = [...registry.matchAll(/^\s{4}"id": "([^"]+)"/gm)].map((match) => match[1]).sort()
  const canonicalSectionIds = [...sections.matchAll(/^\s{4}id: "([^"]+)",$/gm)].map((match) => match[1]).sort()
  const workflowCount = (registry.match(/"slug":/g) || []).length

  assert.deepEqual(navSectionIds, canonicalSectionIds)
  assert.equal(navSectionIds.length, 15)
  assert.ok(workflowCount >= 420)
  assert.ok(navSectionIds.includes("secured-transactions"))
  assert.match(registry, /WORKFLOW_NAV_COUNT/)
  assert.match(sidebar, /Search \$\{WORKFLOW_NAV_COUNT\} workflows/)
  assert.doesNotMatch(sidebar, /Search 420 workflows/)
})
