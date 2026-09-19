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

test("sidebar uses server-verified admin access and exposes Studio section", () => {
  const sidebar = read("src/components/authenticated-sidebar.tsx")
  assert.match(sidebar, /isCurrentUserAdmin/)
  assert.match(sidebar, /Studio \/ Admin/)
  assert.doesNotMatch(sidebar, /user_metadata\?\.role|user_metadata\?\.is_admin/)
})

test("workflow navigation registry contains the canonical 15-section catalog", () => {
  const registry = read("src/lib/workflow-navigation.ts")
  const sectionCount = (registry.match(/"workflows": \[/g) || []).length
  const workflowCount = (registry.match(/"slug":/g) || []).length
  assert.equal(sectionCount, 15)
  assert.equal(workflowCount, 437)
  assert.match(registry, /WORKFLOW_NAV_COUNT/)
})
