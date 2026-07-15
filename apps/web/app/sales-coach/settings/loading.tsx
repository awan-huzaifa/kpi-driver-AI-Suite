export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse max-w-xl">
      <div className="h-6 w-36 bg-white/8 rounded-lg" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-surface border border-edge rounded-xl p-5 space-y-4">
          <div className="h-4 w-32 bg-white/8 rounded" />
          <div className="space-y-2">
            <div className="h-3 w-20 bg-white/6 rounded" />
            <div className="h-9 bg-white/5 rounded-lg" />
          </div>
          <div className="h-8 w-24 bg-white/8 rounded-lg mt-2" />
        </div>
      ))}
    </div>
  );
}
