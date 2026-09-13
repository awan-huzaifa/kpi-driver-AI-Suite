'use client'

export default function ContentShell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ marginLeft: 248, flex: 1, minHeight: '100vh', background: '#0D1C2A' }}>
      {children}
    </main>
  )
}
