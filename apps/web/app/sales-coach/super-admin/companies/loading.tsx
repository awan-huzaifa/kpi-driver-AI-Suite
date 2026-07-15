export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-6 w-36 bg-white/8 rounded-lg" />
        <div className="h-9 w-32 bg-white/8 rounded-lg" />
      </div>
      <div className="bg-surface border border-edge rounded-xl overflow-hidden">
        <div className="h-10 bg-white/4 border-b border-edge" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 h-14 border-b border-edge/50">
            <div className="h-3 w-40 bg-white/8 rounded flex-1" />
            <div className="h-3 w-24 bg-white/6 rounded" />
            <div className="h-3 w-16 bg-white/6 rounded" />
            <div className="h-7 w-20 bg-white/6 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
