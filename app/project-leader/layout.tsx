'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';

import Sidebar from './components/Sidebar';
import HeaderBar from './components/HeaderBar';
import { projectLeaderNavigation } from './navigation';
import NotificationsPanel, { type NotificationItem } from '../admin/components/NotificationsPanel';

const STORAGE_KEY = 'unihub-auth';

interface StoredUser {
  id: string;
  role: string;
  token: string;
}

export default function ProjectLeaderLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutProgress, setLogoutProgress] = useState(0);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const markNotificationRead = useCallback(async (id: string) => {
    try {
      await fetch(`http://localhost:5000/api/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
      });
    } catch (error) {
      console.error('Failed to mark project leader notification as read', error);
    }
  }, []);

  const handleLogout = useCallback(() => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutProgress((prev) => (prev === 0 ? 10 : prev));

    window.setTimeout(() => {
      setLogoutProgress(100);
      window.localStorage.removeItem(STORAGE_KEY);
      router.replace('/');

      window.setTimeout(() => {
        setIsAuthorized(false);
        setIsLoggingOut(false);
      }, 400);
    }, 600);
  }, [isLoggingOut, router]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        router.replace('/');
        return;
      }

      const parsed = JSON.parse(stored) as StoredUser | null;
      if (!parsed || parsed.role !== 'Project Leader') {
        window.localStorage.removeItem(STORAGE_KEY);
        router.replace('/');
        return;
      }

      setIsAuthorized(true);
      setUser(parsed);
    } catch (error) {
      console.error('Failed to verify project leader access', error);
      window.localStorage.removeItem(STORAGE_KEY);
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchNotifications = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/notifications?recipient=${encodeURIComponent(user.id)}`,
        );
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as Array<{
          _id: string;
          title: string;
          message: string;
          project?: string;
          read?: boolean;
          createdAt?: string;
        }>;

        const mapped: NotificationItem[] = data.map((item) => ({
          id: item._id,
          title: item.title,
          message: item.message,
          timestamp: item.createdAt
            ? new Date(item.createdAt).toLocaleString('en-PH', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : '',
          read: item.read,
          projectId: (item as any).project ? String((item as any).project) : undefined,
        }));

        setNotifications(mapped);
      } catch (error) {
        console.error('Failed to load project leader notifications', error);
      }
    };

    fetchNotifications();

    try {
      const socket = io('http://localhost:5000');
      socketRef.current = socket;

      socket.emit('notifications:subscribe', {
        userId: user.id,
        role: user.role,
      });

      const handleRefresh = () => {
        void fetchNotifications();
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
  }, [user]);

  useEffect(() => {
    if (!isLoggingOut) {
      setLogoutProgress(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLogoutProgress((prev) => {
        if (prev >= 90) {
          return prev;
        }

        const nextValue = prev + Math.random() * 15;
        return Math.min(nextValue, 90);
      });
    }, 180);

    return () => {
      window.clearInterval(interval);
    };
  }, [isLoggingOut]);

  if (!isAuthorized && !isLoggingOut) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-yellow-50 via-white to-white">
      {logoutProgress > 0 && (
        <div className="fixed inset-x-0 top-0 z-50">
          <div
            className="h-1 w-full origin-left bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 transition-[transform,width] duration-500"
            style={{ width: `${logoutProgress}%` }}
          />
        </div>
      )}
      <Sidebar items={projectLeaderNavigation} onLogout={handleLogout} logoutDisabled={isLoggingOut} />

      <main className="flex-1">
        <HeaderBar
          onToggleNotifications={() => setNotificationsOpen((prev) => !prev)}
          notificationsOpen={notificationsOpen}
          notificationsCount={notifications.filter((item) => !item.read).length}
        />
        <div className="mx-auto max-w-6xl px-6 py-10">
          {children}
        </div>
      </main>

      <NotificationsPanel
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onNotificationClick={(item) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
          );

          markNotificationRead(item.id);

          if (item.title === 'Join request received') {
            router.push('/project-leader/participants');
          } else if (item.title === 'Attendance' && item.projectId) {
            router.push(
              `/project-leader/projects?highlight=${encodeURIComponent(
                item.projectId,
              )}&viewParticipants=${encodeURIComponent(item.projectId)}`,
            );
          } else if (item.projectId) {
            router.push(
              `/project-leader/projects?highlight=${encodeURIComponent(item.projectId)}`,
            );
          }

          setNotificationsOpen(false);
        }}
      />
    </div>
  );
}
