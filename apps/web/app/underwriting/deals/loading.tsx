export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-36 bg-white/8 rounded-lg" />
        <div className="h-9 w-28 bg-white/8 rounded-lg" />
      </div>

      {/* Deal cards */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface border border-edge rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-4 w-48 bg-white/10 rounded" />
                <div className="h-3 w-32 bg-white/6 rounded" />
              </div>
              <div className="h-6 w-20 bg-white/8 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="h-2.5 w-14 bg-white/6 rounded" />
                  <div className="h-4 w-20 bg-white/10 rounded" />
                </div>
              ))}
            </div>
            <div className="h-px bg-edge" />
            <div className="flex gap-2">
              <div className="h-7 w-20 bg-white/6 rounded-lg" />
              <div className="h-7 w-16 bg-white/6 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
