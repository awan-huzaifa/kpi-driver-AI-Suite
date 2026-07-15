export default function Loading() {
  return (
    <div className="space-y-5 max-w-6xl mx-auto w-full animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-white/8 rounded-lg" />
          <div className="h-4 w-24 bg-white/5 rounded" />
        </div>
        <div className="h-9 w-28 bg-white/8 rounded-lg" />
      </div>

      {/* Deal cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-edge rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-52 bg-white/8 rounded" />
                <div className="h-3 w-28 bg-white/5 rounded" />
              </div>
              <div className="h-6 w-16 bg-white/6 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="space-y-1">
                  <div className="h-2.5 w-14 bg-white/5 rounded" />
                  <div className="h-4 w-20 bg-white/8 rounded" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <div className="h-7 w-20 bg-white/6 rounded-lg" />
              <div className="h-7 w-16 bg-white/5 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
