export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse max-w-xl">
      <div className="space-y-1.5">
        <div className="h-6 w-36 bg-white/8 rounded-lg" />
        <div className="h-3.5 w-64 bg-white/5 rounded" />
      </div>

      {/* Add number input row */}
      <div className="flex gap-2">
        <div className="h-10 flex-1 bg-white/5 rounded-lg" />
        <div className="h-10 w-24 bg-white/8 rounded-lg" />
      </div>

      {/* Numbers list */}
      <div className="bg-surface border border-edge rounded-xl overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 h-14 border-b border-edge/50">
            <div className="h-3 w-36 bg-white/8 rounded flex-1" />
            <div className="h-3 w-24 bg-white/5 rounded" />
            <div className="h-7 w-7 bg-white/6 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
