export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-white/8 rounded-lg" />
          <div className="h-4 w-32 bg-white/5 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-white/8 rounded-lg" />
          <div className="h-9 w-24 bg-white/6 rounded-lg" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-edge rounded-xl p-5 space-y-3">
            <div className="h-3 w-24 bg-white/8 rounded" />
            <div className="h-8 w-16 bg-white/10 rounded" />
            <div className="h-2.5 w-20 bg-white/5 rounded" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface border border-edge rounded-xl p-5 space-y-3">
          <div className="h-4 w-32 bg-white/8 rounded" />
          <div className="h-40 bg-white/4 rounded-lg" />
        </div>
        <div className="bg-surface border border-edge rounded-xl p-5 space-y-3">
          <div className="h-4 w-32 bg-white/8 rounded" />
          <div className="h-40 bg-white/4 rounded-lg" />
        </div>
      </div>

      {/* Recent calls table */}
      <div className="bg-surface border border-edge rounded-xl overflow-hidden">
        <div className="h-10 bg-white/4 border-b border-edge" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 h-13 border-b border-edge/50">
            <div className="h-3 w-32 bg-white/8 rounded" />
            <div className="h-3 w-20 bg-white/6 rounded" />
            <div className="h-5 w-14 bg-white/6 rounded-full ml-auto" />
            <div className="h-5 w-12 bg-white/8 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
