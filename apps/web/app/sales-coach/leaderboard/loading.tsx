export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-36 bg-white/8 rounded-lg" />
        <div className="h-8 w-28 bg-surface border border-edge rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface border border-edge rounded-xl p-4 space-y-3">
            <div className="h-3 w-24 bg-white/8 rounded" />
            <div className="h-7 w-16 bg-white/10 rounded" />
          </div>
        ))}
      </div>

      {/* Leaderboard table */}
      <div className="bg-surface border border-edge rounded-xl overflow-hidden">
        <div className="h-10 bg-white/4 border-b border-edge" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 h-14 border-b border-edge/50">
            <div className="h-4 w-4 bg-white/6 rounded" />
            <div className="w-8 h-8 bg-white/8 rounded-full shrink-0" />
            <div className="h-3 w-28 bg-white/8 rounded" />
            <div className="h-3 w-16 bg-white/6 rounded ml-auto" />
            <div className="h-3 w-12 bg-white/6 rounded" />
            <div className="h-5 w-10 bg-white/8 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
