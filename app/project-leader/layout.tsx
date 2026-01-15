'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Sidebar from './components/Sidebar';
import { projectLeaderNavigation } from './navigation';

const STORAGE_KEY = 'unihub-auth';

interface StoredUser {
  id: string;
  role: string;
  token: string;
}

export default function ProjectLeaderLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

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
    } catch (error) {
      console.error('Failed to verify project leader access', error);
      window.localStorage.removeItem(STORAGE_KEY);
      router.replace('/');
    }
  }, [router]);

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-yellow-50 via-white to-white">
      <Sidebar items={projectLeaderNavigation} />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
