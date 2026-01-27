'use client';

import { useEffect, useState } from 'react';

interface ParticipantProject {
  _id: string;
  name: string;
  description: string;
  status?: 'Pending' | 'Approved' | 'Rejected' | string;
}

export default function ParticipantOpportunitiesPage() {
  const [projects, setProjects] = useState<ParticipantProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('http://localhost:5000/api/projects');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to load opportunities');
        }
        const data = (await res.json()) as ParticipantProject[];
        setProjects(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load opportunities');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const approvedProjects = projects.filter((project) => project.status === 'Approved');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Opportunities</h2>
        <p className="mt-1 text-sm text-gray-600">
          Browse approved extension projects and activities that you can join as a beneficiary.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-yellow-100 bg-white/60 p-6 text-sm text-gray-700 shadow-sm">
          <p className="text-gray-500">Loading opportunities…</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-100 bg-red-50/80 p-6 text-sm text-red-700 shadow-sm">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && approvedProjects.length === 0 && (
        <div className="rounded-2xl border border-yellow-100 bg-white/60 p-6 text-sm text-gray-700 shadow-sm">
          <p className="text-gray-500">
            There are currently no approved projects open as opportunities. Please check back later or watch the Feeds
            page for new announcements.
          </p>
        </div>
      )}

      {!loading && !error && approvedProjects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {approvedProjects.map((project) => (
            <div
              key={project._id}
              className="flex h-full flex-col rounded-2xl border border-yellow-100 bg-white/70 p-4 text-sm text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="line-clamp-2 text-base font-semibold text-gray-900">{project.name}</h3>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Approved
                </span>
              </div>
              <p className="line-clamp-3 text-sm text-gray-600">{project.description}</p>
              <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-gray-500">
                <span>Project-based opportunity</span>
                <span className="rounded-full border border-yellow-100 bg-yellow-50 px-2 py-0.5 font-medium text-yellow-700">
                  Open for registration soon
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
