export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-7 w-24 bg-white/8 rounded-lg" />

      <div className="flex gap-3 border-b border-edge pb-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-white/6 rounded-t-lg" />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface border border-edge rounded-xl p-5 space-y-3">
            <div className="h-3 w-24 bg-white/8 rounded" />
            <div className="h-8 w-28 bg-white/10 rounded" />
          </div>
        ))}
      </div>

      <div className="bg-surface border border-edge rounded-xl p-5 space-y-4">
        <div className="h-4 w-36 bg-white/8 rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 h-10 border-b border-edge/50">
            <div className="h-3 w-24 bg-white/8 rounded" />
            <div className="h-3 w-16 bg-white/6 rounded ml-auto" />
            <div className="h-3 w-20 bg-white/6 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
