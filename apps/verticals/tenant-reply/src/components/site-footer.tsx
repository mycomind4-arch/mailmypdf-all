export function SiteFooter() {
  return (
    <footer className="border-t border-rule/60 bg-paper-deep/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="postmark w-fit">Tenant Reply · MailMyPDF</div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-ink-soft">
              Tenant-side responses to landlord notices — eviction, pay-or-quit, cure-or-quit, lease violations, repair demands, habitability complaints, and security deposit disputes.
            </p>
          </div>
          <div>
            <div className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">Product</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#how-it-works" className="text-ink-soft transition-colors hover:text-stamp">How it works</a></li>
              <li><a href="#notice-types" className="text-ink-soft transition-colors hover:text-stamp">Notice types</a></li>
              <li><a href="#start" className="text-ink-soft transition-colors hover:text-stamp">Start a response</a></li>
              <li><a href="#faq" className="text-ink-soft transition-colors hover:text-stamp">FAQ</a></li>
            </ul>
          </div>
          <div>
            <div className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ecosystem</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="https://notice-respond.pages.dev" className="text-ink-soft transition-colors hover:text-stamp">Notice Respond</a></li>
              <li><a href="https://claim-proof.pages.dev" className="text-ink-soft transition-colors hover:text-stamp">Claim Proof</a></li>
              <li><a href="https://mailmypdf.ai" className="text-ink-soft transition-colors hover:text-stamp">MailMyPDF</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-rule/60 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">© 2026 MailMyPDF. Tenant Reply is a document and correspondence tool — not a law firm, tenant advocacy organization, or legal aid provider.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href="#" className="transition-colors hover:text-stamp">Privacy</a>
            <a href="#" className="transition-colors hover:text-stamp">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
