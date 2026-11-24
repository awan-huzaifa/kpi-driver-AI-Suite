'use client'

import { useMotionValue } from 'framer-motion'
import DashboardBg from '@/components/ui/dashboard-bg'

export default function PlatformContentArea({ children }: { children: React.ReactNode }) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  return (
    <div
      className="main-content"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}
      onMouseMove={(e) => {
        const { left, top } = e.currentTarget.getBoundingClientRect()
        mouseX.set(e.clientX - left)
        mouseY.set(e.clientY - top)
      }}
    >
      <DashboardBg mouseX={mouseX} mouseY={mouseY} />
      {children}
    </div>
  )
}
