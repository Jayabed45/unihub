export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-6 w-48 rounded-lg bg-yellow-100 animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-yellow-100 bg-white p-4 shadow-sm">
            <div className="h-4 w-2/3 rounded bg-yellow-100 animate-pulse" />
            <div className="mt-3 h-8 w-1/2 rounded bg-yellow-50 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-yellow-100 bg-white p-4 shadow-sm">
        <div className="h-4 w-32 rounded bg-yellow-100 animate-pulse" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-yellow-50 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
