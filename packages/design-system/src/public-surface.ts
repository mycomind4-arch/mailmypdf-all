/**
 * Public/unauthenticated surface.
 *
 * Keep the composition entry point here so every vertical landing page uses
 * the same page contract and the same CSS primitives. Vertical apps provide
 * content and workflow data; this surface owns the layout.
 */
export {
  SectionLandingPage,
  type SectionLandingConfig,
  type SectionTone,
} from "./section-landing.js";
export {
  createTrustStrip,
  createVerticalHero,
  type TrustStripItem,
  type VerticalHeroProps,
} from "./public-page.js";
export { getWorkflowImageSrc, executableWorkflowImageIds } from "./workflow-images.js";

import type { EcosystemTheme } from "./index.js";
import type { ElementFactory } from "./public-page.js";

const AUTH_ENTRY_HREF = "/auth?redirect=%2Fdashboard";

export interface PublicLandingFrameProps {
  theme: EcosystemTheme;
  name: string;
  path?: string;
  children?: any;
}

/** Shared public chrome for richer vertical pages that retain product-specific sections. */
export function createPublicLandingFrame(h: ElementFactory) {
  return function PublicLandingFrame({ theme, name, path = "", children }: PublicLandingFrameProps) {
    const directory = `${path}/workflows` || "/workflows";
    return h(
      "div",
      { className: "mmp-app", "data-mmp-theme": theme },
      h(
        "header",
        { className: "mmp-site-header" },
        h(
          "div",
          { className: "mmp-site-header__inner" },
          h(
            "a",
            { className: "mmp-brand-lockup", href: "/", "aria-label": "MailMyPDF home" },
            h("span", { className: "mmp-brand-mark", "aria-hidden": "true" }, "M"),
            h(
              "span",
              { className: "mmp-brand-copy" },
              h("span", { className: "mmp-brand-name" }, "MailMyPDF"),
              h("span", { className: "mmp-brand-product" }, name),
            ),
          ),
          h(
            "nav",
            { className: "mmp-site-nav", "aria-label": "Primary navigation" },
            h("a", { href: "/workflows" }, "All workflows"),
            h("a", { href: directory }, `${name} workflows`),
            h("a", { href: "#how-it-works" }, "How it works"),
            h("a", { href: "#faq" }, "FAQ"),
          ),
          h(
            "div",
            { className: "mmp-site-actions" },
            h("a", { className: "mmp-button-secondary", href: AUTH_ENTRY_HREF }, "Sign in"),
            h("a", { className: "mmp-button-primary", href: directory }, "Start a workflow"),
          ),
        ),
      ),
      h("main", null, children),
      h(
        "footer",
        { className: "mmp-seo-footer" },
        h(
          "div",
          { className: "mmp-section__inner mmp-seo-footer__inner" },
          h(
            "div",
            null,
            h("strong", { className: "mmp-brand-name" }, "MailMyPDF"),
            h("p", null, `${name} workflows for document preparation, review, mailing, and proof.`),
          ),
          h(
            "nav",
            { "aria-label": "Footer navigation" },
            h("a", { href: "/workflows" }, "Workflows"),
            h("a", { href: "/privacy" }, "Privacy"),
            h("a", { href: "/terms" }, "Terms"),
            h("a", { href: "/contact" }, "Contact"),
          ),
        ),
      ),
    );
  };
}
