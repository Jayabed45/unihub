'use client';

export default function AdminDashboardPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center rounded-3xl border border-amber-100 bg-white/80 p-16 text-center shadow-sm">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold text-gray-900">Welcome, Admin!</h1>
        <p className="text-sm text-gray-500">Use the sidebar to manage projects, users, and system insights.</p>
      </div>
    </div>
  );
}
