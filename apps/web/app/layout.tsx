import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import CustomCursor from '@/components/ui/custom-cursor'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'KPI Driver AI Suite',
  description: 'AI-powered real estate tools',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body style={{ background: '#0D1C2A', cursor: 'none' }}>
        <CustomCursor />
        {children}
      </body>
    </html>
  )
}
