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
  fullName?: string;
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
  const [projectFilter, setProjectFilter] = useState<'all' | string>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | string>('all');
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
  const [leaderProjects, setLeaderProjects] = useState<Array<{ _id: string; name?: string }>>([]);
  const [selectedEvalProjectId, setSelectedEvalProjectId] = useState<string>('');
  const [evalSummaries, setEvalSummaries] = useState<
    Array<{
      activityId: number;
      activityTitle: string;
      totalResponses: number;
      overallAverage: number;
      perQuestionAverages: Record<string, number>;
    }>
  >([]);
  const [evalSummariesLoading, setEvalSummariesLoading] = useState(false);
  const [evalSummariesError, setEvalSummariesError] = useState<string | null>(null);
  const [evalDetailOpen, setEvalDetailOpen] = useState(false);
  const [evalDetailActivity, setEvalDetailActivity] = useState<
    | {
        projectId: string;
        activityId: number;
        activityTitle: string;
      }
    | null
  >(null);
  const [evalDetailRows, setEvalDetailRows] = useState<
    Array<{
      participantEmail: string;
      collegeDept: string;
      ratings: Record<string, number>;
      comments: string;
      suggestions: string;
      createdAt?: string;
    }>
  >([]);
  const [evalDetailLoading, setEvalDetailLoading] = useState(false);
  const [evalDetailError, setEvalDetailError] = useState<string | null>(null);
  const [emailBlastOpen, setEmailBlastOpen] = useState(false);
  const [emailBlastProjectId, setEmailBlastProjectId] = useState<string>('');
  const [emailBlastSubject, setEmailBlastSubject] = useState('');
  const [emailBlastMessage, setEmailBlastMessage] = useState('');
  const [emailBlastSending, setEmailBlastSending] = useState(false);
  const [emailBlastError, setEmailBlastError] = useState<string | null>(null);
  const [emailBlastSuccess, setEmailBlastSuccess] = useState<string | null>(null);
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

      const projects = (await resProjects.json()) as Array<{ _id: string; name?: string; status?: string }>;
      const validProjects = projects.filter((p) => p.status !== 'Rejected');

      if (!validProjects.length) {
        setApprovedRows([]);
        setLeaderProjects([]);
        return;
      }

      const projectIdSet = new Set(validProjects.map((p) => p._id));
      const projectNameById: Record<string, string> = {};
      validProjects.forEach((p) => {
        projectNameById[p._id] = p.name || 'Untitled project';
      });

      setLeaderProjects(validProjects);
      if (!selectedEvalProjectId) {
        setSelectedEvalProjectId(validProjects[0]._id);
      }

      const beneficiariesByProject: Record<string, Array<{ email: string; fullName?: string }>> = {};
      const uniqueEmails = new Set<string>();

      await Promise.all(
        validProjects.map(async (project) => {
          try {
            const res = await fetch(`http://localhost:5000/api/projects/${project._id}/beneficiaries`);
            if (!res.ok) return;
            const data = (await res.json()) as Array<{
              email: string;
              fullName?: string;
              status: 'active' | 'removed';
            }>;
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
            fullName: beneficiary.fullName,
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
    const run = async () => {
      if (!selectedEvalProjectId) {
        setEvalSummaries([]);
        setEvalSummariesError(null);
        return;
      }

      setEvalSummariesLoading(true);
      setEvalSummariesError(null);
      try {
        const res = await fetch(
          `http://localhost:5000/api/projects/${encodeURIComponent(selectedEvalProjectId)}/evaluations-summary`,
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as any).message || 'Failed to load evaluation summaries');
        }

        const data = (await res.json()) as Array<{
          activityId: number;
          activityTitle: string;
          totalResponses: number;
          overallAverage: number;
          perQuestionAverages: Record<string, number>;
        }>;
        setEvalSummaries(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setEvalSummariesError(err.message || 'Failed to load evaluation summaries');
        setEvalSummaries([]);
      } finally {
        setEvalSummariesLoading(false);
      }
    };

    run();
  }, [selectedEvalProjectId]);

  useEffect(() => {
    const socket = io('http://localhost:5000');

    socket.on('notification:new', (payload: any) => {
      // ...
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
        fullName?: string;
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
        fullName?: string;
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
      fullName: undefined,
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
      fullName: row.fullName,
      projectId: row.projectId,
      projectName: row.projectName,
      requestedAtLabel: undefined,
      activities: row.activities,
      approvedSource: row,
    })),
  ];

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<CombinedRow | null>(null);
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);

  const filteredRows = combinedRows.filter((row) => {
    if (statusFilter === 'pending' && row.kind !== 'pending') return false;
    if (statusFilter === 'approved' && row.kind !== 'approved') return false;

    if (projectFilter !== 'all' && row.projectId && row.projectId !== projectFilter) return false;
    if (activityFilter !== 'all') {
      const hasActivityMatch = row.activities.some((activity) => activity.activityTitle === activityFilter);
      if (!hasActivityMatch) return false;
    }

    return true;
  });

  const getFilteredApprovedExportRows = (): ApprovedParticipantRow[] => {
    return approvedRows.filter((row) => {
      if (projectFilter !== 'all' && row.projectId !== projectFilter) return false;
      if (activityFilter !== 'all') {
        const hasActivityMatch = row.activities.some((activity) => activity.activityTitle === activityFilter);
        if (!hasActivityMatch) return false;
      }
      return true;
    });
  };

  const doExportApprovedCsv = () => {
    const exportRows = getFilteredApprovedExportRows();
    if (!exportRows.length) return;

    const header = ['Name', 'Email', 'Project', 'Activity', 'Status', 'Last updated'];
    const lines: string[][] = [];

    exportRows.forEach((row) => {
      const name = row.fullName || row.email;
      if (!row.activities.length) {
        lines.push([name, row.email, row.projectName, '', 'No activities', '']);
        return;
      }

      row.activities.forEach((activity) => {
        const statusLabel =
          activity.status === 'present'
            ? 'Present'
            : activity.status === 'absent'
            ? 'Absent'
            : 'Registered';

        const updated = activity.updatedAt
          ? new Date(activity.updatedAt).toLocaleString('en-PH')
          : '';

        lines.push([
          name,
          row.email,
          row.projectName,
          activity.activityTitle,
          statusLabel,
          updated,
        ]);
      });
    });

    const csv = [header, ...lines]
      .map((cols) =>
        cols
          .map((value) => {
            const v = value ?? '';
            if (typeof v !== 'string') return String(v);
            const needsQuotes = v.includes(',') || v.includes('\n') || v.includes('"');
            const escaped = v.replace(/"/g, '""');
            return needsQuotes ? `"${escaped}"` : escaped;
          })
          .join(','),
      )
      .join('\n');

    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'unihub-approved-beneficiaries.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // if export fails, nothing critical; table view still works
    }
  };

  const handleExportApprovedCsv = () => {
    if (!approvedRows.length) return;
    setExportPreviewOpen(true);
  };

  const fetchEvaluationDetails = async (projectId: string, activityId: number, activityTitle: string) => {
    setEvalDetailLoading(true);
    setEvalDetailError(null);
    setEvalDetailActivity({ projectId, activityId, activityTitle });
    try {
      const res = await fetch(
        `http://localhost:5000/api/projects/${encodeURIComponent(
          projectId,
        )}/activities/${encodeURIComponent(String(activityId))}/evaluations`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).message || 'Failed to load evaluation responses');
      }

      const data = (await res.json()) as Array<{
        projectId: string;
        activityId: number;
        participantEmail: string;
        collegeDept: string;
        ratings: Record<string, number>;
        comments: string;
        suggestions: string;
        createdAt?: string;
        updatedAt?: string;
      }>;

      const rows = data.map((row) => ({
        participantEmail: row.participantEmail,
        collegeDept: row.collegeDept ?? '',
        ratings: row.ratings ?? {},
        comments: row.comments ?? '',
        suggestions: row.suggestions ?? '',
        createdAt: row.createdAt,
      }));
      setEvalDetailRows(rows);
    } catch (err: any) {
      setEvalDetailError(err.message || 'Failed to load evaluation responses');
      setEvalDetailRows([]);
    } finally {
      setEvalDetailLoading(false);
    }
  };

  const handleOpenEvaluationDetail = (projectId: string, activityId: number, activityTitle: string) => {
    setEvalDetailOpen(true);
    setEvalDetailRows([]);
    setEvalDetailError(null);
    fetchEvaluationDetails(projectId, activityId, activityTitle);
  };

  const handleExportEvaluationCsv = async (projectId: string, activityId: number, activityTitle: string) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/projects/${encodeURIComponent(
          projectId,
        )}/activities/${encodeURIComponent(String(activityId))}/evaluations`,
      );
      if (!res.ok) {
        return;
      }

      const data = (await res.json()) as Array<{
        participantEmail: string;
        collegeDept: string;
        ratings: Record<string, number>;
        comments: string;
        suggestions: string;
        createdAt?: string;
      }>;

      if (!Array.isArray(data) || data.length === 0) {
        return;
      }

      const allKeys = new Set<string>();
      data.forEach((row) => {
        Object.keys(row.ratings || {}).forEach((key) => {
          if (key) allKeys.add(key);
        });
      });

      const ratingKeys = Array.from(allKeys);

      const header = [
        'Participant Email',
        'College / Department',
        ...ratingKeys,
        'Comments',
        'Suggestions',
        'Submitted at',
      ];

      const rows = data.map((row) => {
        const submittedAt = row.createdAt ? new Date(row.createdAt).toLocaleString('en-PH') : '';
        const ratingValues = ratingKeys.map((key) => {
          const value = (row.ratings || {})[key];
          return typeof value === 'number' && Number.isFinite(value) ? value.toString() : '';
        });
        return [
          row.participantEmail ?? '',
          row.collegeDept ?? '',
          ...ratingValues,
          row.comments ?? '',
          row.suggestions ?? '',
          submittedAt,
        ];
      });

      const csv = [header, ...rows]
        .map((cols) =>
          cols
            .map((value) => {
              const v = value ?? '';
              if (typeof v !== 'string') return String(v);
              const needsQuotes = v.includes(',') || v.includes('\n') || v.includes('"');
              const escaped = v.replace(/"/g, '""');
              return needsQuotes ? `"${escaped}"` : escaped;
            })
            .join(','),
        )
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeTitle = activityTitle.replace(/[^a-z0-9_-]+/gi, '_');
      link.href = url;
      link.setAttribute('download', `${safeTitle || 'activity'}-evaluations.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
    }
  };

  const handleOpenEmailBlast = () => {
    if (!leaderProjects.length) return;
    const defaultProjectId = emailBlastProjectId || leaderProjects[0]._id;
    setEmailBlastProjectId(defaultProjectId);
    setEmailBlastSubject('');
    setEmailBlastMessage('');
    setEmailBlastError(null);
    setEmailBlastSuccess(null);
    setEmailBlastOpen(true);
  };

  const handleSendEmailBlast = async () => {
    if (!emailBlastProjectId) {
      setEmailBlastError('Please select a project.');
      return;
    }
    if (!emailBlastSubject.trim()) {
      setEmailBlastError('Subject is required.');
      return;
    }
    if (!emailBlastMessage.trim()) {
      setEmailBlastError('Message is required.');
      return;
    }

    setEmailBlastSending(true);
    setEmailBlastError(null);
    setEmailBlastSuccess(null);

    try {
      const res = await fetch(
        `http://localhost:5000/api/projects/${encodeURIComponent(emailBlastProjectId)}/email-blast`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subject: emailBlastSubject, message: emailBlastMessage }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).message || 'Failed to send email blast');
      }

      const data = (await res.json()) as { sentCount?: number; totalRecipients?: number };
      const countLabel = typeof data.sentCount === 'number' ? data.sentCount : undefined;
      const totalLabel = typeof data.totalRecipients === 'number' ? data.totalRecipients : undefined;
      const msg =
        countLabel !== undefined && totalLabel !== undefined
          ? `Announcement emailed to ${countLabel} of ${totalLabel} participant(s).`
          : 'Announcement emailed to project participants.';
      setEmailBlastSuccess(msg);
    } catch (err: any) {
      setEmailBlastError(err.message || 'Failed to send email blast');
    } finally {
      setEmailBlastSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Participants</h1>
          <p className="text-sm text-gray-600">
            Review participant join requests for your approved extension projects.
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2 md:mt-0">
          <button
            type="button"
            onClick={handleOpenEmailBlast}
            disabled={!leaderProjects.length}
            className="rounded-full bg-yellow-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Email announcement
          </button>
        </div>
      </header>

      <section className="space-y-6 rounded-2xl border border-yellow-100 bg-white/80 p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Participants (pending & approved)</h2>
          <div className="flex flex-col gap-2 text-[11px] lg:flex-row lg:items-center lg:gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-gray-700">Status:</span>
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

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-gray-700">Project:</span>
              <select
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value as 'all' | string)}
                className="rounded-full border border-yellow-200 bg-white px-3 py-1 text-[11px] text-gray-800 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-300"
              >
                <option value="all">All projects</option>
                {leaderProjects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name || 'Untitled project'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-gray-700">Activity:</span>
              <select
                value={activityFilter}
                onChange={(event) => setActivityFilter(event.target.value as 'all' | string)}
                className="rounded-full border border-yellow-200 bg-white px-3 py-1 text-[11px] text-gray-800 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-300"
              >
                <option value="all">All activities</option>
                {Array.from(
                  new Set(
                    approvedRows.flatMap((row) => row.activities.map((activity) => activity.activityTitle || '')),
                  ),
                )
                  .filter((title) => !!title)
                  .map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportApprovedCsv}
              disabled={!getFilteredApprovedExportRows().length}
              className="inline-flex items-center justify-center rounded-full border border-yellow-200 px-3 py-1 text-[11px] font-semibold text-yellow-700 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Export filtered as CSV
            </button>
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
          <>
            {/* Mobile: stacked cards */}
            <div className="space-y-3 md:hidden">
              {filteredRows.map((row) => {
                const isPending = row.kind === 'pending';
                const statusLabel = isPending ? 'Pending approval' : 'Approved';
                const statusColor = isPending
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                const previewActivity = row.activities[0];

                return (
                  <div key={row.key} className="rounded-xl border border-yellow-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{row.email}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-600">{row.projectName}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-gray-700">
                      {row.activities.length === 0 ? (
                        <span className="text-[11px] text-gray-500">
                          {isPending ? '— Pending approval' : 'No joined activities yet.'}
                        </span>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">{previewActivity?.activityTitle}</p>
                            <p className="mt-0.5 text-[11px] text-gray-500">
                              {row.activities.length > 1 ? `+${row.activities.length - 1} more` : '1 activity'}
                            </p>
                          </div>
                          {row.kind === 'approved' && (
                            <button
                              type="button"
                              onClick={() => {
                                setActivitiesModalRow(row.approvedSource);
                                setActivitiesModalOpen(true);
                              }}
                              className="shrink-0 rounded-full border border-yellow-200 px-3 py-1 text-[11px] font-semibold text-yellow-700 hover:bg-yellow-50"
                            >
                              View activities
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2">
                      {row.kind === 'pending' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDecision(row.pendingSource, 'declined')}
                            disabled={respondingId === row.pendingSource.id}
                            className="rounded-full border border-red-200 px-3 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {respondingId === row.pendingSource.id ? 'Declining…' : 'Decline'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecision(row.pendingSource, 'approved')}
                            disabled={respondingId === row.pendingSource.id}
                            className="rounded-full bg-yellow-500 px-3 py-1 text-[11px] font-semibold text-white shadow hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {respondingId === row.pendingSource.id ? 'Approving…' : 'Approve'}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-yellow-100 bg-yellow-50/40">
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
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedParticipant(row);
                            setProfileModalOpen(true);
                          }}
                          className="max-w-xs truncate text-left font-semibold text-yellow-800 hover:underline"
                        >
                          {row.fullName || row.email}
                        </button>
                      </td>
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
          </>
        )}
      </section>

      <section className="rounded-2xl border border-yellow-100 bg-white/80 p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Activity evaluations (client satisfaction)</h2>
            <p className="text-xs text-gray-500">
              View average scores and response counts for activities that have post-activity surveys.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-[11px] sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Project:</span>
              <select
                className="rounded-full border border-yellow-200 bg-white px-3 py-1 text-[11px] text-gray-800 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-300"
                value={selectedEvalProjectId}
                onChange={(event) => setSelectedEvalProjectId(event.target.value)}
              >
                {leaderProjects.length === 0 ? (
                  <option value="">No projects available</option>
                ) : (
                  <>
                    {leaderProjects.map((project) => (
                      <option key={project._id} value={project._id}>
                        {project.name || 'Untitled project'}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {evalSummariesLoading ? (
          <div className="text-center text-sm text-gray-600">Loading evaluation summaries...</div>
        ) : evalSummariesError ? (
          <div className="text-center text-sm text-red-600">{evalSummariesError}</div>
        ) : !selectedEvalProjectId ? (
          <div className="text-center text-sm text-gray-600">
            Select a project to view its activity evaluation summaries.
          </div>
        ) : evalSummaries.length === 0 ? (
          <div className="text-center text-sm text-gray-600">
            No evaluation responses yet for this project's activities.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-yellow-100 bg-yellow-50/40">
            <table className="min-w-full text-left text-xs text-gray-800">
              <thead className="bg-yellow-50 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-3 py-2">Activity</th>
                  <th className="px-3 py-2 text-center">Total responses</th>
                  <th className="px-3 py-2 text-center">Overall average</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {evalSummaries.map((row) => (
                  <tr key={row.activityId} className="border-t border-yellow-100">
                    <td className="px-3 py-2 text-xs font-medium text-gray-900">{row.activityTitle}</td>
                    <td className="px-3 py-2 text-center text-xs text-gray-700">{row.totalResponses}</td>
                    <td className="px-3 py-2 text-center text-xs text-gray-700">
                      {Number.isFinite(row.overallAverage) ? row.overallAverage.toFixed(2) : '0.00'}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenEvaluationDetail(selectedEvalProjectId, row.activityId, row.activityTitle)
                          }
                          className="rounded-full border border-yellow-200 px-3 py-1 text-[11px] font-semibold text-yellow-700 hover:bg-yellow-50"
                        >
                          View responses
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleExportEvaluationCsv(selectedEvalProjectId, row.activityId, row.activityTitle)
                          }
                          className="rounded-full border border-yellow-200 px-3 py-1 text-[11px] font-semibold text-yellow-700 hover:bg-yellow-50"
                        >
                          Export CSV
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {profileModalOpen && selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl border border-yellow-100 bg-white p-7 text-sm text-gray-800 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-xs font-semibold uppercase text-yellow-800">
                  {(selectedParticipant.fullName || selectedParticipant.email)
                    .split(' ')
                    .map((part) => part.trim()[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-yellow-500">Participant profile</p>
                  <h3 className="mt-1 text-base font-semibold text-gray-900 break-words">
                    {selectedParticipant.fullName || selectedParticipant.email}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-gray-500 break-all">{selectedParticipant.email}</p>
                  <p className="mt-0.5 text-[11px] text-gray-600">{selectedParticipant.projectName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="rounded-full border border-yellow-200 px-3 py-0.5 text-[11px] font-semibold text-yellow-700 hover:bg-yellow-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 rounded-2xl bg-yellow-50/60 p-4 text-[11px] text-gray-700">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Status</p>
                  <p className="text-[11px] text-gray-800">Current participation status</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    selectedParticipant.kind === 'approved'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                  }`}
                >
                  {selectedParticipant.kind === 'approved' ? 'Approved' : 'Pending approval'}
                </span>
              </div>

              <div className="border-t border-yellow-100 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Activities joined</p>
                {selectedParticipant.activities.length === 0 ? (
                  <p className="mt-0.5 text-[11px] text-gray-600">
                    {selectedParticipant.kind === 'pending'
                      ? 'No activities yet – pending approval.'
                      : 'No joined activities yet for this project.'}
                  </p>
                ) : (
                  <>
                    <p className="mt-0.5 text-[11px] font-medium text-gray-800">
                      {selectedParticipant.activities[0]?.activityTitle}
                    </p>
                    <p className="text-[11px] text-gray-600">
                      {selectedParticipant.activities.length > 1
                        ? `+${selectedParticipant.activities.length - 1} more activity` +
                          (selectedParticipant.activities.length - 1 > 1 ? 'ies' : '')
                        : '1 activity total'}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {exportPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-2xl border border-yellow-100 bg-white p-6 text-sm text-gray-800 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-yellow-500">Export preview</p>
                <h3 className="mt-1 text-base font-semibold text-gray-900">Approved participants</h3>
                <p className="mt-1 text-[11px] text-gray-600">
                  Review the rows that will be included before downloading the CSV file.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExportPreviewOpen(false)}
                className="rounded-full border border-yellow-200 px-3 py-1 text-[11px] font-semibold text-yellow-700 hover:bg-yellow-50"
              >
                Close
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-xl border border-yellow-100 bg-yellow-50/40">
              <table className="min-w-full text-left text-[11px] text-gray-800">
                <thead className="bg-yellow-50 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Project</th>
                    <th className="px-3 py-2">Activities joined</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedRows.map((row) => (
                    <tr key={row.key} className="border-t border-yellow-100 bg-white/80">
                      <td className="px-3 py-2 align-top text-[11px] text-gray-900">{row.fullName || row.email}</td>
                      <td className="px-3 py-2 align-top text-[11px] text-gray-800">{row.email}</td>
                      <td className="px-3 py-2 align-top text-[11px] text-gray-800">{row.projectName}</td>
                      <td className="px-3 py-2 align-top text-[11px] text-gray-700">
                        {row.activities.length === 0
                          ? 'No activities'
                          : `${row.activities.length} activit${row.activities.length === 1 ? 'y' : 'ies'}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setExportPreviewOpen(false)}
                className="rounded-full border border-gray-200 px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  doExportApprovedCsv();
                  setExportPreviewOpen(false);
                }}
                className="rounded-full bg-yellow-500 px-3 py-1 font-semibold text-white shadow hover:bg-yellow-600"
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {evalDetailOpen && evalDetailActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl rounded-2xl border border-yellow-100 bg-white p-6 text-sm text-gray-800 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-500">Activity evaluations</p>
                <h3 className="mt-1 text-base font-semibold text-gray-900 line-clamp-2">
                  {evalDetailActivity.activityTitle}
                </h3>
                <p className="mt-1 text-[11px] text-gray-500">
                  {evalDetailRows.length} response
                  {evalDetailRows.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEvalDetailOpen(false);
                  setEvalDetailActivity(null);
                  setEvalDetailRows([]);
                  setEvalDetailError(null);
                }}
                className="rounded-full border border-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-50"
              >
                Close
              </button>
            </div>

            {evalDetailError && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {evalDetailError}
              </p>
            )}

            {evalDetailLoading ? (
              <p className="text-sm text-gray-600">Loading responses...</p>
            ) : evalDetailRows.length === 0 ? (
              <p className="text-sm text-gray-600">No responses yet for this activity.</p>
            ) : (
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1 text-sm text-gray-800">
                {evalDetailRows.map((row, index) => (
                  <div
                    key={`${row.participantEmail || 'anon'}:${index}`}
                    className="rounded-xl border border-yellow-100 bg-yellow-50/60 p-3 text-xs text-gray-800"
                  >
                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                      <div className="space-x-2">
                        <span className="font-semibold text-gray-900">
                          {row.participantEmail || 'Anonymous'}
                        </span>
                        {row.collegeDept && (
                          <span className="text-[11px] text-gray-600">({row.collegeDept})</span>
                        )}
                      </div>
                      {row.createdAt && (
                        <span className="text-[10px] text-gray-500">
                          {new Date(row.createdAt).toLocaleString('en-PH')}
                        </span>
                      )}
                    </div>
                    {Object.keys(row.ratings || {}).length > 0 && (
                      <div className="mb-1 flex flex-wrap gap-1">
                        {Object.entries(row.ratings).map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-gray-800"
                          >
                            <span className="mr-1 text-gray-500">{key}:</span>
                            <span>{Number.isFinite(value) ? value.toFixed(2) : String(value)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {row.comments && (
                      <p className="mt-1 text-[11px] text-gray-800">
                        <span className="font-semibold text-gray-700">Comments: </span>
                        {row.comments}
                      </p>
                    )}
                    {row.suggestions && (
                      <p className="mt-0.5 text-[11px] text-gray-800">
                        <span className="font-semibold text-gray-700">Suggestions: </span>
                        {row.suggestions}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {emailBlastOpen && leaderProjects.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl border border-yellow-100 bg-white p-6 text-sm text-gray-800 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-500">Email announcement</p>
                <h3 className="mt-1 text-base font-semibold text-gray-900">Notify project participants</h3>
                <p className="mt-1 text-[11px] text-gray-500">
                  Sends an email to all active beneficiaries of the selected project.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmailBlastOpen(false);
                  setEmailBlastError(null);
                  setEmailBlastSuccess(null);
                }}
                className="rounded-full border border-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Project
                </label>
                <select
                  className="w-full rounded-lg border border-yellow-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-200"
                  value={emailBlastProjectId || (leaderProjects[0]?._id ?? '')}
                  onChange={(event) => setEmailBlastProjectId(event.target.value)}
                >
                  {leaderProjects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name || 'Untitled project'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-700" htmlFor="email-blast-subject">
                  Subject
                </label>
                <input
                  id="email-blast-subject"
                  type="text"
                  className="w-full rounded-lg border border-yellow-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-200"
                  value={emailBlastSubject}
                  onChange={(event) => setEmailBlastSubject(event.target.value)}
                  placeholder="e.g., Reminder for tomorrow's activity"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-700" htmlFor="email-blast-message">
                  Message
                </label>
                <textarea
                  id="email-blast-message"
                  rows={5}
                  className="w-full rounded-lg border border-yellow-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-200"
                  value={emailBlastMessage}
                  onChange={(event) => setEmailBlastMessage(event.target.value)}
                  placeholder={"Include details like date, time, location, and what participants need to bring."}
                />
              </div>

              {emailBlastError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {emailBlastError}
                </p>
              )}

              {emailBlastSuccess && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {emailBlastSuccess}
                </p>
              )}

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSendEmailBlast}
                  disabled={emailBlastSending}
                  className="rounded-full bg-yellow-500 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {emailBlastSending ? 'Sending…' : 'Send announcement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
