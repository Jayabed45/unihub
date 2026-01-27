'use client';

export default function ParticipantFeedsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Feeds</h2>
        <p className="mt-1 text-sm text-gray-600">
          Stay updated with the latest announcements and extension opportunities curated for participants.
        </p>
      </div>

      <div className="rounded-2xl border border-yellow-100 bg-white/60 p-6 text-sm text-gray-700 shadow-sm">
        <p className="text-gray-500">
          Announcement and project feed content will appear here. You can highlight approved projects, upcoming
          activities, and reminders once the data is wired.
        </p>
      </div>
    </div>
  );
}
