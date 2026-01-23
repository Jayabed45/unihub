'use client';

import { Building2 } from 'lucide-react';

export default function ProjectLeaderDashboard() {
  return (
    <section className="flex min-h-[40vh] w-full items-center justify-center rounded-3xl border border-dashed border-yellow-200 bg-white/90 p-12 text-center shadow-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 animate-pulse rounded-2xl bg-amber-100/40" />
          <Building2 className="relative h-16 w-16 text-amber-500 animate-[float_2.8s_ease-in-out_infinite]" />
          <span className="absolute bottom-2 h-1 w-16 animate-[pulse_2.8s_ease-in-out_infinite] rounded-full bg-amber-200" />
        </div>
        <div className="space-y-2">
          <p className="text-3xl font-semibold text-gray-800">Dashboard under construction</p>
          <p className="text-sm text-gray-500">We&apos;re building this experience. Please check back soon.</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes pulse {
          0%, 100% { transform: scaleX(0.85); opacity: 0.6; }
          50% { transform: scaleX(1); opacity: 1; }
        }
      `}</style>
    </section>
  );
}
