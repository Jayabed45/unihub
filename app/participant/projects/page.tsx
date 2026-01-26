"use client";

import React, { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

interface ParticipantProject {
  _id: string;
  name: string;
  description: string;
  status?: "Pending" | "Approved" | "Rejected" | string;
}

interface AttendanceHistoryEntry {
  date: string;
  status: string;
}

export default function ParticipantProjectsPage() {
  const [projects, setProjects] = useState<ParticipantProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewerMounted, setViewerMounted] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerProject, setViewerProject] = useState<ParticipantProject | null>(null);
  const [viewerData, setViewerData] = useState<any | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>("project-summary");
  const viewerContentRef = useRef<HTMLDivElement | null>(null);
  const [joinRequestLoading, setJoinRequestLoading] = useState(false);
  const [joinRequestedProjects, setJoinRequestedProjects] = useState<Record<string, boolean>>({});
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinModalError, setJoinModalError] = useState<string | null>(null);
  const [joinStatusesByProject, setJoinStatusesByProject] = useState<Record<string, 'Requested' | 'Approved' | 'Rejected'>>({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [attendanceControlsExpanded, setAttendanceControlsExpanded] = useState(false);
  const [attendanceHistoryOpen, setAttendanceHistoryOpen] = useState(false);
  const [attendanceMarking, setAttendanceMarking] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceModalError, setAttendanceModalError] = useState<string | null>(null);
  const [attendanceMarkedByProject, setAttendanceMarkedByProject] = useState<Record<string, boolean>>({});
  const [attendanceHistoryLoading, setAttendanceHistoryLoading] = useState(false);
  const [attendanceHistoryError, setAttendanceHistoryError] = useState<string | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistoryEntry[]>([]);
  const [submitSuccessOpen, setSubmitSuccessOpen] = useState(false);

  const viewerSections: Array<{ id: string; label: string }> = [
    { id: "project-summary", label: "I. Project Summary" },
    { id: "rationale", label: "II. Rationale of the Project" },
    { id: "goals-objectives", label: "III. Goals, Objectives & Intended Outcomes" },
    { id: "implementation-plan", label: "IV. Implementation Plan" },
    { id: "monitoring-evaluation", label: "V. Monitoring & Evaluation Plan" },
    { id: "organizational-capability", label: "VI. Organizational Capability" },
    { id: "community-extension-team", label: "VII. Community Extension Team" },
    { id: "sustainability-plan", label: "VIII. Sustainability Plan" },
    { id: "budgetary-requirement", label: "IX. Budgetary Requirement" },
    { id: "training-design", label: "X. Training Design" },
  ];

  // Initial load of projects list
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("http://localhost:5000/api/projects");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Failed to load projects");
        }
        const data = (await res.json()) as ParticipantProject[];
        setProjects(data);
      } catch (err: any) {
        setError(err.message || "Failed to load projects");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const handleMarkAttendance = async () => {
    if (!viewerProject || attendanceMarking) {
      return;
    }

    // Only allow marking attendance if the participant has been approved for this project
    const status = joinStatusesByProject[viewerProject._id];
    if (status !== 'Approved') {
      return;
    }

    let participantId: string | undefined;
    try {
      const stored = window.localStorage.getItem('unihub-auth');
      if (stored) {
        const parsed = JSON.parse(stored) as { id?: string; role?: string } | null;
        if (parsed && parsed.id && parsed.role === 'Participant') {
          participantId = parsed.id;
        }
      }
    } catch {
      participantId = undefined;
    }

    if (!participantId) {
      return;
    }

    setAttendanceMarking(true);
    setAttendanceModalError(null);
    try {
      const res = await fetch('http://localhost:5000/api/attendance/self', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: viewerProject._id,
          participantId,
        }),
      });

      if (!res.ok) {
        let message: string | undefined;
        try {
          const data = await res.json().catch(() => ({}));
          message = (data as any).message;
        } catch {
          // ignore parse errors
        }
        setAttendanceModalError(message || 'Failed to mark attendance');
      } else {
        setAttendanceModalError(null);

        // Mark this project as already active for today so the button stays disabled
        setAttendanceMarkedByProject((prev) => ({
          ...prev,
          [viewerProject._id]: true,
        }));
      }
    } catch (error: any) {
      console.error('Failed to mark attendance', error);
      setAttendanceModalError(error.message || 'Failed to mark attendance');
    } finally {
      setAttendanceMarking(false);
      setAttendanceModalOpen(true);
    }
  };

  useEffect(() => {
    let participantId: string | undefined;
    try {
      const stored = window.localStorage.getItem('unihub-auth');
      if (stored) {
        const parsed = JSON.parse(stored) as { id?: string; role?: string } | null;
        if (parsed && parsed.id && parsed.role === 'Participant') {
          participantId = parsed.id;
        }
      }
    } catch {
      // ignore parse errors
    }

    if (!participantId) {
      return;
    }

    const fetchJoinStatuses = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/notifications/join-requests/participant?participantId=${encodeURIComponent(
            participantId!,
          )}`,
        );
        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as Array<{
          projectId?: string;
          status?: 'Requested' | 'Approved' | 'Rejected';
        }>;

        const mapped: Record<string, 'Requested' | 'Approved' | 'Rejected'> = {};
        for (const item of data) {
          if (item.projectId && item.status) {
            mapped[item.projectId] = item.status;
          }
        }

        setJoinStatusesByProject(mapped);
      } catch (err) {
        console.error('Failed to load participant join statuses', err);
      }
    };

    fetchJoinStatuses();

    try {
      const socket = io('http://localhost:5000');
      socketRef.current = socket;

      socket.emit('notifications:subscribe', {
        userId: participantId,
        role: 'Participant',
      });

      const handleRefresh = () => {
        void fetchJoinStatuses();
      };

      socket.on('notifications:refresh', handleRefresh);

      return () => {
        socket.off('notifications:refresh', handleRefresh);
        socket.disconnect();
        socketRef.current = null;
      };
    } catch {
      // ignore socket setup errors on client
    }
  }, []);

  useEffect(() => {
    if (!viewerMounted || !viewerProject) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      setViewerLoading(true);
      setViewerError(null);
      try {
        const res = await fetch(`http://localhost:5000/api/projects/${viewerProject._id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Failed to load project details");
        }
        const data = await res.json();
        if (!cancelled) {
          setViewerData(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setViewerError(err.message || "Failed to load project details");
        }
      } finally {
        if (!cancelled) {
          setViewerLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [viewerMounted, viewerProject]);

  useEffect(() => {
    if (!viewerProject) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      let participantId: string | undefined;
      try {
        const stored = window.localStorage.getItem('unihub-auth');
        if (stored) {
          const parsed = JSON.parse(stored) as { id?: string; role?: string } | null;
          if (parsed && parsed.id && parsed.role === 'Participant') {
            participantId = parsed.id;
          }
        }
      } catch {
        participantId = undefined;
      }

      if (!participantId) {
        return;
      }

      try {
        const res = await fetch(
          `http://localhost:5000/api/attendance/project?projectId=${encodeURIComponent(
            viewerProject._id,
          )}`,
        );
        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as Array<{
          participantId?: string;
          status?: string;
        }>;

        const hasActiveToday = data.some(
          (r) => r.participantId === participantId && (r.status || '').toLowerCase() === 'active',
        );

        if (hasActiveToday && !cancelled) {
          setAttendanceMarkedByProject((prev) => ({
            ...prev,
            [viewerProject._id]: true,
          }));
        }
      } catch {
        // ignore attendance preload errors
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [viewerProject]);

  useEffect(() => {
    if (!viewerVisible || !viewerData) {
      return;
    }

    const root = viewerContentRef.current;
    if (!root) {
      return;
    }

    const currentProjectId = viewerProject?._id;
    const joinStatus = currentProjectId ? joinStatusesByProject[currentProjectId] : undefined;

    // If join has been approved, keep the content editable.
    if (joinStatus === 'Approved') {
      return;
    }

    const controls = root.querySelectorAll<HTMLElement>(
      'input, textarea, select, button, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]'
    );

    controls.forEach((el) => {
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLButtonElement
      ) {
        el.disabled = true;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.readOnly = true;
        }
      }

      if (el.isContentEditable) {
        el.contentEditable = "false";
      }
    });
  }, [viewerVisible, viewerData, activeSectionId, viewerProject, joinStatusesByProject]);

  useEffect(() => {
    if (!viewerVisible || !viewerContentRef.current || !viewerData) {
      return;
    }

    const root = viewerContentRef.current;
    const proposal = (viewerData as any).proposalData as Record<string, any> | undefined;
    if (!proposal) {
      return;
    }

    for (const section of viewerSections) {
      const snapshot = proposal[section.id];
      if (!snapshot) continue;

      const sectionElement = root.querySelector<HTMLElement>(`[data-section-id="${section.id}"]`);
      if (!sectionElement) continue;

      if (Array.isArray(snapshot.inputs)) {
        const nodes = Array.from(
          sectionElement.querySelectorAll('input, textarea, select'),
        ) as Array<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>;

        snapshot.inputs.forEach((saved: any, index: number) => {
          const el = nodes[index];
          if (!el) return;
          const type = (el as HTMLInputElement).type;
          const isCheckbox = type === 'checkbox';

          if (isCheckbox) {
            (el as HTMLInputElement).checked = Boolean(saved.checked);
          } else if ('value' in el && saved.value != null) {
            (el as any).value = saved.value;
          }
        });
      }

      if (Array.isArray(snapshot.editableCells)) {
        const cells = Array.from(
          sectionElement.querySelectorAll<HTMLElement>('[contenteditable="true"]'),
        );

        snapshot.editableCells.forEach((value: string, index: number) => {
          const cell = cells[index];
          if (!cell) return;
          cell.innerText = value ?? '';
        });
      }
    }
  }, [viewerVisible, viewerData, viewerSections]);

  const handleRequestJoin = async () => {
    if (
      !viewerProject ||
      joinRequestLoading ||
      joinStatusesByProject[viewerProject._id] === 'Requested' ||
      joinStatusesByProject[viewerProject._id] === 'Approved'
    ) {
      return;
    }

    setJoinRequestLoading(true);
    setJoinModalError(null);

    try {
      let participantId: string | undefined;
      try {
        const stored = window.localStorage.getItem('unihub-auth');
        if (stored) {
          const parsed = JSON.parse(stored) as { id?: string; role?: string } | null;
          if (parsed && parsed.id && parsed.role === 'Participant') {
            participantId = parsed.id;
          }
        }
      } catch {
      }

      const res = await fetch(
        `http://localhost:5000/api/projects/${viewerProject._id}/join-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ participantId }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to send join request');
      }
      setJoinRequestedProjects((prev) => ({
        ...prev,
        [viewerProject._id]: true,
      }));
      setJoinStatusesByProject((prev) => ({
        ...prev,
        [viewerProject._id]: 'Requested',
      }));
      setJoinModalError(null);
      setJoinModalOpen(true);
    } catch (err: any) {
      console.error('Failed to send join request', err);
      setJoinModalError(err.message || 'Failed to send join request');
      setJoinModalOpen(true);
    } finally {
      setJoinRequestLoading(false);
    }
  };

  const handleSubmitProposal = async () => {
    if (!viewerProject || !viewerData) {
      return;
    }

    const status = joinStatusesByProject[viewerProject._id];
    if (status !== 'Approved') {
      return;
    }

    const root = viewerContentRef.current;
    if (!root) {
      return;
    }

    const existingProposal = ((viewerData as any).proposalData || {}) as Record<string, any>;
    const updatedProposal: Record<string, any> = { ...existingProposal };

    for (const section of viewerSections) {
      const container = root.querySelector<HTMLElement>(`[data-section-id="${section.id}"]`);
      if (!container) continue;

      const contentEl = container.querySelector<HTMLElement>('.participant-proposal-html');
      if (!contentEl) continue;

      const inputs: any[] = [];
      const cleanupAttributeFns: Array<() => void> = [];

      contentEl.querySelectorAll('input, textarea, select').forEach((node, index) => {
        const el = node as HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement;
        const type = (el as HTMLInputElement).type;
        const isCheckbox = type === 'checkbox';
        const currentValue = !isCheckbox ? (el as any).value ?? '' : undefined;
        const currentChecked = isCheckbox ? (el as any).checked : undefined;

        const prevValueAttr = el.getAttribute('value');
        const prevCheckedAttr = el.getAttribute('checked');

        if (!isCheckbox) {
          el.setAttribute('value', currentValue ?? '');
          cleanupAttributeFns.push(() => {
            if (prevValueAttr === null) {
              el.removeAttribute('value');
            } else {
              el.setAttribute('value', prevValueAttr);
            }
          });
        } else {
          if (currentChecked) {
            el.setAttribute('checked', 'checked');
          } else {
            el.removeAttribute('checked');
          }
          cleanupAttributeFns.push(() => {
            if (prevCheckedAttr === null) {
              el.removeAttribute('checked');
            } else {
              el.setAttribute('checked', prevCheckedAttr);
            }
          });
        }

        inputs.push({
          index,
          tag: el.tagName,
          type,
          name: el.name || undefined,
          placeholder: 'placeholder' in el ? (el as any).placeholder : undefined,
          value: currentValue,
          checked: currentChecked,
        });
      });

      const editableCells: string[] = [];
      contentEl.querySelectorAll('[contenteditable="true"]').forEach((node) => {
        const cell = node as HTMLElement;
        const value = cell.innerText.trim();
        editableCells.push(value);
      });

      const textContent = contentEl.innerText;
      const htmlContent = contentEl.innerHTML;

      cleanupAttributeFns.forEach((fn) => fn());

      updatedProposal[section.id] = {
        ...(existingProposal[section.id] || {}),
        textContent,
        htmlContent,
        inputs,
        editableCells,
      };
    }

    setSubmitLoading(true);
    try {
      let participantId: string | undefined;
      try {
        const stored = window.localStorage.getItem('unihub-auth');
        if (stored) {
          const parsed = JSON.parse(stored) as { id?: string; role?: string } | null;
          if (parsed && parsed.id && parsed.role === 'Participant') {
            participantId = parsed.id;
          }
        }
      } catch {
        participantId = undefined;
      }

      const res = await fetch(`http://localhost:5000/api/projects/${viewerProject._id}/proposal`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposalData: updatedProposal,
          updaterId: participantId,
          updaterRole: 'Participant',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to submit project changes');
      }

      // Update local viewer data so answers show immediately without reopening the panel
      try {
        const updated = await res.json().catch(() => null);
        if (updated && (updated as any).proposalData) {
          setViewerData(updated as any);
        } else {
          setViewerData((prev: any | null) =>
            prev
              ? ({
                  ...(prev as any),
                  proposalData: updatedProposal,
                } as any)
              : prev,
          );
        }
      } catch {
        // If parsing the updated project fails, still fall back to using updatedProposal locally
        setViewerData((prev: any | null) =>
          prev
            ? ({
                ...(prev as any),
                proposalData: updatedProposal,
              } as any)
            : prev,
        );
      }

      // On successful submit, close the viewer slide and show a success popup
      setSubmitSuccessOpen(true);
      setViewerVisible(false);
      window.setTimeout(() => {
        setViewerMounted(false);
        setViewerProject(null);
        setViewerData(null);
      }, 340);
    } catch (error) {
      console.error('Failed to submit proposal changes', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const fetchAttendanceHistory = async () => {
    if (!viewerProject) return;

    let participantId: string | undefined;
    try {
      const stored = window.localStorage.getItem('unihub-auth');
      if (stored) {
        const parsed = JSON.parse(stored) as { id?: string; role?: string } | null;
        if (parsed && parsed.id && parsed.role === 'Participant') {
          participantId = parsed.id;
        }
      }
    } catch {
      participantId = undefined;
    }

    if (!participantId) {
      setAttendanceHistoryError('Unable to determine participant. Please sign in again.');
      setAttendanceHistory([]);
      return;
    }

    setAttendanceHistoryLoading(true);
    setAttendanceHistoryError(null);
    setAttendanceHistory([]);

    try {
      const today = new Date();
      const results: AttendanceHistoryEntry[] = [];

      // Fetch a recent window of days (last 14 days including today)
      for (let offset = 0; offset < 14; offset++) {
        const d = new Date(today);
        d.setDate(today.getDate() - offset);
        const iso = d.toISOString().slice(0, 10);

        const res = await fetch(
          `http://localhost:5000/api/attendance/project?projectId=${encodeURIComponent(
            viewerProject._id,
          )}&date=${encodeURIComponent(iso)}`,
        );

        if (!res.ok) {
          continue;
        }

        const data = (await res.json()) as Array<{
          participantId?: string;
          date?: string;
          status?: string;
        }>;

        for (const record of data) {
          if (record.participantId === participantId && record.date && record.status) {
            results.push({ date: record.date, status: record.status });
          }
        }
      }

      // Sort by date descending
      results.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      setAttendanceHistory(results);
    } catch (err: any) {
      setAttendanceHistoryError(err?.message || 'Failed to load attendance history');
      setAttendanceHistory([]);
    } finally {
      setAttendanceHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-600">
            Browse extension projects you can join as a participant.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-amber-100 bg-white/80 p-6">
        {loading ? (
          <div className="text-center text-sm text-gray-600">Loading projects…</div>
        ) : error ? (
          <div className="text-center text-sm text-red-600">{error}</div>
        ) : null}

        {!loading && !error && (() => {
          const approved = projects.filter((project) => (project.status || "Pending") === "Approved");

          if (approved.length === 0) {
            return (
              <div className="text-center text-sm text-gray-600">
                No approved projects are available yet.
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Available projects</h2>
                <p className="text-xs text-gray-500">
                  Each card represents an extension project. Use the View project button when it becomes active.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {approved.map((project) => {
                  const status = project.status || "Pending";
                  const statusLabel =
                    status === "Approved" ? "Approved" : status === "Rejected" ? "Rejected" : "Pending";
                  const statusColor =
                    status === "Approved"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : status === "Rejected"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-amber-50 text-amber-700 border-amber-200";

                  return (
                    <div
                      key={project._id}
                      className="flex h-full flex-col rounded-xl border border-amber-100 bg-white/80 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex-1 space-y-1">
                        <h2 className="text-sm font-semibold text-gray-900 line-clamp-2">{project.name}</h2>
                        <p className="text-xs text-gray-600 line-clamp-3">{project.description}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2 text-xs">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusColor}`}
                        >
                          {statusLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setViewerProject(project);
                            setViewerMounted(true);
                            window.setTimeout(() => setViewerVisible(true), 20);
                          }}
                          className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
                        >
                          View project
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </section>

      {viewerMounted && (
        <div
          className="fixed inset-0 z-40 flex bg-black/40 backdrop-blur-sm"
          style={{
            opacity: viewerVisible ? 1 : 0,
            transition: "opacity 280ms ease-in-out",
          }}
        >
          <div
            className="flex h-full w-full flex-col bg-white shadow-2xl"
            style={{
              transform: viewerVisible ? "translateX(0%)" : "translateX(100%)",
              transition: "transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1)",
            }}
          >
            <div className="flex items-center justify-between border-b border-amber-100 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">Participant Workspace</p>
                <h2 className="text-lg font-semibold text-gray-900">Project details</h2>
                {viewerProject && (
                  <p className="text-xs text-gray-500 line-clamp-1">{viewerProject.name}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!viewerProject) return;
                    const status = joinStatusesByProject[viewerProject._id];
                    if (status === 'Approved') {
                      void handleSubmitProposal();
                    } else {
                      void handleRequestJoin();
                    }
                  }}
                  disabled={(() => {
                    if (!viewerProject) return true;
                    const status = joinStatusesByProject[viewerProject._id];
                    if (status === 'Approved') {
                      return submitLoading;
                    }
                    if (status === 'Requested') {
                      return true;
                    }
                    return joinRequestLoading;
                  })()}
                  className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {(() => {
                    if (!viewerProject) return 'Request join';
                    const status = joinStatusesByProject[viewerProject._id];
                    if (status === 'Approved') {
                      return submitLoading ? 'Submitting…' : 'Submit';
                    }
                    if (status === 'Requested') {
                      return 'Pending';
                    }
                    return joinRequestLoading ? 'Requesting…' : 'Request join';
                  })()}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewerVisible(false);
                    window.setTimeout(() => {
                      setViewerMounted(false);
                      setViewerProject(null);
                      setViewerData(null);
                    }, 340);
                  }}
                  className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex h-full min-h-0">
              <aside className="relative hidden w-64 border-r border-amber-100 bg-amber-50/60 p-4 text-xs text-gray-800 sm:flex sm:flex-col">
                <p className="mb-3 font-semibold uppercase tracking-wide text-amber-700">Sections</p>
                <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
                  {viewerSections.map((section) => {
                    const isActive = section.id === activeSectionId;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveSectionId(section.id)}
                        className={`block w-full rounded-lg px-3 py-2 text-left text-[11px] font-medium transition ${
                          isActive
                            ? "bg-amber-500 text-white shadow"
                            : "bg-white text-amber-800 hover:bg-amber-100"
                        }`}
                      >
                        {section.label}
                      </button>
                    );
                  })}
                </nav>
                <div className="mt-3 border-t border-amber-100 pt-3">
                  <div className="group relative">
                    <button
                      type="button"
                      onClick={() => setAttendanceControlsExpanded(true)}
                      className="w-full rounded-full bg-amber-500 px-3 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-amber-600"
                    >
                      Attendance
                    </button>
                    <div className="pointer-events-none absolute bottom-full left-0 right-0 mb-2 translate-y-1 opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
                      <div className="rounded-lg border border-amber-100 bg-white px-2 py-1.5 text-[10px] text-gray-700 shadow-sm">
                        <p className="font-semibold text-amber-700">Options</p>
                        <div className="mt-1 flex flex-col gap-0.5">
                          <span>Active</span>
                          <span>Attendance history</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`pointer-events-auto absolute inset-x-0 bottom-0 top-8 transform bg-amber-50/95 shadow-inner transition-transform duration-250 ease-out ${
                    attendanceControlsExpanded ? "translate-y-0" : "translate-y-full"
                  }`}
                  aria-hidden={!attendanceControlsExpanded}
                >
                  <div className="flex h-full flex-col border-t border-amber-100 px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Attendance</p>
                    <div className="mt-2 space-y-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => void handleMarkAttendance()}
                        disabled={
                          attendanceMarking ||
                          !(
                            viewerProject &&
                            joinStatusesByProject[viewerProject._id] === 'Approved'
                          ) ||
                          (viewerProject ? !!attendanceMarkedByProject[viewerProject._id] : false)
                        }
                        className="w-full rounded-full bg-emerald-500 px-3 py-1.5 font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {viewerProject && attendanceMarkedByProject[viewerProject._id]
                          ? 'Active'
                          : viewerProject && joinStatusesByProject[viewerProject._id] !== 'Approved'
                          ? 'Waiting for approval'
                          : attendanceMarking
                          ? 'Marking…'
                          : 'Mark Active'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAttendanceHistoryOpen(true);
                          void fetchAttendanceHistory();
                        }}
                        className="w-full rounded-full border border-amber-300 bg-white px-3 py-1.5 font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100"
                      >
                        Attendance history
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttendanceControlsExpanded(false)}
                      className="mt-auto self-end rounded-full px-2 py-1 text-[10px] font-medium text-amber-700 transition hover:bg-amber-100"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </aside>
              <div className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-8">
                {/* Viewer content is read-only until the participant has marked themselves Active for this project */}
                <div
                  ref={viewerContentRef}
                  className={`mx-auto w-full max-w-6xl space-y-4 text-sm text-gray-700 ${
                    viewerProject && !attendanceMarkedByProject[viewerProject._id]
                      ? 'pointer-events-none opacity-60'
                      : ''
                  }`}
                >
                  {viewerLoading && (
                    <div className="text-center text-xs text-gray-600">Loading proposal…</div>
                  )}
                  {!viewerLoading && viewerError && (
                    <div className="text-center text-xs text-red-600">{viewerError}</div>
                  )}
                  {!viewerLoading && !viewerError && (!viewerData || !(viewerData as any).proposalData) && (
                    <div className="text-center text-xs text-gray-500">
                      This project does not have a stored proposal.
                    </div>
                  )}
                  {!viewerLoading && !viewerError && viewerData && (viewerData as any).proposalData && (
                    <>
                      {viewerSections.map((section) => {
                        const proposal = (viewerData as any).proposalData as Record<string, any>;
                        const snapshot = proposal[section.id];
                        const isActive = section.id === activeSectionId;

                        return (
                          <div
                            key={section.id}
                            data-section-id={section.id}
                            className={isActive ? "space-y-3" : "hidden"}
                            aria-hidden={isActive ? "false" : "true"}
                          >
                            <h3 className="text-sm font-semibold text-gray-900">{section.label}</h3>
                            {snapshot && snapshot.htmlContent ? (
                              <div
                                className="participant-proposal-html prose max-w-none select-text rounded-xl border border-amber-100 bg-amber-50/40 p-4 text-sm text-gray-800 prose-p:mb-2"
                                dangerouslySetInnerHTML={{ __html: snapshot.htmlContent as string }}
                              />
                            ) : (
                              <p className="text-xs text-gray-500">No content saved for this section.</p>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
                {viewerProject && !attendanceMarkedByProject[viewerProject._id] && (
                  <div className="pointer-events-none absolute inset-x-6 top-4 z-10 rounded-full bg-amber-500/95 px-4 py-2 text-center text-[11px] font-semibold text-white shadow">
                    Mark Active to answer this project today.
                  </div>
                )}
              </div>
              {attendanceHistoryOpen && viewerProject && (
                <div className="hidden w-80 border-l border-amber-100 bg-white/95 px-4 py-4 text-xs text-gray-700 shadow-inner sm:block">
                  <div className="mb-3 flex items-center justify-between border-b border-amber-100 pb-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-500">Attendance</p>
                      <h3 className="text-sm font-semibold text-gray-900">Attendance history</h3>
                      <p className="text-[11px] text-gray-500 line-clamp-1">{viewerProject.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttendanceHistoryOpen(false)}
                      className="rounded-full border border-amber-200 px-3 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50"
                    >
                      Close
                    </button>
                  </div>
                  <div className="space-y-2">
                    <p className="mb-1 font-semibold text-gray-900">Recent attendance (last 14 days)</p>
                    {attendanceHistoryLoading && (
                      <p className="text-gray-600">Loading attendance…</p>
                    )}
                    {!attendanceHistoryLoading && attendanceHistoryError && (
                      <p className="text-red-600">{attendanceHistoryError}</p>
                    )}
                    {!attendanceHistoryLoading && !attendanceHistoryError && attendanceHistory.length === 0 && (
                      <p className="text-gray-600">No attendance records found for this project yet.</p>
                    )}
                    {!attendanceHistoryLoading && !attendanceHistoryError && attendanceHistory.length > 0 && (
                      <ul className="space-y-1">
                        {attendanceHistory.map((entry) => {
                          const dateLabel = (() => {
                            try {
                              return new Date(entry.date).toLocaleDateString();
                            } catch {
                              return entry.date;
                            }
                          })();

                          return (
                            <li
                              key={`${entry.date}-${entry.status}`}
                              className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/60 px-2 py-1"
                            >
                              <span className="text-[11px] text-gray-700">{dateLabel}</span>
                              <span className="text-[11px] font-semibold text-emerald-700">{entry.status}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {submitSuccessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-900">Changes submitted</h3>
            <p className="mt-2 text-sm text-gray-600">
              Your updates to this project have been submitted successfully.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSubmitSuccessOpen(false)}
                className="rounded-full border border-amber-200 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {attendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-900">
              {attendanceModalError ? 'Attendance not saved' : "You're marked active today"}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {attendanceModalError
                ? attendanceModalError
                : 'Your attendance for today has been recorded for this project.'}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAttendanceModalOpen(false)}
                className="rounded-full border border-amber-200 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {joinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-900">
              {joinModalError ? 'Request failed' : 'Request sent'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {joinModalError
                ? joinModalError
                : 'Your join request has been sent to the project leader.'}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setJoinModalOpen(false)}
                className="rounded-full border border-amber-200 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
