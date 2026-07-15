export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-6 w-32 bg-white/8 rounded-lg" />
          <div className="h-3.5 w-52 bg-white/5 rounded" />
        </div>
        <div className="h-9 w-28 bg-white/8 rounded-lg" />
      </div>

      {/* Agent card grid */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface border border-edge rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-36 bg-white/8 rounded" />
              <div className="h-6 w-6 bg-white/5 rounded-lg" />
            </div>
            <div className="h-3 w-full bg-white/5 rounded" />
            <div className="h-3 w-4/5 bg-white/4 rounded" />
            <div className="h-7 w-28 bg-white/6 rounded-lg mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
