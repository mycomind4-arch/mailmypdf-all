import Link from 'next/link'

export default async function WorkflowLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <>
      {children}
      <div style={{ position: 'sticky', bottom: 0, zIndex: 40, borderTop: '1px solid rgba(255,255,255,.1)', background: 'rgba(10,10,15,.96)', backdropFilter: 'blur(14px)' }}>
        <div className="container" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>Ready to begin this benefits workflow?</span>
          <Link href={`/workflows/${id}/start`} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.7rem 1.2rem', borderRadius: '0.55rem', background: '#a78bfa', color: '#111827', fontWeight: 700, textDecoration: 'none' }}>Start this workflow →</Link>
        </div>
      </div>
    </>
  )
}
