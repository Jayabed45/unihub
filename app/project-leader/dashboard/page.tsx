'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, 
  ClipboardList, 
  Bell, 
  ArrowRight
} from 'lucide-react';

interface Project {
  _id: string;
  name: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  participants: string[]; 
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  createdAt: string;
}

export default function ProjectLeaderDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newNotificationId, setNewNotificationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        let leaderId: string | undefined;
        let leaderEmail: string | undefined;

        try {
          const stored = window.localStorage.getItem('unihub-auth');
          if (stored) {
            const parsed = JSON.parse(stored) as { id?: string; email?: string; role?: string } | null;
            if (parsed?.role === 'Project Leader') {
              if (parsed.id) leaderId = parsed.id;
              if (parsed.email && typeof parsed.email === 'string') leaderEmail = parsed.email;
            }
          }
        } catch {
          // best-effort only; fall back to unfiltered endpoints
        }

        const projectParams = new URLSearchParams();
        if (leaderId) {
          projectParams.append('projectLeaderId', leaderId);
        }
        const projectsUrl = projectParams.toString()
          ? `http://localhost:5000/api/projects?${projectParams.toString()}`
          : 'http://localhost:5000/api/projects';

        const notifParams = new URLSearchParams();
        if (leaderId) notifParams.append('leaderId', leaderId);
        if (leaderEmail) notifParams.append('leaderEmail', leaderEmail);
        const notificationsUrl = notifParams.toString()
          ? `http://localhost:5000/api/notifications?${notifParams.toString()}`
          : 'http://localhost:5000/api/notifications';

        const [projectsRes, notificationsRes] = await Promise.all([
          fetch(projectsUrl),
          fetch(notificationsUrl),
        ]);

        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData);
        }

        if (notificationsRes.ok) {
          const notificationsData = await notificationsRes.json();
          setNotifications(notificationsData.slice(0, 5));

          const newestNotification = notificationsData[0];
          if (newestNotification) {
            const seenInfo = JSON.parse(localStorage.getItem('unihub-newest-notification-seen') || '{}');
            const twentyMinutes = 20 * 60 * 1000;

            if (seenInfo.id !== newestNotification._id) {
              localStorage.setItem('unihub-newest-notification-seen', JSON.stringify({ id: newestNotification._id, timestamp: Date.now() }));
              setNewNotificationId(newestNotification._id);
            } else {
              if (Date.now() - seenInfo.timestamp < twentyMinutes) {
                setNewNotificationId(newestNotification._id);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const totalProjects = projects.length;
  const totalParticipants = projects.reduce((acc, project) => acc + (project.participants?.length || 0), 0);
  const pendingJoinRequests = notifications.filter(n => n.title === 'Join request').length;

  if (loading) {
    return <div className="text-center p-10">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<ClipboardList />} title="Total Projects" value={totalProjects} />
        <StatCard icon={<Users />} title="Total Participants" value={totalParticipants} />
        <StatCard icon={<Bell />} title="Pending Join Requests" value={pendingJoinRequests} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">My Projects</h2>
          <div className="space-y-4">
            {projects.map(project => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">Recent Activity</h2>
          <div className="space-y-4">
            {notifications.map(notification => (
              <NotificationItem key={notification._id} notification={notification} isNew={notification._id === newNotificationId} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: number }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
      <div className="bg-yellow-100 text-yellow-600 p-3 rounded-full">
        {icon}
      </div>
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <h3 className="font-semibold text-gray-800">{project.name}</h3>
      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Users size={16} />
          <span>{project.participants?.length || 0} Participants</span>
        </div>
              </div>
    </div>
  );
}

function NotificationItem({ notification, isNew }: { notification: Notification; isNew: boolean }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-gray-800">{notification.title}</p>
        {isNew && (
          <span className="animate-pulse bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-1 rounded-full">
            New
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
      <p className="text-xs text-gray-400 mt-2">{new Date(notification.createdAt).toLocaleString()}</p>
    </div>
  );
}
