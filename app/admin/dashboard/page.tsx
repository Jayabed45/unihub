"use client";

import { useEffect, useState } from "react";
import { Users, ClipboardList, CheckCircle2, Signal } from "lucide-react";

interface Project {
  _id: string;
  name: string;
  description: string;
  status?: "Pending" | "Approved" | "Rejected" | string;
}

interface User {
  _id: string;
  email: string;
  role: { name: string };
}

const AUTH_STORAGE_KEY = "unihub-auth";

export default function AdminDashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [projectsRes, usersRes, onlineRes] = await Promise.all([
          fetch("http://localhost:5000/api/projects"),
          fetch("http://localhost:5000/api/auth/users"),
          fetch("http://localhost:5000/api/auth/online-users"),
        ]);

        if (projectsRes.ok) {
          const data = (await projectsRes.json()) as Project[];
          setProjects(data);
        }

        if (usersRes.ok) {
          const data = (await usersRes.json()) as User[];
          setUsers(data);
        }

        if (onlineRes.ok) {
          const data = (await onlineRes.json()) as { userIds?: string[] };
          if (Array.isArray(data.userIds)) {
            setOnlineUserIds(data.userIds);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // Read the current admin id so we can exclude it from stats/lists
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { id?: string } | null;
      if (parsed?.id) {
        setCurrentUserId(parsed.id);
      }
    } catch {
      // best-effort only
    }
  }, []);

  const totalProjects = projects.length;
  const pendingProjects = projects.filter((p) => (p.status || "Pending") === "Pending").length;

  const effectiveUsers = currentUserId
    ? users.filter((u) => u._id !== currentUserId)
    : users;

  const totalUsers = effectiveUsers.length;
  const onlineCount = effectiveUsers.filter((u) => onlineUserIds.includes(u._id)).length;

  const recentProjects = projects.slice(0, 5);
  const recentUsers = effectiveUsers.slice(0, 5);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-amber-100 bg-white/80 p-10 text-sm text-gray-700">
        Loading dashboard…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-red-100 bg-white/80 p-10 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All users</h1>
          <p className="text-sm text-gray-600">Oversee user accounts, project approvals, and platform activity.</p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label="Total projects" value={totalProjects} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Pending approvals" value={pendingProjects} />
        <StatCard icon={<Users className="h-5 w-5" />} label="Total users" value={totalUsers} />
        <StatCard icon={<Signal className="h-5 w-5" />} label="Online now" value={onlineCount} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-amber-100 bg-white/80 p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Recent projects</h2>
              <p className="text-xs text-gray-500">Latest proposals across the platform.</p>
            </div>
          </div>
          {recentProjects.length === 0 ? (
            <p className="text-sm text-gray-600">No projects have been created yet.</p>
          ) : (
            <ul className="space-y-2 text-sm text-gray-800">
              {recentProjects.map((project) => (
                <li
                  key={project._id}
                  className="flex items-start justify-between rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <div>
                    <p className="font-semibold text-gray-900 line-clamp-1">{project.name}</p>
                    <p className="text-xs text-gray-600 line-clamp-2">{project.description}</p>
                  </div>
                  <span className="ml-3 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    {project.status || "Pending"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white/80 p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Recent users</h2>
              <p className="text-xs text-gray-500">Quick view of the most recent accounts.</p>
            </div>
          </div>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-gray-600">No users found.</p>
          ) : (
            <ul className="space-y-2 text-sm text-gray-800">
              {recentUsers.map((user) => (
                <li
                  key={user._id}
                  className="flex items-center justify-between rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <div>
                    <p className="font-semibold text-gray-900 line-clamp-1">{user.email}</p>
                    <p className="text-xs text-gray-600">{user.role?.name || "N/A"}</p>
                  </div>
                  <span className="ml-3">
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
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-white/80 px-4 py-3 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
