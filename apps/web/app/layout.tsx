import type { Metadata } from 'next'
import './globals.css'
import CustomCursor from '@/components/ui/custom-cursor'

export const metadata: Metadata = {
  title: 'KPI DRIVER',
  description: 'AI-powered real estate tools',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#0D1C2A', cursor: 'none' }}>
        <CustomCursor />
        {children}
      </body>
    </html>
  )
}
