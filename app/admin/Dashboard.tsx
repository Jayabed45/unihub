export default function AdminDashboard() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-4xl p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome, Administrator!</p>
        {/* View-only components for projects, users, etc. will go here */}
      </div>
    </div>
  );
}
