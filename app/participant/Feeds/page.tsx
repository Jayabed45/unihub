'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

interface ParticipantProject {
  _id: string;
  name: string;
  description: string;
  status?: 'Pending' | 'Approved' | 'Rejected' | string;
}

interface ProjectActivity {
  title: string;
  hours?: string;
  resourcePerson?: string;
}

export default function ParticipantFeedsPage() {
  const [projects, setProjects] = useState<ParticipantProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantEmail, setParticipantEmail] = useState<string | null>(null);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinModalProject, setJoinModalProject] = useState<ParticipantProject | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinStatusByProject, setJoinStatusByProject] = useState<Record<string, 'pending'>>({});
  const [joinedStatusByProject, setJoinedStatusByProject] = useState<Record<string, 'joined'>>({});
  const [activitiesModalOpen, setActivitiesModalOpen] = useState(false);
  const [activitiesModalProject, setActivitiesModalProject] = useState<ParticipantProject | null>(null);
  const [activitiesForModal, setActivitiesForModal] = useState<ProjectActivity[]>([]);
  const [activityDetailOpen, setActivityDetailOpen] = useState(false);
  const [activityDetailActivity, setActivityDetailActivity] = useState<ProjectActivity | null>(null);
  const [activityDetailIndex, setActivityDetailIndex] = useState<number | null>(null);
  const [activityJoinLoading, setActivityJoinLoading] = useState(false);
  const [activityJoinError, setActivityJoinError] = useState<string | null>(null);
  const [activityJoinStatusByKey, setActivityJoinStatusByKey] = useState<Record<string, 'joined'>>({});
  const socketRef = useRef<Socket | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/projects');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load projects');
      }
      const data = (await res.json()) as ParticipantProject[];
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

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

  const fetchPendingFromNotifications = async () => {
    if (!participantEmail) return;

    try {
      const res = await fetch('http://localhost:5000/api/notifications');
      if (!res.ok) {
        return;
      }

      const data = (await res.json()) as Array<{
        _id: string;
        title: string;
        message: string;
        project?: string;
        read?: boolean;
      }>;

      const pendingByProject: Record<string, 'pending'> = {};
      const joinedByProject: Record<string, 'joined'> = {};

      data.forEach((item) => {
        const rawMessage = item.message || '';
        if (!item.project || !rawMessage) return;

        if (item.title === 'Join request' && item.read !== true) {
          const emailFromMessage = rawMessage.endsWith(' wants to join')
            ? rawMessage.replace(' wants to join', '').trim()
            : rawMessage.trim();

          if (emailFromMessage && emailFromMessage === participantEmail) {
            pendingByProject[item.project] = 'pending';
          }
        } else if (item.title === 'Join request approved') {
          if (participantEmail && rawMessage.includes(participantEmail)) {
            joinedByProject[item.project] = 'joined';
          }
        }
      });

      setJoinStatusByProject(pendingByProject);
      setJoinedStatusByProject(joinedByProject);
    } catch (notifError) {
      console.error('Failed to load pending join requests for participant', notifError);
    }
  };

  useEffect(() => {
    if (!participantEmail) return;
    fetchPendingFromNotifications();
  }, [participantEmail]);

  const fetchJoinedActivities = async () => {
    if (!participantEmail) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/projects/participant-activities?email=${encodeURIComponent(participantEmail)}`,
      );
      if (!res.ok) {
        return;
      }

      const data = (await res.json()) as Array<{
        projectId: string;
        activityId: number;
      }>;

      const joinedMap: Record<string, 'joined'> = {};
      data.forEach((item) => {
        const key = `${item.projectId}:${item.activityId}`;
        joinedMap[key] = 'joined';
      });

      if (Object.keys(joinedMap).length > 0) {
        setActivityJoinStatusByKey((prev) => ({ ...prev, ...joinedMap }));
      }
    } catch (err) {
      console.error('Failed to load joined activities for participant', err);
    }
  };

  useEffect(() => {
    if (!participantEmail) return;
    fetchJoinedActivities();
  }, [participantEmail]);

  useEffect(() => {
    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    socket.on('notification:new', (payload: any) => {
      if (!payload || typeof payload.title !== 'string') {
        return;
      }

      const title = payload.title;
      const message: string | undefined = (payload as any).message;

      if (title === 'New project created' || title === 'Project approved') {
        fetchProjects();
        return;
      }

      let currentEmail = participantEmail;
      if (!currentEmail) {
        try {
          const stored = window.localStorage.getItem('unihub-auth');
          if (stored) {
            const parsed = JSON.parse(stored) as { email?: string } | null;
            if (parsed?.email && typeof parsed.email === 'string') {
              currentEmail = parsed.email;
            }
          }
        } catch {
          // ignore storage read errors for realtime updates
        }
      }

      if (!message || !currentEmail || !message.includes(currentEmail)) {
        return;
      }

      if (
        title === 'Join request' ||
        title === 'Join request approved' ||
        title === 'Activity join'
      ) {
        fetchPendingFromNotifications();
        fetchJoinedActivities();
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const approvedProjects = projects.filter((project) => project.status === 'Approved');

  const openActivitiesModal = async (project: ParticipantProject) => {
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${project._id}`);
      if (!res.ok) {
        return;
      }

      const data = (await res.json()) as any;
      const trainingSnapshot = data && data.proposalData && data.proposalData['training-design'];

      let parsed: ProjectActivity[] = [];

      if (trainingSnapshot && Array.isArray(trainingSnapshot.editableCells)) {
        const cells: string[] = trainingSnapshot.editableCells;
        for (let i = 0; i + 1 < cells.length; i += 2) {
          const title = (cells[i] || '').trim();
          const resourcePerson = (cells[i + 1] || '').trim();
          if (!title) continue;
          parsed.push({
            title,
            resourcePerson: resourcePerson || undefined,
          });
        }
      }

      setActivitiesForModal(parsed);
      setActivitiesModalProject(project);
      setActivitiesModalOpen(true);
    } catch (e) {
      console.error('Failed to load activities for participant view', e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
        <p className="mt-1 text-sm text-gray-600">
          Browse approved extension projects and activities that you can join as a beneficiary.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-yellow-100 bg-white/60 p-6 text-sm text-gray-700 shadow-sm">
          <p className="text-gray-500">Loading projects…</p>
        </div>
      )}
      {activitiesModalOpen && activitiesModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl border border-yellow-100 bg-white p-6 text-sm text-gray-800 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-500">Competencies / Topics</p>
                <h3 className="mt-1 text-base font-semibold text-gray-900 line-clamp-2">
                  {activitiesModalProject.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActivitiesModalOpen(false);
                  setActivitiesModalProject(null);
                  setActivitiesForModal([]);
                }}
                className="rounded-full border border-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-50"
              >
                Close
              </button>
            </div>
            {activitiesForModal.length === 0 ? (
              <p className="text-sm text-gray-600">
                There are no competencies / topics listed yet for this project.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-gray-800">
                {activitiesForModal.map((activity, index) => {
                  const joinedKey =
                    activitiesModalProject && index !== null
                      ? `${activitiesModalProject._id}:${index}`
                      : undefined;
                  const isJoined = !!(joinedKey && activityJoinStatusByKey[joinedKey] === 'joined');

                  return (
                    <li
                      key={`${activity.title}-${index}`}
                      onClick={() => {
                        setActivityDetailActivity(activity);
                        setActivityDetailIndex(index);
                        setActivityJoinError(null);
                        setActivityDetailOpen(true);
                      }}
                      className="cursor-pointer rounded-xl border border-yellow-100 bg-yellow-50/60 px-3 py-2 transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                          {activity.resourcePerson ? (
                            <p className="mt-0.5 text-xs text-gray-600">Resource person: {activity.resourcePerson}</p>
                          ) : null}
                        </div>
                        {isJoined && (
                          <span className="mt-0.5 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            Joined
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {activityDetailOpen && activityDetailActivity && activitiesModalProject && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-yellow-100 bg-white p-6 text-sm text-gray-800 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-500">Activity details</p>
                <h3 className="mt-1 text-base font-semibold text-gray-900 line-clamp-2">
                  {activityDetailActivity.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActivityDetailOpen(false);
                  setActivityDetailActivity(null);
                  setActivityDetailIndex(null);
                  setActivityJoinError(null);
                }}
                className="rounded-full border border-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-50"
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              {activityDetailActivity.resourcePerson ? (
                <p className="text-xs text-gray-600">
                  Resource person: <span className="font-medium">{activityDetailActivity.resourcePerson}</span>
                </p>
              ) : null}

              {activityJoinError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {activityJoinError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActivityDetailOpen(false);
                    setActivityDetailActivity(null);
                    setActivityDetailIndex(null);
                    setActivityJoinError(null);
                  }}
                  className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 hover:bg-yellow-50"
                >
                  Not now
                </button>
                <button
                  type="button"
                  disabled={activityJoinLoading ||
                    !participantEmail ||
                    (activitiesModalProject &&
                      activityDetailIndex !== null &&
                      activityJoinStatusByKey[`${activitiesModalProject._id}:${activityDetailIndex}`] === 'joined')}
                  onClick={async () => {
                    if (!participantEmail) {
                      setActivityJoinError('Your email could not be detected. Please sign out and log in again.');
                      return;
                    }
                    if (!activitiesModalProject || activityDetailIndex === null) {
                      setActivityJoinError('Activity information is missing. Please close and reopen this project.');
                      return;
                    }

                    const key = `${activitiesModalProject._id}:${activityDetailIndex}`;

                    try {
                      setActivityJoinLoading(true);
                      setActivityJoinError(null);

                      const res = await fetch(
                        `http://localhost:5000/api/projects/${activitiesModalProject._id}/activities/${activityDetailIndex}/join`,
                        {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ email: participantEmail }),
                        },
                      );

                      if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data.message || 'Failed to join activity');
                      }

                      setActivityJoinStatusByKey((prev) => ({ ...prev, [key]: 'joined' }));
                    } catch (joinErr: any) {
                      setActivityJoinError(joinErr.message || 'Failed to join activity');
                    } finally {
                      setActivityJoinLoading(false);
                    }
                  }}
                  className="rounded-full bg-yellow-500 px-4 py-1.5 font-semibold text-white shadow hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {activitiesModalProject &&
                  activityDetailIndex !== null &&
                  activityJoinStatusByKey[`${activitiesModalProject._id}:${activityDetailIndex}`] === 'joined'
                    ? 'Joined activity'
                    : activityJoinLoading
                    ? 'Joining…'
                    : 'Join this activity'}
                </button>
              </div>
            </div>
          </div>
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
            There are currently no approved projects available. Please check back later or watch this page for new
            announcements.
          </p>
        </div>
      )}

      {!loading && !error && approvedProjects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {approvedProjects.map((project) => (
            <button
              key={project._id}
              type="button"
              onClick={() => {
                if (joinedStatusByProject[project._id] === 'joined') {
                  openActivitiesModal(project);
                } else {
                  setJoinModalProject(project);
                  setJoinError(null);
                  setJoinModalOpen(true);
                }
              }}
              className="flex h-full flex-col rounded-2xl border border-yellow-100 bg-white/70 p-4 text-left text-sm text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
                  {joinedStatusByProject[project._id] === 'joined'
                    ? 'Joined'
                    : joinStatusByProject[project._id] === 'pending'
                    ? 'Join request pending'
                    : 'Open for registration'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
      {joinModalOpen && joinModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-yellow-100 bg-white p-6 text-sm text-gray-800 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-500">Join project</p>
                <h3 className="mt-1 text-base font-semibold text-gray-900 line-clamp-2">{joinModalProject.name}</h3>
              </div>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              You are about to send a request to join this extension project as a beneficiary. The project leader will be
              notified and may approve or decline your request.
            </p>
            {joinError && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{joinError}</p>
            )}
            <div className="mt-4 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setJoinModalOpen(false);
                  setJoinModalProject(null);
                }}
                className="rounded-full border border-yellow-200 px-3 py-1 font-semibold text-yellow-700 hover:bg-yellow-50"
              >
                Not now
              </button>
              <button
                type="button"
                disabled={joinLoading || !!joinStatusByProject[joinModalProject._id]}
                onClick={async () => {
                  if (!participantEmail) {
                    setJoinError('Your email could not be detected. Please sign out and log in again.');
                    return;
                  }
                  try {
                    setJoinLoading(true);
                    setJoinError(null);
                    const res = await fetch(`http://localhost:5000/api/projects/${joinModalProject._id}/join`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ email: participantEmail }),
                    });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      throw new Error(data.message || 'Failed to send join request');
                    }
                    setJoinStatusByProject((prev) => ({ ...prev, [joinModalProject._id]: 'pending' }));
                    setJoinModalOpen(false);
                    setJoinModalProject(null);
                  } catch (joinErr: any) {
                    setJoinError(joinErr.message || 'Failed to send join request');
                  } finally {
                    setJoinLoading(false);
                  }
                }}
                className="rounded-full bg-yellow-500 px-4 py-1.5 font-semibold text-white shadow hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {joinStatusByProject[joinModalProject._id] === 'pending'
                  ? 'Request sent'
                  : joinLoading
                  ? 'Sending…'
                  : 'Join project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
