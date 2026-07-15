export default function Loading() {
  return (
    <>
      <div style={{ height: 56, borderBottom: '1px solid rgba(48,125,192,0.12)', background: 'rgba(9,21,35,0.85)', position: 'sticky', top: 0, zIndex: 30 }} />

      <div style={{ padding: '48px 36px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <div className="space-y-5 animate-pulse" style={{ maxWidth: 600 }}>
          <div className="space-y-2">
            <div className="h-8 w-48 bg-white/8 rounded-lg" />
            <div className="h-4 w-64 bg-white/5 rounded" />
          </div>

          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 28 }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-white/8 rounded-xl" />
                <div className="space-y-1.5">
                  <div className="h-4 w-24 bg-white/8 rounded" />
                  <div className="h-3 w-36 bg-white/5 rounded" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="h-3 w-20 bg-white/5 rounded" />
                  <div className="h-10 bg-white/5 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-16 bg-white/5 rounded" />
                  <div className="h-10 bg-white/4 rounded-lg" />
                </div>
              </div>
              <div className="h-8 w-28 bg-white/8 rounded-lg mt-5" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
