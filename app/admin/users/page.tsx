"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { io, type Socket } from "socket.io-client";

interface User {
  _id: string;
  email: string;
  role: { name: "admin" | "project-leader" | "participant" | string };
}

const AUTH_STORAGE_KEY = "unihub-auth";

export default function AllUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("http://localhost:5000/api/auth/users");
        if (!res.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await res.json();
        setUsers(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  // Read the currently authenticated admin id from localStorage so we can hide it from the list
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { id?: string } | null;
      if (parsed?.id) {
        setCurrentUserId(parsed.id);
      }
    } catch {
      // best-effort only; if this fails, admin will simply still appear in the list
    }
  }, []);

  useEffect(() => {
    let socket: Socket | null = null;

    const fetchOnline = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/auth/online-users");
        if (!res.ok) return;
        const data = (await res.json()) as { userIds?: string[] };
        if (Array.isArray(data.userIds)) {
          setOnlineUserIds(data.userIds);
        }
      } catch {
        // best-effort only
      }
    };

    fetchOnline();

    socket = io("http://localhost:5000");

    socket.on("user:online", (payload: { userId?: string }) => {
      if (!payload?.userId) return;
      setOnlineUserIds((prev) => (prev.includes(payload.userId!) ? prev : [payload.userId!, ...prev]));
    });

    socket.on("user:offline", (payload: { userId?: string }) => {
      if (!payload?.userId) return;
      setOnlineUserIds((prev) => prev.filter((id) => id !== payload.userId));
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const handleDeleteUser = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this user?");
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetch(`http://localhost:5000/api/auth/users/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).message || "Failed to delete user");
      }
      setUsers((prev) => prev.filter((user) => user._id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <div className="h-6 w-40 rounded-lg bg-amber-100 animate-pulse" />
            <div className="mt-2 h-4 w-64 rounded-lg bg-amber-50 animate-pulse" />
          </div>
        </header>

        <section className="rounded-2xl border border-amber-100 bg-white/80 p-6">
          <div className="overflow-hidden rounded-xl border border-amber-100">
            <div className="grid grid-cols-4 border-b border-amber-100 bg-amber-50/60 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-3 w-24 rounded bg-amber-100 animate-pulse" />
              ))}
            </div>
            <div className="divide-y divide-amber-50">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-4 gap-4 p-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-4 w-32 rounded bg-amber-50 animate-pulse" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-red-100 bg-white/80 p-10 text-sm text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All users</h1>
          <p className="text-sm text-gray-600">Oversee user accounts, roles, and presence.</p>
        </div>
      </header>

      <section className="rounded-2xl border border-amber-100 bg-white/80 p-6">
        {(() => {
          const filtered = searchQuery
            ? users.filter((u) =>
                [u.email, u.role?.name]
                  .filter(Boolean)
                  .some((v) => String(v).toLowerCase().includes(searchQuery))
              )
            : users;
          if (filtered.length === 0) {
            return <p className="text-sm text-gray-600">{searchQuery ? "No matching users found." : "No users found."}</p>;
          }
          return (
            <>
              {/* Mobile: stacked cards */}
              <div className="space-y-3 md:hidden">
                {filtered
                  .filter((user) => user._id !== currentUserId)
                  .map((user) => (
                    <div
                      key={user._id}
                      className="rounded-xl border border-amber-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{user.email}</p>
                          <p className="mt-0.5 text-xs text-gray-600">Role: {user.role?.name || 'N/A'}</p>
                        </div>
                        <div>
                          {onlineUserIds.includes(user._id) ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                              <span className="h-2 w-2 rounded-full bg-gray-400" />
                              Offline
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user._id)}
                          disabled={deletingId === user._id}
                          className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === user._id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full border-collapse text-sm text-gray-800">
                  <thead className="border-b border-amber-100 bg-amber-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left">Email</th>
                      <th scope="col" className="px-4 py-2 text-left">Role</th>
                      <th scope="col" className="px-4 py-2 text-left">Status</th>
                      <th scope="col" className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    {filtered
                      .filter((user) => user._id !== currentUserId)
                      .map((user) => (
                        <tr key={user._id} className="transition-colors hover:bg-amber-50/70">
                          <td className="px-4 py-2 font-medium text-gray-900">{user.email}</td>
                          <td className="px-4 py-2 text-gray-700">{user.role?.name || 'N/A'}</td>
                          <td className="px-4 py-2 text-gray-700">
                            {onlineUserIds.includes(user._id) ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                <span className="h-2 w-2 rounded-full bg-gray-400" />
                                Offline
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user._id)}
                              disabled={deletingId === user._id}
                              className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingId === user._id ? 'Deleting…' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()}
      </section>
    </div>
  );
}
