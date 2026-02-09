'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface JoinedActivity {
  projectId: string;
  projectName: string;
  activityId: number;
  activityTitle: string;
  status: 'registered' | 'present' | 'absent';
  updatedAt?: string;
  startAt?: string | null;
  endAt?: string | null;
  location?: string | null;
}

export default function ParticipantActivitiesPage() {
  const [participantEmail, setParticipantEmail] = useState<string | null>(null);
  const [activities, setActivities] = useState<JoinedActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJoinedActivities = useCallback(async () => {
    if (!participantEmail) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `http://localhost:5000/api/projects/participant-activities?email=${encodeURIComponent(participantEmail)}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load joined activities');
      }
      const data = (await res.json()) as JoinedActivity[];
      setActivities(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load joined activities');
    } finally {
      setLoading(false);
    }
  }, [participantEmail]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('unihub-auth');
      if (!stored) return;
      const parsed = JSON.parse(stored) as { email?: string } | null;
      if (parsed?.email && typeof parsed.email === 'string') {
        setParticipantEmail(parsed.email);
      }
    } catch (readError) {
      console.error('Failed to read participant email from storage', readError);
    }
  }, []);

  useEffect(() => {
    if (participantEmail) {
      fetchJoinedActivities();
    }
  }, [participantEmail, fetchJoinedActivities]);

  const groupedByProject = useMemo(() => {
    if (!activities.length) return [] as Array<{
      projectId: string;
      projectName: string;
      upcoming: JoinedActivity[];
      ongoing: JoinedActivity[];
      completed: JoinedActivity[];
    }>;

    const map = new Map<string, { projectId: string; projectName: string; items: JoinedActivity[] }>();

    activities.forEach((activity) => {
      const existing = map.get(activity.projectId);
      if (existing) {
        existing.items.push(activity);
      } else {
        map.set(activity.projectId, {
          projectId: activity.projectId,
          projectName: activity.projectName,
          items: [activity],
        });
      }
    });

    const now = Date.now();

    return Array.from(map.values()).map((group) => {
      const upcoming: JoinedActivity[] = [];
      const ongoing: JoinedActivity[] = [];
      const completed: JoinedActivity[] = [];

      const sorted = [...group.items].sort((a, b) => a.activityId - b.activityId);

      sorted.forEach((item) => {
        const startMs = item.startAt ? new Date(item.startAt).getTime() : NaN;
        const endMs = item.endAt ? new Date(item.endAt).getTime() : NaN;
        const hasStart = Number.isFinite(startMs);
        const hasEnd = Number.isFinite(endMs);
        const isOngoing = hasStart && hasEnd && startMs <= now && now <= endMs;
        const isCompleted = hasEnd && endMs < now;

        if (isOngoing) {
          ongoing.push(item);
        } else if (isCompleted) {
          completed.push(item);
        } else {
          // No schedule or in the future – treat as upcoming
          upcoming.push(item);
        }
      });

      return {
        projectId: group.projectId,
        projectName: group.projectName,
        upcoming,
        ongoing,
        completed,
      };
    });
  }, [activities]);

  if (!participantEmail) {
    return (
      <div className="rounded-2xl border border-yellow-100 bg-white/60 p-6 text-sm text-gray-700 shadow-sm">
        <p className="text-gray-500">
          Your email could not be detected. Please sign out and log in again to see your joined activities.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">My joined activities</h2>
        <p className="mt-1 text-sm text-gray-600">
          View the extension activities you have joined, grouped by project. Attendance will be managed by the project
          leader.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-yellow-100 bg-white/60 p-6 text-sm text-gray-700 shadow-sm">
          <p className="text-gray-500">Loading your joined activities…</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-100 bg-red-50/80 p-6 text-sm text-red-700 shadow-sm">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && groupedByProject.length === 0 && (
        <div className="rounded-2xl border border-yellow-100 bg-white/60 p-6 text-sm text-gray-700 shadow-sm">
          <p className="text-gray-500">
            You have not joined any activities yet. Browse projects in the Feeds page and join activities to see them
            listed here.
          </p>
        </div>
      )}

      {!loading && !error && groupedByProject.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groupedByProject.map((group) => {
            const hasUpcoming = group.upcoming.length > 0;
            const hasOngoing = group.ongoing.length > 0;
            const hasCompleted = group.completed.length > 0;

            return (
              <section
                key={group.projectId}
                className="flex h-full flex-col rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-800 shadow-sm"
              >
                <header className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{group.projectName}</h3>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      Activities you joined under this project, grouped by schedule.
                    </p>
                  </div>
                </header>

                <div className="space-y-3 text-sm text-gray-800">
                  {hasUpcoming && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Upcoming
                      </p>
                      <ul className="space-y-2">
                        {group.upcoming.map((activity) => (
                          <ActivityItem
                            key={`${activity.projectId}:${activity.activityId}`}
                            activity={activity}
                            activityId={activity.activityId}
                            projectId={activity.projectId}
                          />
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasOngoing && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                        Ongoing
                      </p>
                      <ul className="space-y-2">
                        {group.ongoing.map((activity) => (
                          <ActivityItem
                            key={`${activity.projectId}:${activity.activityId}`}
                            activity={activity}
                            activityId={activity.activityId}
                            projectId={activity.projectId}
                          />
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasCompleted && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Completed
                      </p>
                      <ul className="space-y-2">
                        {group.completed.map((activity) => (
                          <ActivityItem
                            key={`${activity.projectId}:${activity.activityId}`}
                            activity={activity}
                            activityId={activity.activityId}
                            projectId={activity.projectId}
                          />
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Extracted ActivityItem component for better performance
const ActivityItem = ({ activity, activityId, projectId }: { 
  activity: JoinedActivity; 
  activityId: number; 
  projectId: string 
}) => (
  <li
    key={`${projectId}:${activityId}`}
    className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
  >
    <div>
      <p className="text-sm font-semibold text-gray-900">{activity.activityTitle}</p>
      <p className="mt-0.5 text-[11px] text-gray-500">
        Activity #{activityId + 1}
      </p>
    </div>
    <StatusBadge status={activity.status} />
  </li>
);

// Extracted StatusBadge component
const StatusBadge = ({ status }: { status: 'registered' | 'present' | 'absent' }) => {
  const statusConfig = {
    registered: { 
      text: 'Registered', 
      className: 'border-yellow-200 bg-white text-yellow-700' 
    },
    present: { 
      text: 'Marked present', 
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700' 
    },
    absent: { 
      text: 'Marked absent', 
      className: 'border-red-200 bg-red-50 text-red-700' 
    }
  } as const;

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${statusConfig[status].className}`}>
      {statusConfig[status].text}
    </span>
  );
};

// Side panel has been removed; all activities are now visible and grouped within each project card.
