export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="h-7 w-40 bg-white/8 rounded-lg" />

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-edge rounded-xl p-4 space-y-3">
            <div className="h-3 w-24 bg-white/8 rounded" />
            <div className="h-7 w-16 bg-white/10 rounded" />
            <div className="h-2.5 w-20 bg-white/6 rounded" />
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-24 bg-surface border border-edge rounded-lg" />
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="bg-surface border border-edge rounded-xl p-4 h-48" />

      {/* Table rows */}
      <div className="bg-surface border border-edge rounded-xl overflow-hidden">
        <div className="h-10 bg-white/4 border-b border-edge" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 h-12 border-b border-edge/50">
            <div className="h-3 w-28 bg-white/8 rounded" />
            <div className="h-3 w-16 bg-white/6 rounded" />
            <div className="h-3 w-20 bg-white/6 rounded" />
            <div className="h-3 w-12 bg-white/6 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
