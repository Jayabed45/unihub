'use client';

export default function ParticipantProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Opportunities</h2>
        <p className="mt-1 text-sm text-gray-600">
          Browse approved extension projects and activities that you can join as a beneficiary.
        </p>
      </div>

      <div className="rounded-2xl border border-yellow-100 bg-white/60 p-6 text-sm text-gray-700 shadow-sm">
        <p className="text-gray-500">
          A list or grid of open opportunities will be displayed here. From each project, you will be able to view and
          register for specific activities once the data is wired.
        </p>
      </div>
    </div>
  );
}
