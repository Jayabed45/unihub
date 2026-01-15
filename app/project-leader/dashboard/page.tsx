'use client';

import { usePathname } from 'next/navigation';

import { projectLeaderNavigation } from '../navigation';

export default function ProjectLeaderDashboard() {
  const pathname = usePathname();
  const activeItem =
    projectLeaderNavigation.find((item) => pathname === item.href || pathname?.startsWith(`${item.href}/`)) ??
    projectLeaderNavigation[0];

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-yellow-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          <p className="mt-1 text-sm text-gray-500">
            Launch task-specific workflows from here. Actions update based on the selected section.
          </p>
          <div className="mt-4 space-y-2">
            <button className="w-full rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-yellow-600">
              Create new {activeItem.name === 'Participants' ? 'beneficiary list' : activeItem.name.toLowerCase()}
            </button>
            <button className="w-full rounded-lg border border-yellow-200 px-4 py-2 text-sm font-semibold text-yellow-600 hover:bg-yellow-50">
              View recent updates
            </button>
            <button className="w-full rounded-lg border border-yellow-200 px-4 py-2 text-sm font-semibold text-yellow-600 hover:bg-yellow-50">
              Export current data
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-yellow-100 bg-white p-6 shadow-sm md:col-span-2 xl:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900">{activeItem.name} Highlights</h3>
          <p className="mt-1 text-sm text-gray-500">
            Summary metrics, charts, or status updates for the selected workflow will appear here.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
              <p className="text-xs font-medium uppercase text-yellow-700">In Focus</p>
              <p className="mt-2 text-sm text-gray-700">
                Highlight the most urgent items that need your attention within the {activeItem.name.toLowerCase()} stream.
              </p>
            </div>
            <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
              <p className="text-xs font-medium uppercase text-yellow-700">Next Steps</p>
              <p className="mt-2 text-sm text-gray-700">
                Outline the upcoming actions or deadlines tied to your current engagements.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-yellow-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Workspace Timeline</h3>
        <p className="mt-1 text-sm text-gray-500">
          Recent activity logs and upcoming milestones will be surfaced here for quick reference.
        </p>
        <ul className="mt-4 space-y-3 text-sm text-gray-600">
          <li className="rounded-lg border border-yellow-100 bg-yellow-50 p-3">
            Activity feed for {activeItem.name.toLowerCase()} coming soon.
          </li>
          <li className="rounded-lg border border-yellow-100 bg-yellow-50 p-3">
            Integrate real data from MongoDB collections when available.
          </li>
          <li className="rounded-lg border border-yellow-100 bg-yellow-50 p-3">
            Build filters and sorting controls once CRUD APIs are ready.
          </li>
        </ul>
      </section>
    </div>
  );
}
