'use client'

export default function ContentShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="main-content" style={{ flex: 1, minHeight: '100vh', background: '#0D1C2A' }}>
      {children}
    </main>
  )
}
