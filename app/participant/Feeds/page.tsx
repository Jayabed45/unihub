"use client";

import React, { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useSearchParams } from "next/navigation";

interface FeedProject {
  _id: string;
  name: string;
  description: string;
  status?: "Pending" | "Approved" | "Rejected" | string;
  createdAt?: string;
}

interface JoinFeedItem {
  projectId?: string;
  status?: 'Requested' | 'Approved' | 'Rejected';
  createdAt?: string;
}

interface UpdateFeedItem {
  projectId?: string;
  selfUpdatedAt?: string;
  leaderUpdatedAt?: string;
  leaderEmail?: string;
}

export default function ParticipantFeedsPage() {
  const [projects, setProjects] = useState<FeedProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [joinsByProject, setJoinsByProject] = useState<Record<string, JoinFeedItem>>({});
  const [updatesByProject, setUpdatesByProject] = useState<Record<string, UpdateFeedItem>>({});
  const searchParams = useSearchParams();
  const highlightedProjectId = searchParams.get("projectId");

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/projects");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to load projects");
      }
      const data = (await res.json()) as FeedProject[];
      setProjects(data);
    } catch (err: any) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProjects();
  }, []);

  // Real-time refresh when backend broadcasts notifications:refresh to participants
  useEffect(() => {
    let participantId: string | undefined;
    try {
      const stored = window.localStorage.getItem("unihub-auth");
      if (stored) {
        const parsed = JSON.parse(stored) as { id?: string; role?: string } | null;
        if (parsed && parsed.id && parsed.role === "Participant") {
          participantId = parsed.id;
        }
      }
    } catch {
      // ignore parse errors
    }

    if (!participantId) {
      return;
    }

    const fetchJoinRequests = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/notifications/join-requests/participant?participantId=${encodeURIComponent(
            participantId!,
          )}`,
        );
        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as JoinFeedItem[];
        const mapped: Record<string, JoinFeedItem> = {};
        for (const item of data) {
          if (item.projectId) {
            mapped[item.projectId] = item;
          }
        }
        setJoinsByProject(mapped);
      } catch {
        // ignore join fetch errors for feeds
      }
    };

    const fetchProjectUpdates = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/notifications?recipient=${encodeURIComponent(
            participantId!,
          )}&includeHidden=true`,
        );
        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as Array<{
          title?: string;
          project?: string;
          createdAt?: string;
          message?: string;
          requester?: string;
        }>;

        const mapped: Record<string, UpdateFeedItem> = {};
        for (const item of data) {
          if (item.title !== 'Project updated' || !(item as any).project) continue;

          const projectId = String((item as any).project);
          const createdAt = item.createdAt || undefined;
          const requesterId = (item as any).requester ? String((item as any).requester) : undefined;
          const isSelf = requesterId && requesterId === participantId;

          const existing = mapped[projectId] || { projectId };

          if (isSelf) {
            if (!existing.selfUpdatedAt || (createdAt && new Date(createdAt) > new Date(existing.selfUpdatedAt))) {
              existing.selfUpdatedAt = createdAt;
            }
          } else {
            if (!existing.leaderUpdatedAt || (createdAt && new Date(createdAt) > new Date(existing.leaderUpdatedAt))) {
              existing.leaderUpdatedAt = createdAt;

              // Try to pull leader email from message if present ("<email> updated this project")
              const msg = item.message || '';
              const parts = msg.split(' ');
              const maybeEmail = parts[0];
              if (maybeEmail && maybeEmail.includes('@')) {
                existing.leaderEmail = maybeEmail;
              }
            }
          }

          mapped[projectId] = existing;
        }

        setUpdatesByProject(mapped);
      } catch {
        // ignore update fetch errors for feeds
      }
    };

    void fetchJoinRequests();
    void fetchProjectUpdates();

    try {
      const socket = io("http://localhost:5000");
      socketRef.current = socket;

      socket.emit("notifications:subscribe", {
        userId: participantId,
        role: "Participant",
      });

      const handleRefresh = () => {
        void fetchProjects();
        void fetchJoinRequests();
        void fetchProjectUpdates();
      };

      socket.on("notifications:refresh", handleRefresh);

      return () => {
        socket.off("notifications:refresh", handleRefresh);
        socket.disconnect();
        socketRef.current = null;
      };
    } catch {
      // ignore socket setup errors on client
    }
  }, []);

  const formatTimeAgo = (iso?: string) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const statusBadgeClass = (status?: string) => {
    if (status === "Approved") {
      return "inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200";
    }
    if (status === "Rejected") {
      return "inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200";
    }
    if (status === "Pending") {
      return "inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200";
    }
    return "inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-700 border border-gray-200";
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Feeds</h1>
          <p className="text-sm text-gray-500">
            See announcements and updates related to extension projects you can join.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-6 text-center text-sm text-gray-500">
          Loading projects…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50/60 p-6 text-center text-sm text-red-700">
          {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-6 text-center text-sm text-gray-500">
          No projects are available yet. New or updated projects from leaders will appear here.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const isApproved = project.status === 'Approved';
            const joinInfo = joinsByProject[project._id];
            const updateInfo = updatesByProject[project._id];

            const projectTimeAgo = formatTimeAgo(project.createdAt);
            const joinTimeAgo = joinInfo?.createdAt ? formatTimeAgo(joinInfo.createdAt) : '';
            const selfUpdatedAgo = updateInfo?.selfUpdatedAt
              ? formatTimeAgo(updateInfo.selfUpdatedAt)
              : '';
            const leaderUpdatedAgo = updateInfo?.leaderUpdatedAt
              ? formatTimeAgo(updateInfo.leaderUpdatedAt)
              : '';

            return (
              <article
                key={project._id}
                className="rounded-2xl border border-amber-100 bg-white/90 p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-gray-500">
                        <span>Project created</span>
                        {projectTimeAgo && <span> • {projectTimeAgo}</span>}
                      </div>
                      <div className={statusBadgeClass(project.status)}>{project.status}</div>
                    </div>
                    <h2 className="mt-2 text-lg font-bold text-gray-900">{project.name}</h2>
                    <p className="mt-1 text-sm text-gray-700 line-clamp-3">{project.description}</p>
                  </div>
                </div>

                {(joinInfo || updateInfo) && (
                  <div className="mt-4 border-t border-amber-100 pt-4">
                    {joinInfo && joinTimeAgo && (
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700">•</div>
                        <div>
                          <span className="font-semibold text-gray-800">You</span>{' '}
                          {joinInfo.status === 'Approved'
                            ? 'joined this project'
                            : 'requested to join this project'}{' '}
                          <span className="text-gray-500">{joinTimeAgo}</span>
                        </div>
                      </div>
                    )}
                    {selfUpdatedAgo && (
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700">•</div>
                        <div>
                          <span className="font-semibold text-gray-800">You</span> updated this project{' '}
                          <span className="text-gray-500">{selfUpdatedAgo}</span>
                        </div>
                      </div>
                    )}
                    {leaderUpdatedAgo && (
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700">•</div>
                        <div>
                          <span className="font-semibold text-gray-800">
                            {updateInfo?.leaderEmail ? updateInfo.leaderEmail : 'Project leader'}
                          </span>{' '}
                          updated this project{' '}
                          <span className="text-gray-500">{leaderUpdatedAgo}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
