'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';

const STORAGE_KEY = 'unihub-auth';
const ROLE_ROUTES: Record<string, string> = {
  Administrator: '/admin/dashboard',
  'Project Leader': '/project-leader/dashboard',
  Participant: '/participant/dashboard',
};

interface User {
  id: string;
  role: string;
  token: string;
}

export default function HomePage() {
  const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as Partial<User> | null;
      if (parsed && parsed.id && parsed.role && parsed.token) {
        setUser(parsed as User);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (restoreError) {
      console.error('Failed to restore authentication state', restoreError);
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsRestoring(false);
    }
  }, []);

  useEffect(() => {
    if (isRestoring || !user) {
      return;
    }

    const targetRoute = ROLE_ROUTES[user.role];

    if (targetRoute) {
      router.replace(targetRoute);
    } else {
      console.warn('Unknown role encountered during redirect:', user.role);
      setUser(null);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [user, isRestoring, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Something went wrong');
      }

            const data = await res.json();
      console.log('Login successful:', data);
      // NOTE: The backend currently returns a role name. 
      // In a real app, you might get a role ID and fetch details.
      const authenticatedUser = { id: data.user.id, role: data.user.role, token: data.token } as User;
      setUser(authenticatedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));
    } catch (err: any) {
      setError(err.message);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  };

  if (isRestoring || user) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <div className="text-center">
          <div className="inline-block p-3 bg-yellow-400 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 14l9-5-9-5-9 5 9 5z" />
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-9.998 12.078 12.078 0 01.665-6.479L12 14z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-9.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222 4 2.222V20M12 14L8 12m4 2l4-2" />
            </svg>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Welcome to UniHub</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to access your account</p>
        </div>
                {error && <p className="text-red-500 text-center">{error}</p>}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700 sr-only"
            >
              Email
            </label>
                        <div className="relative">
              <Mail className="absolute w-5 h-5 text-gray-400 left-3 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-2 pl-10 pr-4 text-gray-900 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Email address"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700 sr-only"
            >
              Password
            </label>
                        <div className="relative">
              <Lock className="absolute w-5 h-5 text-gray-400 left-3 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-2 pl-10 pr-4 text-gray-900 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Password"
              />
            </div>
          </div>
          <div>
                                    <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 font-semibold text-white bg-yellow-500 rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-300"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
          <div className="text-sm text-center">
            <a href="#" className="font-medium text-yellow-600 hover:text-yellow-500">
              Don't have an account? Register
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
