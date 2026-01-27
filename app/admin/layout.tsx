'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';

import Sidebar from './components/Sidebar';
import HeaderBar from './components/HeaderBar';
import NotificationsPanel, { type NotificationItem } from './components/NotificationsPanel';
import { adminNavigation } from './navigation';

const STORAGE_KEY = 'unihub-auth';

interface StoredUser {
  id: string;
  role: string;
  token: string;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutProgress, setLogoutProgress] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const previousNotificationIdsRef = useRef<string[]>([]);
  const initialNotificationsLoadedRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);

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
      if (!parsed || parsed.role !== 'Administrator') {
        window.localStorage.removeItem(STORAGE_KEY);
        router.replace('/');
        return;
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error('Failed to verify administrator access', error);
      window.localStorage.removeItem(STORAGE_KEY);
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/notifications');
        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as Array<{
          _id: string;
          title: string;
          message: string;
          read?: boolean;
          createdAt?: string;
          project?: string;
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
          projectId: item.project,
        }));

        setNotifications(mapped);
      } catch (error) {
        console.error('Failed to load admin notifications', error);
      }
    };

    fetchNotifications();
  }, []);

  useEffect(() => {
    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    socket.on('notification:new', (payload: NotificationItem) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === payload.id)) {
          return prev;
        }
        return [payload, ...prev];
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!notifications.length) {
      previousNotificationIdsRef.current = [];
      return;
    }

    const currentIds = notifications.map((n) => n.id);

    if (!initialNotificationsLoadedRef.current) {
      initialNotificationsLoadedRef.current = true;
      previousNotificationIdsRef.current = currentIds;
      return;
    }

    const previousIds = previousNotificationIdsRef.current;
    const newOnes = notifications.filter((n) => !previousIds.includes(n.id));

    if (newOnes.length > 0) {
      const latest = newOnes[0];
      setToastNotification(latest);
      setToastVisible(true);

      // Hide after 5 seconds with smooth slide-out animation
      window.setTimeout(() => {
        setToastVisible(false);
        window.setTimeout(() => {
          setToastNotification((current) => (current && current.id === latest.id ? null : current));
        }, 400);
      }, 5000);
    }

    previousNotificationIdsRef.current = currentIds;
  }, [notifications]);

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

  const handleToggleNotifications = useCallback(() => {
    setNotificationsOpen((prev) => {
      const next = !prev;
      if (!prev && next) {
        setNotifications((current) => {
          if (!current.some((n) => !n.read)) {
            return current;
          }

          window
            .fetch('http://localhost:5000/api/notifications/mark-read-all', {
              method: 'POST',
            })
            .catch((error) => {
              console.error('Failed to mark all notifications as read', error);
            });

          return current.map((n) => ({ ...n, read: true }));
        });
      }
      return next;
    });
  }, []);

  const handleNotificationClick = useCallback(
    (item: NotificationItem) => {
      setNotificationsOpen(false);

      setNotifications((current) => current.map((n) => (n.id === item.id ? { ...n, read: true } : n)));

      setToastNotification((current) => (current && current.id === item.id ? null : current));
      setToastVisible(false);

      window
        .fetch(`http://localhost:5000/api/notifications/${item.id}/read`, {
          method: 'PATCH',
        })
        .catch((error) => {
          console.error('Failed to mark notification as read', error);
        });

      if (item.projectId) {
        router.push(`/admin/projects?highlightProjectId=${item.projectId}`);
      }
    },
    [router],
  );

  if (!isAuthorized && !isLoggingOut) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-amber-50 via-white to-white">
      {logoutProgress > 0 && (
        <div className="fixed inset-x-0 top-0 z-50">
          <div
            className="h-1 w-full origin-left bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 transition-[transform,width] duration-500"
            style={{ width: `${logoutProgress}%` }}
          />
        </div>
      )}
      <Sidebar items={adminNavigation} onLogout={handleLogout} logoutDisabled={isLoggingOut} />

      <main className="flex-1">
        <HeaderBar
          onToggleNotifications={handleToggleNotifications}
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
        onClear={() => setNotifications([])}
        onNotificationClick={handleNotificationClick}
      />

      {toastNotification && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex max-w-sm flex-col gap-2 text-sm text-gray-900">
          <div
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border border-amber-200 bg-white/95 px-4 py-3 shadow-lg shadow-amber-100 transition-all duration-400 ease-out ${
              toastVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
          >
            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <span className="text-xs font-bold">!</span>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                {toastNotification.title}
              </p>
              <p className="text-xs text-gray-800">{toastNotification.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
