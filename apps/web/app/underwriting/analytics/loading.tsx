export default function Loading() {
  return (
    <div className="space-y-5 max-w-6xl mx-auto w-full animate-pulse">
      <div className="h-7 w-44 bg-white/8 rounded-lg" />

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-edge rounded-xl p-5 space-y-2">
            <div className="h-2.5 w-20 bg-white/5 rounded" />
            <div className="h-7 w-24 bg-white/10 rounded" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-card border border-edge rounded-xl p-5 space-y-3">
            <div className="h-4 w-32 bg-white/8 rounded" />
            <div className="h-44 bg-white/4 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
