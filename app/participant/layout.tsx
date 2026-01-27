'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Sidebar from './components/Sidebar';
import HeaderBar from './components/HeaderBar';
import { participantNavigation } from './navigation';

const STORAGE_KEY = 'unihub-auth';

interface StoredUser {
  id: string;
  role: string;
  token: string;
}

export default function ParticipantLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutProgress, setLogoutProgress] = useState(0);

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
      if (!parsed || parsed.role !== 'Participant') {
        window.localStorage.removeItem(STORAGE_KEY);
        router.replace('/');
        return;
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error('Failed to verify participant access', error);
      window.localStorage.removeItem(STORAGE_KEY);
      router.replace('/');
    }
  }, [router]);

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
    <div className="flex min-h-screen bg-gradient-to-br from-amber-50 via-white to-white">
      {logoutProgress > 0 && (
        <div className="fixed inset-x-0 top-0 z-50">
          <div
            className="h-1 w-full origin-left bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 transition-[transform,width] duration-500"
            style={{ width: `${logoutProgress}%` }}
          />
        </div>
      )}

      <Sidebar items={participantNavigation} onLogout={handleLogout} logoutDisabled={isLoggingOut} />

      <main className="flex-1">
        <HeaderBar />
        <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
      </main>
    </div>
  );
}
