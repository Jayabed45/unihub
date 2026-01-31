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
  email?: string;
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileRoleName, setProfileRoleName] = useState('');

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

  const handleOpenProfile = useCallback(async () => {
    try {
      setProfileError(null);
      setProfileLoading(true);

      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setProfileError('Your session information is missing. Please sign out and sign in again.');
        setProfileLoading(false);
        setProfileOpen(true);
        return;
      }

      const parsed = JSON.parse(stored) as StoredUser | null;
      if (!parsed?.id) {
        setProfileError('Your session information is incomplete. Please sign out and sign in again.');
        setProfileLoading(false);
        setProfileOpen(true);
        return;
      }

      const res = await fetch(`http://localhost:5000/api/auth/users/${encodeURIComponent(parsed.id)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setProfileError(data.message || 'Failed to load profile. Please try again.');
        setProfileLoading(false);
        setProfileOpen(true);
        return;
      }

      const data = (await res.json()) as {
        username?: string;
        email?: string;
        role?: { name?: string } | string;
      };

      setProfileUsername((data.username || '').trim());
      setProfileEmail((data.email || '').trim());
      const roleName = typeof data.role === 'string' ? data.role : data.role?.name;
      setProfileRoleName(roleName || 'Administrator');
      setProfileOpen(true);
    } catch (error) {
      console.error('Failed to load admin profile', error);
      setProfileError('Failed to load profile. Please check your connection and try again.');
      setProfileOpen(true);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const handleSaveProfile = useCallback(async () => {
    try {
      setProfileError(null);
      setProfileSaving(true);

      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setProfileError('Your session information is missing. Please sign out and sign in again.');
        setProfileSaving(false);
        return;
      }

      const parsed = JSON.parse(stored) as StoredUser | null;
      if (!parsed?.id) {
        setProfileError('Your session information is incomplete. Please sign out and sign in again.');
        setProfileSaving(false);
        return;
      }

      const payload = {
        username: profileUsername.trim(),
        email: profileEmail.trim(),
      };

      const res = await fetch(`http://localhost:5000/api/auth/users/${encodeURIComponent(parsed.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setProfileError(data.message || 'Failed to save profile. Please try again.');
        setProfileSaving(false);
        return;
      }

      setProfileOpen(false);
    } catch (error) {
      console.error('Failed to save admin profile', error);
      setProfileError('Failed to save profile. Please check your connection and try again.');
    } finally {
      setProfileSaving(false);
    }
  }, [profileUsername, profileEmail]);

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

        const mapped: NotificationItem[] = data
          .map((item) => ({
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
          }))
          .filter((item) =>
            !(
              item.title === 'Project approved' ||
              item.title === 'Activity join' ||
              item.title === 'Join request approved' ||
              item.title === 'Activity attendance updated' ||
              item.title === 'Activity Starting Soon' ||
              item.title === 'Activity Started' ||
              item.title === 'Activity Ending Soon' ||
              item.title === 'Activity Ended' ||
              item.title === 'Activity Evaluation' ||
              (item.message && item.message.includes('Your attendance for activity'))
            ),
          );

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

    // Identify the currently authenticated admin user for online/offline tracking
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredUser | null;
        if (parsed?.id) {
          socket.emit('identify', { userId: parsed.id });
        }
      }
    } catch {
      // best-effort only; online indicator will just be missing if this fails
    }

    socket.on('notification:new', (payload: NotificationItem) => {
      if (
        payload.title === 'Project approved' ||
        payload.title === 'Activity join' ||
        payload.title === 'Join request approved' ||
        payload.title === 'Activity attendance updated' ||
        payload.title === 'Activity Starting Soon' ||
        payload.title === 'Activity Started' ||
        payload.title === 'Activity Ending Soon' ||
        payload.title === 'Activity Ended' ||
        payload.title === 'Activity Evaluation' ||
        (payload.message && payload.message.includes('Your attendance for activity'))
      ) {
        return;
      }

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
    const newOnes = notifications.filter(
      (n) => !previousIds.includes(n.id) && n.title !== 'Project approved',
    );

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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-white to-white">
      {logoutProgress > 0 && (
        <div className="fixed inset-x-0 top-0 z-50">
          <div
            className="h-1 w-full origin-left bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 transition-[transform,width] duration-500"
            style={{ width: `${logoutProgress}%` }}
          />
        </div>
      )}

      {profileOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-amber-100 bg-white p-6 text-sm text-gray-800 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">My profile</p>
                <h3 className="mt-1 text-base font-semibold text-gray-900">Account details</h3>
                {profileRoleName && (
                  <p className="mt-0.5 text-[11px] text-gray-500">Role: {profileRoleName}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
              >
                Close
              </button>
            </div>

            {profileLoading ? (
              <p className="text-xs text-gray-600">Loading profile…</p>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label htmlFor="admin-profile-username" className="font-medium text-gray-800">
                    Username
                  </label>
                  <input
                    id="admin-profile-username"
                    type="text"
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] text-gray-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    placeholder="Enter your username"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="admin-profile-email" className="font-medium text-gray-800">
                    Email
                  </label>
                  <input
                    id="admin-profile-email"
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] text-gray-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    placeholder="Enter your email address"
                  />
                </div>

                {profileError && (
                  <p className="mt-1 text-[11px] font-medium text-red-600">{profileError}</p>
                )}

                <div className="mt-3 flex items-center justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setProfileOpen(false)}
                    className="rounded-full border border-amber-200 px-3 py-1 font-semibold text-amber-700 hover:bg-amber-50"
                    disabled={profileSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="rounded-full bg-amber-500 px-4 py-1.5 font-semibold text-white shadow hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={profileSaving}
                  >
                    {profileSaving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="sticky top-0 h-screen">
        <Sidebar items={adminNavigation} onLogout={handleLogout} logoutDisabled={isLoggingOut} />
      </div>

      <main className="flex-1 overflow-y-auto">
        <HeaderBar
          onToggleNotifications={() => setNotificationsOpen((prev) => !prev)}
          notificationsOpen={notificationsOpen}
          notificationsCount={notifications.filter((item) => !item.read).length}
          onOpenProfile={handleOpenProfile}
        />
        <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
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
