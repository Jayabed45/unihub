"use client";

import React, { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

interface JoinRequestRow {
  id: string;
  projectId?: string;
  projectName: string;
  projectStatus: "Pending" | "Approved" | "Rejected" | string;
  status: "Requested" | "Approved" | "Rejected" | string;
  requesterId?: string;
  requesterName?: string;
  requesterEmail?: string;
  createdAt?: string;
}

const STORAGE_KEY = "unihub-auth";

export default function ProjectLeaderParticipantsPage() {
  const [joinRequests, setJoinRequests] = useState<JoinRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [onlineByUserId, setOnlineByUserId] = useState<Record<string, boolean>>({});
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let loadedLeaderId: string | undefined;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { id?: string; role?: string } | null;
        if (parsed && parsed.id && parsed.role === "Project Leader") {
          loadedLeaderId = parsed.id;
        }
      }
    } catch {
      // ignore parse errors, handled below
    }

    if (!loadedLeaderId) {
      return;
    }

    setLeaderId(loadedLeaderId);

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `http://localhost:5000/api/notifications/join-requests?leaderId=${encodeURIComponent(loadedLeaderId!)}`,
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Failed to load join requests");
        }

        const data = (await res.json()) as JoinRequestRow[];
        setJoinRequests(data);
      } catch (err: any) {
        setError(err.message || "Failed to load join requests");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);
  // Load initial presence state for all participants in the list
  useEffect(() => {
    if (joinRequests.length === 0) {
      setOnlineByUserId({});
      return;
    }

    const userIds = Array.from(
      new Set(
        joinRequests
          .map((item) => item.requesterId)
          .filter((id): id is string => !!id),
      ),
    );

    if (userIds.length === 0) {
      setOnlineByUserId({});
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/presence?userIds=${encodeURIComponent(userIds.join(','))}`,
        );
        if (!res.ok) {
          await res.json().catch(() => undefined);
          return;
        }

        const data = (await res.json()) as Record<string, boolean>;
        setOnlineByUserId(data);
      } catch (error) {
        console.error('Failed to load initial presence', error);
      }
    };

    run();
  }, [joinRequests]);

  // Subscribe to real-time presence updates via Socket.IO
  useEffect(() => {
    if (!leaderId) {
      return;
    }

    try {
      const socketInstance = io('http://localhost:5000');
      setSocket(socketInstance);

      socketInstance.emit('notifications:subscribe', {
        userId: leaderId,
        role: 'Project Leader',
      });

      const handlePresenceUpdate = (payload: { userId?: string; online?: boolean }) => {
        if (!payload || !payload.userId || typeof payload.online !== 'boolean') {
          return;
        }

        setOnlineByUserId((prev) => ({
          ...prev,
          [payload.userId!]: payload.online!,
        }));
      };

      socketInstance.on('presence:update', handlePresenceUpdate);

      return () => {
        socketInstance.off('presence:update', handlePresenceUpdate);
        socketInstance.disconnect();
      };
    } catch (error) {
      console.error('Failed to set up presence socket for project leader', error);
    }
  }, [leaderId]);

  const statusBadgeClass = (status: string) => {
    if (status === "Approved") {
      return "inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200";
    }
    if (status === "Rejected") {
      return "inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200";
    }
    return "inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-semibold text-yellow-800 border border-yellow-200";
  };

  const onlineBadgeClass = (online: boolean) => {
    if (online) {
      return "inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200";
    }
    return "inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 border border-gray-200";
  };

  const updateJoinRequestStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    if (updatingId) return;

    setUpdatingId(id);
    try {
      const res = await fetch(`http://localhost:5000/api/notifications/join-requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update request');
      }

      setJoinRequests((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item)),
      );
    } catch (err) {
      console.error('Failed to update join request', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Participants</h1>
          <p className="text-xs text-gray-500">
            Join requests and live presence from participants across your extension projects.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-gray-100 bg-white/95 p-4 sm:p-5 text-sm text-gray-700 shadow-sm">
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Loading join requests…</div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-red-600">{error}</div>
        ) : joinRequests.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">
            No join requests have been submitted yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="sticky left-0 z-10 border-b border-gray-200 bg-gray-50/90 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Participant
                    </th>
                    <th className="border-b border-gray-200 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Project
                    </th>
                    <th className="border-b border-gray-200 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Request Status
                    </th>
                    <th className="border-b border-gray-200 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Project Status
                    </th>
                    <th className="border-b border-gray-200 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Online
                    </th>
                    <th className="border-b border-gray-200 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                    <th className="border-b border-gray-200 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Requested At
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {joinRequests.map((item) => {
                  const requestedAtLabel = item.createdAt
                    ? new Date(item.createdAt).toLocaleString("en-PH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "";

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-gray-50">
                      <td className="sticky left-0 z-0 whitespace-nowrap border-b border-gray-100 bg-white px-4 py-2 text-sm font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className="truncate">{item.requesterEmail || item.requesterName || "Unknown participant"}</span>
                          {item.requesterEmail && item.requesterName && (
                            <span className="text-xs text-gray-500">{item.requesterName}</span>
                          )}
                        </div>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-2 align-middle text-sm text-gray-900">
                        <span className="line-clamp-1">{item.projectName}</span>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-2 align-middle">
                        <span className={statusBadgeClass(item.status)}>{item.status}</span>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-2 align-middle">
                        <span className={statusBadgeClass(item.projectStatus)}>{item.projectStatus}</span>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-2 align-middle">
                        {(() => {
                          const requesterId = item.requesterId;
                          const isOnline = requesterId ? !!onlineByUserId[requesterId] : false;
                          return (
                            <span className={onlineBadgeClass(isOnline)}>
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="border-b border-gray-100 px-4 py-2 align-middle">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={updatingId === item.id || item.status === 'Approved'}
                            onClick={() => updateJoinRequestStatus(item.id, 'Approved')}
                            className="rounded-full border border-emerald-200 px-3 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Approve
                          </button>
                          {item.status !== 'Approved' && (
                            <button
                              type="button"
                              disabled={updatingId === item.id || item.status === 'Rejected'}
                              onClick={() => updateJoinRequestStatus(item.id, 'Rejected')}
                              className="rounded-full border border-red-200 px-3 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-2 text-right align-middle text-xs text-gray-500">
                        {requestedAtLabel}
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
