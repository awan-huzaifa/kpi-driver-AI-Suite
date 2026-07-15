export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="h-6 w-40 bg-white/8 rounded-lg" />
      <div className="bg-surface border border-edge rounded-xl overflow-hidden">
        <div className="h-10 bg-white/4 border-b border-edge" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 h-13 border-b border-edge/50">
            <div className="h-3 w-36 bg-white/8 rounded" />
            <div className="h-3 w-28 bg-white/6 rounded" />
            <div className="h-3 w-24 bg-white/5 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
