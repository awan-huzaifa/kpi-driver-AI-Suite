export default function Loading() {
  return (
    <div className="space-y-5 max-w-6xl mx-auto w-full animate-pulse">
      {/* Back link + header */}
      <div>
        <div className="h-3.5 w-24 bg-white/5 rounded mb-4" />
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-72 bg-white/8 rounded-lg" />
            <div className="h-3.5 w-32 bg-white/5 rounded" />
          </div>
          <div className="flex gap-2 shrink-0">
            <div className="h-7 w-16 bg-white/6 rounded-lg" />
            <div className="h-7 w-20 bg-white/6 rounded-lg" />
            <div className="h-7 w-24 bg-white/6 rounded-lg" />
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-edge rounded-xl p-5 space-y-2">
            <div className="h-2.5 w-20 bg-white/5 rounded" />
            <div className="h-7 w-32 bg-white/10 rounded" />
            <div className="h-2.5 w-24 bg-white/5 rounded" />
          </div>
        ))}
      </div>

      {/* Summary card */}
      <div className="bg-card border border-edge rounded-xl p-5 space-y-3">
        <div className="h-3 w-36 bg-white/6 rounded" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-white/5 rounded" />
          <div className="h-3 w-5/6 bg-white/5 rounded" />
          <div className="h-3 w-4/6 bg-white/4 rounded" />
        </div>
      </div>

      {/* 2-col property + repair */}
      <div className="grid grid-cols-2 gap-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-card border border-edge rounded-xl p-5 space-y-4">
            <div className="h-3 w-24 bg-white/6 rounded" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="space-y-1">
                  <div className="h-2.5 w-14 bg-white/4 rounded" />
                  <div className="h-4 w-20 bg-white/7 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Comps table */}
      <div className="bg-card border border-edge rounded-xl p-5 space-y-3">
        <div className="h-3 w-20 bg-white/6 rounded" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 h-10 items-center border-b border-edge/40">
              <div className="h-3 w-48 bg-white/6 rounded flex-1" />
              <div className="h-3 w-16 bg-white/5 rounded" />
              <div className="h-3 w-16 bg-white/5 rounded" />
              <div className="h-3 w-12 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
