import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import assert from "node:assert/strict"
import { WORKFLOW_REGISTRY, workflowById } from "@mailmypdf/workflows/canonical-registry"

const root = path.resolve(import.meta.dirname, "..")
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8")

test("authenticated workflow routes are workspace-only and noindex", () => {
  for (const file of [
    "src/routes/_authenticated/dashboard/workflows/index.tsx",
    "src/routes/_authenticated/dashboard/workflows/$sectionId.tsx",
    "src/routes/_authenticated/dashboard/workflows/$sectionId/$workflowId.tsx",
  ]) {
    const source = read(file)
    assert.match(source, /noindex/)
    assert.doesNotMatch(source, /SiteHeader|SiteFooter|PublicVertical|heroImage|<img/)
  }
})

test("authenticated workflow browser contains no marketing hero or image system", () => {
  const source = read("src/components/authenticated-workflow-browser.tsx")
  assert.doesNotMatch(source, /hero|<img|background-image|SiteHeader|SiteFooter/i)
  assert.match(source, /workflowAuthorityForPath/)
  assert.match(source, /isCurrentUserAdmin/)
})

test("workflow registry separates public SEO and authenticated workspace hrefs", () => {
  for (const workflow of WORKFLOW_REGISTRY) {
    assert.ok(workflow.publicHref.startsWith(`/${workflow.sectionId}/workflows/`))
    assert.ok(workflow.workspaceHref.startsWith(`/dashboard/workflows/${workflow.sectionId}/`))
    assert.notEqual(workflow.publicHref, workflow.workspaceHref)
  }
  const cp2000 = workflowById("notice-respond/cp2000-response")
  assert.equal(cp2000.publicHref, "/notice-respond/workflows/cp2000-response")
  assert.equal(cp2000.workspaceHref, "/dashboard/workflows/notice-respond/cp2000-response")
})

test("Studio sidebar routes signed-in workflow navigation to workspace URLs", () => {
  const source = read("src/components/authenticated-sidebar.tsx")
  assert.match(source, /\/dashboard\/workflows/)
  assert.match(source, /workflow\.workspaceHref/)
  assert.match(source, /section\.workspaceHref/)
  assert.doesNotMatch(source, /href="\/workflows"/)
})
