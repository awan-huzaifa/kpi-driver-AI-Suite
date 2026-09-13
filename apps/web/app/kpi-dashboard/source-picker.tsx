'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { C } from '@/components/platform/brand'

interface Props {
  value:       string
  options:     string[]
  onChange:    (v: string) => void
  accentColor?: string
}

export default function SourcePicker({ value, options, onChange, accentColor = C.blue }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const label = value || 'All Sources'
  const active = !!value

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 10px 6px 12px', borderRadius: 9,
          background: '#0b1929',
          border: `1px solid ${open || active ? `${accentColor}80` : 'rgba(48,125,192,0.25)'}`,
          boxShadow: open ? `0 0 0 1px ${accentColor}22` : 'none',
          cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Source
        </span>
        <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: active ? '#e2e8f0' : '#475569' }}>
          {label}
        </span>
        <ChevronDown
          size={11}
          style={{
            color: '#475569', flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        />
      </button>

      {open && (
        <div style={{
          position: 'absolute', zIndex: 9999, top: 'calc(100% + 6px)', right: 0,
          background: '#0b1929', border: '1px solid rgba(48,125,192,0.25)',
          borderRadius: 10, padding: '6px 0',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
          minWidth: 170,
        }}>
          {['', ...options].map(opt => {
            const isSelected = value === opt
            return (
              <button
                key={opt || '__all'}
                onClick={() => { onChange(opt); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '7px 14px', fontSize: 12, fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? `${accentColor}18` : 'transparent',
                  color: isSelected ? '#e2e8f0' : '#94a3b8',
                  border: 'none', cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                {opt || 'All Sources'}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
