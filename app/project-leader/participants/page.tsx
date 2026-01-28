'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

interface JoinRequestNotification {
  _id: string;
  title: string;
  message: string;
  createdAt?: string;
  project?: string;
  read?: boolean;
}

interface JoinRequestRow {
  id: string;
  email: string;
  projectId?: string;
  projectName?: string;
  createdAtLabel: string;
}

interface ApprovedParticipantActivity {
  activityId: number;
  activityTitle: string;
  status: 'registered' | 'present' | 'absent';
  updatedAt?: string;
}

interface ApprovedParticipantRow {
  key: string;
  email: string;
  projectId: string;
  projectName: string;
  activities: ApprovedParticipantActivity[];
}

export default function ProjectLeaderParticipantsPage() {
  const [rows, setRows] = useState<JoinRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const [approvedRows, setApprovedRows] = useState<ApprovedParticipantRow[]>([]);
  const [approvedLoading, setApprovedLoading] = useState(false);
  const [approvedError, setApprovedError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [activitiesModalOpen, setActivitiesModalOpen] = useState(false);
  const [activitiesModalRow, setActivitiesModalRow] = useState<ApprovedParticipantRow | null>(null);
  const [activityActionError, setActivityActionError] = useState<string | null>(null);
  const [activityDeleteLoadingKey, setActivityDeleteLoadingKey] = useState<string | null>(null);
  const [highlightActivity, setHighlightActivity] = useState<
    | {
        projectId: string;
        participantEmail: string;
        activityTitle: string;
      }
    | null
  >(null);
  const fetchPendingRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/notifications');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load join requests');
      }

      const data = (await res.json()) as JoinRequestNotification[];

      const allJoinRequests = data.filter(
        (item) => item.title === 'Join request' && typeof item.message === 'string' && !!item.project,
      );

      const joinResponses = data.filter(
        (item) => item.title === 'Join request approved' || item.title === 'Join request declined',
      );

      const joinNotifications = allJoinRequests.filter((joinItem) => {
        const message = joinItem.message || '';
        const emailFromJoin = message.endsWith(' wants to join')
          ? message.replace(' wants to join', '').trim()
          : message.trim();

        if (!emailFromJoin) return false;

        const hasResponse = joinResponses.some((resp) => {
          if (!resp.message || !resp.project || !joinItem.project) return false;
          if (String(resp.project) !== String(joinItem.project)) return false;

          const respEmail = resp.message.split(' - ')[0]?.trim();
          return respEmail === emailFromJoin;
        });

        return !hasResponse;
      });

      if (joinNotifications.length === 0) {
        setRows([]);
        return;
      }

      const baseRows: JoinRequestRow[] = joinNotifications.map((item) => {
        const message = item.message || '';
        const email = message.endsWith(' wants to join')
          ? message.replace(' wants to join', '').trim()
          : message.trim();

        const createdAtLabel = item.createdAt
          ? new Date(item.createdAt).toLocaleString('en-PH', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : '';

        return {
          id: item._id,
          email,
          projectId: item.project,
          projectName: undefined,
          createdAtLabel,
        };
      });

      const uniqueRowsMap = new Map<string, JoinRequestRow>();
      baseRows.forEach((row) => {
        if (!row.projectId) return;
        const key = `${row.projectId}:${row.email}`;
        if (!uniqueRowsMap.has(key)) {
          uniqueRowsMap.set(key, row);
        }
      });

      const dedupedRows = Array.from(uniqueRowsMap.values());

      const projectIds = Array.from(
        new Set(dedupedRows.map((row) => row.projectId).filter((id): id is string => !!id)),
      );

      const projectNameById: Record<string, string> = {};

      if (projectIds.length > 0) {
        await Promise.all(
          projectIds.map(async (projectId) => {
            try {
              const resProject = await fetch(`http://localhost:5000/api/projects/${projectId}`);
              if (!resProject.ok) return;
              const project = (await resProject.json()) as { name?: string };
              if (project?.name) {
                projectNameById[projectId] = project.name;
              }
            } catch {
              // ignore individual project fetch errors
            }
          }),
        );
      }

      const withNames: JoinRequestRow[] = dedupedRows.map((row) => ({
        ...row,
        projectName: row.projectId ? projectNameById[row.projectId] ?? undefined : undefined,
      }));

      setRows(withNames);
    } catch (err: any) {
      setError(err.message || 'Failed to load join requests');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivity = async (row: ApprovedParticipantRow, activity: ApprovedParticipantActivity) => {
    if (!row.projectId || !row.email) {
      setActivityActionError('Project or participant information is missing for this activity.');
      return;
    }

    const loadingKey = `${row.key}:${activity.activityId}`;
    setActivityDeleteLoadingKey(loadingKey);
    setActivityActionError(null);

    try {
      const res = await fetch(
        `http://localhost:5000/api/projects/${row.projectId}/activities/${activity.activityId}/registrations`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: row.email }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to remove activity registration');
      }

      setApprovedRows((prev) =>
        prev.map((item) => {
          if (item.key !== row.key) return item;
          const nextActivities = item.activities.filter((a) => a.activityId !== activity.activityId);
          return { ...item, activities: nextActivities };
        }),
      );

      setActivitiesModalRow((prev) => {
        if (!prev || prev.key !== row.key) return prev;
        const nextActivities = prev.activities.filter((a) => a.activityId !== activity.activityId);
        return { ...prev, activities: nextActivities };
      });
    } catch (err: any) {
      setActivityActionError(err.message || 'Failed to remove activity registration');
    } finally {
      setActivityDeleteLoadingKey(null);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const handleDecision = async (row: JoinRequestRow, decision: 'approved' | 'declined') => {
    if (!row.projectId) {
      setError('Project information is missing for this join request.');
      return;
    }
    if (!row.email) {
      setError('Participant email is missing for this join request.');
      return;
    }

    setRespondingId(row.id);
    setError(null);

    try {
      const res = await fetch(`http://localhost:5000/api/projects/${row.projectId}/join/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: row.email, decision }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to respond to join request');
      }

      // Remove all rows for the same participant and project from the local list
      setRows((prev) =>
        prev.filter((item) => !(item.projectId === row.projectId && item.email === row.email)),
      );
    } catch (err: any) {
      setError(err.message || 'Failed to respond to join request');
    } finally {
      setRespondingId(null);
    }
  };

  const fetchApprovedParticipants = async () => {
    setApprovedLoading(true);
    setApprovedError(null);

    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('unihub-auth') : null;
      if (!stored) {
        setApprovedRows([]);
        return;
      }

      let projectLeaderId: string | null = null;
      try {
        const parsed = JSON.parse(stored) as { id?: string } | null;
        projectLeaderId = parsed?.id ?? null;
      } catch {
        projectLeaderId = null;
      }

      const projectsUrl = projectLeaderId
        ? `http://localhost:5000/api/projects?projectLeaderId=${encodeURIComponent(projectLeaderId)}`
        : 'http://localhost:5000/api/projects';

      const resProjects = await fetch(projectsUrl);
      if (!resProjects.ok) {
        const data = await resProjects.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load projects for participants');
      }

      const projects = (await resProjects.json()) as Array<{ _id: string; name?: string }>;
      if (!projects.length) {
        setApprovedRows([]);
        return;
      }

      const projectIdSet = new Set(projects.map((p) => p._id));
      const projectNameById: Record<string, string> = {};
      projects.forEach((p) => {
        projectNameById[p._id] = p.name || 'Untitled project';
      });

      const beneficiariesByProject: Record<string, Array<{ email: string }>> = {};
      const uniqueEmails = new Set<string>();

      await Promise.all(
        projects.map(async (project) => {
          try {
            const res = await fetch(`http://localhost:5000/api/projects/${project._id}/beneficiaries`);
            if (!res.ok) return;
            const data = (await res.json()) as Array<{ email: string; status: 'active' | 'removed' }>;
            const active = data.filter((b) => b.status === 'active');
            if (!active.length) return;
            beneficiariesByProject[project._id] = active;
            active.forEach((b) => {
              if (b.email) {
                uniqueEmails.add(b.email);
              }
            });
          } catch {
            // ignore per-project beneficiary errors
          }
        }),
      );

      if (!uniqueEmails.size) {
        setApprovedRows([]);
        return;
      }

      const activitiesByEmail: Record<
        string,
        Array<{
          projectId: string;
          projectName: string;
          activityId: number;
          activityTitle: string;
          status: 'registered' | 'present' | 'absent';
          updatedAt?: string;
        }>
      > = {};

      await Promise.all(
        Array.from(uniqueEmails).map(async (email) => {
          try {
            const url = `http://localhost:5000/api/projects/participant-activities?email=${encodeURIComponent(
              email,
            )}`;
            const res = await fetch(url);
            if (!res.ok) return;

            const data = (await res.json()) as Array<{
              projectId: string;
              projectName: string;
              activityId: number;
              activityTitle: string;
              status: 'registered' | 'present' | 'absent';
              updatedAt?: string;
            }>;

            if (!Array.isArray(data) || !data.length) return;

            activitiesByEmail[email] = data.filter((item) => projectIdSet.has(item.projectId));
          } catch {
            // ignore per-email activity errors
          }
        }),
      );

      const nextRows: ApprovedParticipantRow[] = [];

      Object.entries(beneficiariesByProject).forEach(([projectId, beneficiaries]) => {
        beneficiaries.forEach((beneficiary) => {
          const joined = (activitiesByEmail[beneficiary.email] || []).filter(
            (item) => item.projectId === projectId,
          );

          const activities: ApprovedParticipantActivity[] = joined.map((item) => ({
            activityId: item.activityId,
            activityTitle: item.activityTitle,
            status: item.status,
            updatedAt: item.updatedAt,
          }));

          nextRows.push({
            key: `${projectId}:${beneficiary.email}`,
            email: beneficiary.email,
            projectId,
            projectName: projectNameById[projectId] ?? projectId,
            activities,
          });
        });
      });

      nextRows.sort((a, b) => {
        const byProject = a.projectName.localeCompare(b.projectName);
        if (byProject !== 0) return byProject;
        return a.email.localeCompare(b.email);
      });

      setApprovedRows(nextRows);
    } catch (err: any) {
      setApprovedError(err.message || 'Failed to load approved participants');
    } finally {
      setApprovedLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedParticipants();
  }, []);

  useEffect(() => {
    const socket = io('http://localhost:5000');

    socket.on('notification:new', (payload: any) => {
      if (!payload || typeof payload.title !== 'string') {
        return;
      }

      if (
        payload.title === 'Join request' ||
        payload.title === 'Join request approved' ||
        payload.title === 'Join request declined' ||
        payload.title === 'Activity join'
      ) {
        if (payload.title === 'Activity join') {
          const message: string | undefined = (payload as any).message;
          const projectId: string | undefined = (payload as any).projectId;

          if (message && projectId) {
            const emailPart = message.split(' joined activity')[0]?.trim();

            let activityTitle = '';
            const titleMatch = message.match(/joined activity\s+"(.+?)"/);
            if (titleMatch && titleMatch[1]) {
              activityTitle = titleMatch[1].trim();
            }

            if (emailPart && activityTitle) {
              setHighlightActivity({
                projectId,
                participantEmail: emailPart,
                activityTitle,
              });
            }
          }
        }

        fetchPendingRequests();
        fetchApprovedParticipants();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const combinedLoading = loading || approvedLoading;
  const combinedError = error || approvedError;

  type CombinedRow =
    | {
        kind: 'pending';
        key: string;
        email: string;
        projectId?: string;
        projectName: string;
        requestedAtLabel?: string;
        activities: ApprovedParticipantActivity[];
        pendingSource: JoinRequestRow;
      }
    | {
        kind: 'approved';
        key: string;
        email: string;
        projectId: string;
        projectName: string;
        requestedAtLabel?: string;
        activities: ApprovedParticipantActivity[];
        approvedSource: ApprovedParticipantRow;
      };

  const combinedRows: CombinedRow[] = [
    ...rows.map<CombinedRow>((row) => ({
      kind: 'pending',
      key: `pending:${row.id}`,
      email: row.email,
      projectId: row.projectId,
      projectName: row.projectName || row.projectId || 'Unknown project',
      requestedAtLabel: row.createdAtLabel,
      activities: [],
      pendingSource: row,
    })),
    ...approvedRows.map<CombinedRow>((row) => ({
      kind: 'approved',
      key: `approved:${row.key}`,
      email: row.email,
      projectId: row.projectId,
      projectName: row.projectName,
      requestedAtLabel: undefined,
      activities: row.activities,
      approvedSource: row,
    })),
  ];

  const filteredRows = combinedRows.filter((row) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return row.kind === 'pending';
    return row.kind === 'approved';
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Participants</h1>
          <p className="text-sm text-gray-600">
            Review participant join requests for your approved extension projects.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-yellow-100 bg-white/80 p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Participants (pending & approved)</h2>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-medium text-gray-700">Filter by status:</span>
            <div className="inline-flex overflow-hidden rounded-full border border-yellow-200 bg-yellow-50 text-[11px] font-medium text-gray-700">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 transition ${
                  statusFilter === 'all' ? 'bg-yellow-500 text-white' : 'hover:bg-yellow-100'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1 transition ${
                  statusFilter === 'pending' ? 'bg-yellow-500 text-white' : 'hover:bg-yellow-100'
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1 transition ${
                  statusFilter === 'approved' ? 'bg-yellow-500 text-white' : 'hover:bg-yellow-100'
                }`}
              >
                Approved
              </button>
            </div>
          </div>
        </div>

        {combinedLoading ? (
          <div className="text-center text-sm text-gray-600">Loading participants...</div>
        ) : combinedError ? (
          <div className="text-center text-sm text-red-600">{combinedError}</div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center text-sm text-gray-600">
            No participants to display yet. When participants request to join and get approved, they will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-yellow-100 bg-yellow-50/40">
            <table className="min-w-full text-left text-xs text-gray-800">
              <thead className="bg-yellow-50 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-3 py-2">Participant email</th>
                  <th className="px-3 py-2">Project</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Activities joined</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const isPending = row.kind === 'pending';
                  const statusLabel = isPending ? 'Pending approval' : 'Approved';
                  const statusColor = isPending
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  const rowHasHighlight =
                    !!highlightActivity &&
                    row.projectId &&
                    row.email &&
                    row.projectId === highlightActivity.projectId &&
                    row.email === highlightActivity.participantEmail;

                  return (
                    <tr key={row.key} className="border-t border-yellow-100">
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">{row.email}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{row.projectName}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {row.activities.length === 0 ? (
                          <span className="text-[11px] text-gray-500">
                            {isPending ? '— Pending approval' : 'No joined activities yet.'}
                          </span>
                        ) : (
                          <div>
                            {(() => {
                              let activity = row.activities[0];
                              if (!activity) return null;

                              if (rowHasHighlight && highlightActivity) {
                                const highlighted = row.activities.find(
                                  (a) => a.activityTitle === highlightActivity.activityTitle,
                                );
                                if (highlighted) {
                                  activity = highlighted;
                                }
                              }

                              const actStatusLabel =
                                activity.status === 'present'
                                  ? 'Present'
                                  : activity.status === 'absent'
                                  ? 'Absent'
                                  : 'Registered';
                              const actStatusColor =
                                activity.status === 'present'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : activity.status === 'absent'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200';

                              return (
                                <div
                                  className={`flex items-center justify-between gap-2 ${
                                    rowHasHighlight &&
                                    highlightActivity &&
                                    activity.activityTitle === highlightActivity.activityTitle
                                      ? 'rounded-lg ring-2 ring-yellow-400 animate-pulse'
                                      : ''
                                  }`}
                                >
                                  <span className="flex-1 text-[11px] text-gray-900 line-clamp-1">
                                    {activity.activityTitle}
                                  </span>
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${actStatusColor}`}
                                  >
                                    {actStatusLabel}
                                  </span>
                                </div>
                              );
                            })()}
                            {row.activities.length > 1 && (
                              <p className="mt-1 text-[10px] text-gray-500">
                                +{row.activities.length - 1} more activit
                                {row.activities.length - 1 > 1 ? 'ies' : 'y'}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {isPending && row.pendingSource ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={respondingId === row.pendingSource.id}
                              onClick={() => handleDecision(row.pendingSource, 'approved')}
                              className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {respondingId === row.pendingSource.id ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              disabled={respondingId === row.pendingSource.id}
                              onClick={() => handleDecision(row.pendingSource, 'declined')}
                              className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {respondingId === row.pendingSource.id ? 'Declining...' : 'Decline'}
                            </button>
                          </div>
                        ) : row.kind === 'approved' && row.approvedSource ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActivitiesModalRow(row.approvedSource);
                              setActivityActionError(null);
                              setActivitiesModalOpen(true);
                            }}
                            aria-label="View activities"
                            className="inline-flex items-center justify-center px-1 py-1 text-yellow-700 transition hover:text-yellow-800"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-3.5 w-3.5"
                            >
                              <circle cx="5" cy="12" r="1.6" />
                              <circle cx="12" cy="12" r="1.6" />
                              <circle cx="19" cy="12" r="1.6" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-500">No actions available</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {activitiesModalOpen && activitiesModalRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl border border-yellow-100 bg-white p-6 text-sm text-gray-800 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-500">Activities joined</p>
                <h3 className="mt-1 text-base font-semibold text-gray-900 line-clamp-2">
                  {activitiesModalRow.projectName}
                </h3>
                <p className="mt-1 text-[11px] text-gray-500">Participant: {activitiesModalRow.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActivitiesModalOpen(false);
                  setActivitiesModalRow(null);
                  setActivityActionError(null);
                  setActivityDeleteLoadingKey(null);
                }}
                className="rounded-full border border-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-50"
              >
                Close
              </button>
            </div>

            {activityActionError && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {activityActionError}
              </p>
            )}

            {activitiesModalRow.activities.length === 0 ? (
              <p className="text-sm text-gray-600">This participant has no joined activities for this project.</p>
            ) : (
              <ul className="space-y-2 text-sm text-gray-800">
                {[...activitiesModalRow.activities]
                  .sort((a, b) => {
                    if (!highlightActivity) return 0;

                    const isAHighlighted =
                      activitiesModalRow.projectId === highlightActivity.projectId &&
                      activitiesModalRow.email === highlightActivity.participantEmail &&
                      a.activityTitle === highlightActivity.activityTitle;
                    const isBHighlighted =
                      activitiesModalRow.projectId === highlightActivity.projectId &&
                      activitiesModalRow.email === highlightActivity.participantEmail &&
                      b.activityTitle === highlightActivity.activityTitle;

                    if (isAHighlighted === isBHighlighted) return 0;
                    return isAHighlighted ? -1 : 1;
                  })
                  .map((activity) => {
                  const actStatusLabel =
                    activity.status === 'present'
                      ? 'Present'
                      : activity.status === 'absent'
                      ? 'Absent'
                      : 'Registered';
                  const actStatusColor =
                    activity.status === 'present'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : activity.status === 'absent'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200';

                  const loadingKey = `${activitiesModalRow.key}:${activity.activityId}`;
                  const isDeleting = activityDeleteLoadingKey === loadingKey;

                  const isHighlighted =
                    !!highlightActivity &&
                    activitiesModalRow.projectId === highlightActivity.projectId &&
                    activitiesModalRow.email === highlightActivity.participantEmail &&
                    activity.activityTitle === highlightActivity.activityTitle;

                  return (
                    <li
                      key={`${activitiesModalRow.key}:${activity.activityId}`}
                      className={`flex items-center justify-between gap-3 rounded-xl border border-yellow-100 bg-yellow-50/60 px-3 py-2 ${
                        isHighlighted ? 'ring-2 ring-yellow-400 animate-pulse' : ''
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2">{activity.activityTitle}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${actStatusColor}`}
                        >
                          {actStatusLabel}
                        </span>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDeleteActivity(activitiesModalRow, activity)}
                          className="rounded-full border border-red-200 px-3 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeleting ? 'Removing...' : 'Delete'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
