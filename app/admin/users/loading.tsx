export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-6 w-36 rounded-lg bg-yellow-100 animate-pulse" />
      <div className="rounded-2xl border border-yellow-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="h-9 w-64 rounded-lg bg-yellow-50 animate-pulse" />
          <div className="h-9 w-24 rounded-lg bg-yellow-50 animate-pulse" />
        </div>
        <div className="overflow-hidden rounded-xl border border-yellow-100">
          <div className="grid grid-cols-4 border-b border-yellow-100 bg-yellow-50/60 p-3 text-xs">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-3 w-20 rounded bg-yellow-100 animate-pulse" />
            ))}
          </div>
          <div className="divide-y divide-yellow-50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-4 p-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-4 w-24 rounded bg-yellow-50 animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
