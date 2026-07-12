'use client'

import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useAnimationFrame,
  type MotionValue,
} from 'framer-motion'

const GRID_SIZE = 40

function GridLayer({ offsetX, offsetY, id }: {
  offsetX: MotionValue<number>
  offsetY: MotionValue<number>
  id: string
}) {
  return (
    <svg style={{ width: '100%', height: '100%' }}>
      <defs>
        <motion.pattern
          id={id}
          width={GRID_SIZE}
          height={GRID_SIZE}
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
            fill="none"
            stroke="rgba(48,125,192,0.7)"
            strokeWidth="1"
          />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

interface Props {
  mouseX: MotionValue<number>
  mouseY: MotionValue<number>
}

export default function DashboardBg({ mouseX, mouseY }: Props) {
  const gridOffsetX = useMotionValue(0)
  const gridOffsetY = useMotionValue(0)

  useAnimationFrame(() => {
    gridOffsetX.set((gridOffsetX.get() + 0.4) % GRID_SIZE)
    gridOffsetY.set((gridOffsetY.get() + 0.4) % GRID_SIZE)
  })

  const maskImage = useMotionTemplate`radial-gradient(300px circle at ${mouseX}px ${mouseY}px, black, transparent)`

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>

      {/* Base grid — always visible, very subtle */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.06 }}>
        <GridLayer offsetX={gridOffsetX} offsetY={gridOffsetY} id="kpi-grid-base" />
      </div>

      {/* Active grid — revealed under cursor */}
      <motion.div style={{
        position: 'absolute', inset: 0, opacity: 0.35,
        maskImage, WebkitMaskImage: maskImage,
      }}>
        <GridLayer offsetX={gridOffsetX} offsetY={gridOffsetY} id="kpi-grid-active" />
      </motion.div>

      {/* Ambient blur spheres — brand colors */}
      {/* Yellow — top right */}
      <div style={{
        position: 'absolute', right: '-15%', top: '-15%',
        width: '38%', height: '38%', borderRadius: '50%',
        background: 'rgba(252,175,23,0.10)',
        filter: 'blur(110px)',
      }} />
      {/* Blue — top right, smaller */}
      <div style={{
        position: 'absolute', right: '12%', top: '-8%',
        width: '16%', height: '16%', borderRadius: '50%',
        background: 'rgba(48,125,192,0.18)',
        filter: 'blur(80px)',
      }} />
      {/* Green — bottom left */}
      <div style={{
        position: 'absolute', left: '-10%', bottom: '-18%',
        width: '38%', height: '38%', borderRadius: '50%',
        background: 'rgba(67,183,73,0.10)',
        filter: 'blur(110px)',
      }} />
    </div>
  )
}
