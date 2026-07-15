export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-6 w-28 bg-white/8 rounded-lg" />
        <div className="h-9 w-28 bg-white/8 rounded-lg" />
      </div>
      <div className="bg-surface border border-edge rounded-xl overflow-hidden">
        <div className="h-10 bg-white/4 border-b border-edge" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 h-14 border-b border-edge/50">
            <div className="w-8 h-8 bg-white/8 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-36 bg-white/8 rounded" />
              <div className="h-2.5 w-28 bg-white/5 rounded" />
            </div>
            <div className="h-5 w-20 bg-white/6 rounded-full" />
            <div className="h-5 w-14 bg-white/6 rounded-full" />
            <div className="h-7 w-7 bg-white/6 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
