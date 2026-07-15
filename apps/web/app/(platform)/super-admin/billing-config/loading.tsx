export default function Loading() {
  return (
    <>
      <div style={{ height: 56, borderBottom: '1px solid rgba(48,125,192,0.12)', background: 'rgba(9,21,35,0.85)', position: 'sticky', top: 0, zIndex: 30 }} />

      <div style={{ padding: '48px 36px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <div className="space-y-5 animate-pulse">
          <div className="space-y-1.5">
            <div className="h-7 w-40 bg-white/8 rounded-lg" />
            <div className="h-3.5 w-64 bg-white/5 rounded" />
          </div>

          {/* Company selector */}
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-28 bg-white/6 rounded-lg" />
            ))}
          </div>

          {/* Config cards */}
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-surface border border-edge rounded-xl p-5 space-y-4">
                <div className="space-y-1.5">
                  <div className="h-4 w-32 bg-white/8 rounded" />
                  <div className="h-3 w-44 bg-white/5 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-white/5 rounded" />
                  <div className="h-10 bg-white/5 rounded-lg" />
                </div>
                <div className="h-6 w-28 bg-white/6 rounded" />
              </div>
            ))}
          </div>

          <div className="h-9 w-28 bg-white/8 rounded-lg" />
        </div>
      </div>
    </>
  )
}
