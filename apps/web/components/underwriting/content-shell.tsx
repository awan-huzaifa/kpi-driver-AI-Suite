'use client'

import { useMotionValue } from 'framer-motion'
import DashboardBg from '@/components/ui/dashboard-bg'
import { Topbar } from '@/components/underwriting/topbar'

export function ContentShell({ children }: { children: React.ReactNode }) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  return (
    <div
      className="flex-1 flex flex-col min-w-0 overflow-hidden relative"
      onMouseMove={(e) => {
        const { left, top } = e.currentTarget.getBoundingClientRect()
        mouseX.set(e.clientX - left)
        mouseY.set(e.clientY - top)
      }}
    >
      <DashboardBg mouseX={mouseX} mouseY={mouseY} />
      <div className="relative z-10 flex flex-col flex-1 min-h-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 lg:px-10 lg:py-8 w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
