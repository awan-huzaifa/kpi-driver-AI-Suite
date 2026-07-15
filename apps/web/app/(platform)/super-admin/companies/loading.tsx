export default function Loading() {
  return (
    <>
      <div style={{ height: 56, borderBottom: '1px solid rgba(48,125,192,0.12)', background: 'rgba(9,21,35,0.85)', position: 'sticky', top: 0, zIndex: 30 }} />

      <div style={{ padding: '48px 36px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <div className="space-y-5 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-7 w-36 bg-white/8 rounded-lg" />
              <div className="h-3.5 w-52 bg-white/5 rounded" />
            </div>
            <div className="h-9 w-32 bg-white/8 rounded-lg" />
          </div>

          <div className="bg-surface border border-edge rounded-xl overflow-hidden">
            <div className="h-11 bg-white/4 border-b border-edge" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 h-14 border-b border-edge/50">
                <div className="h-3 w-44 bg-white/8 rounded flex-1" />
                <div className="h-3 w-28 bg-white/6 rounded" />
                <div className="h-3 w-20 bg-white/5 rounded" />
                <div className="h-3 w-20 bg-white/5 rounded" />
                <div className="flex gap-2">
                  <div className="h-7 w-14 bg-white/6 rounded-lg" />
                  <div className="h-7 w-7 bg-white/5 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
