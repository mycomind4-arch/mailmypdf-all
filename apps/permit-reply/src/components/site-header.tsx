import { useState, useEffect } from 'react'

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header className={`sticky top-0 z-50 border-b transition-colors ${scrolled ? 'border-rule/60 bg-paper/95 backdrop-blur-sm' : 'border-transparent bg-paper'}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <a href="/" className="flex items-center gap-2.5"><span className="postmark">Permit Reply</span></a>
        <nav className="hidden items-center gap-6 sm:flex">
          <a href="#how-it-works" className="text-sm text-ink-soft transition-colors hover:text-stamp">How it works</a>
          <a href="#notice-types" className="text-sm text-ink-soft transition-colors hover:text-stamp">Notice types</a>
          <a href="#code" className="text-sm text-ink-soft transition-colors hover:text-stamp">Code reference</a>
          <a href="#faq" className="text-sm text-ink-soft transition-colors hover:text-stamp">FAQ</a>
        </nav>
        <a href="#start" className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">
          Start a response
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
        </a>
      </div>
    </header>
  )
}
