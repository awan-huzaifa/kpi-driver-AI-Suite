export default function Loading() {
  return (
    <div className="p-6 space-y-8 animate-pulse">
      {/* Welcome header */}
      <div className="space-y-2">
        <div className="h-7 w-52 bg-white/8 rounded-lg" />
        <div className="h-4 w-72 bg-white/5 rounded" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-edge rounded-xl p-4 space-y-3">
            <div className="h-3 w-24 bg-white/8 rounded" />
            <div className="h-7 w-16 bg-white/10 rounded" />
          </div>
        ))}
      </div>

      {/* App tiles */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface border border-edge rounded-xl p-5 space-y-3 h-36">
            <div className="w-10 h-10 bg-white/8 rounded-xl" />
            <div className="h-4 w-28 bg-white/8 rounded" />
            <div className="h-3 w-40 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
