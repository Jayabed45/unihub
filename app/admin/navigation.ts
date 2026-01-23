import { LayoutGrid, FolderKanban, Users, BarChart3 } from 'lucide-react';

export const adminNavigation = [
  {
    name: 'Dashboard',
    description: 'Platform health snapshot and quick actions.',
    icon: LayoutGrid,
    href: '/admin/dashboard',
  },
  {
    name: 'All projects',
    description: 'Review and manage every registered project.',
    icon: FolderKanban,
    href: '/admin/projects',
  },
  {
    name: 'All users',
    description: 'Oversee user accounts and roles.',
    icon: Users,
    href: '/admin/users',
  },
  {
    name: 'Statistics',
    description: 'Analytics across projects and participants.',
    icon: BarChart3,
    href: '/admin/statistics',
  },
] as const;

export type AdminNavItem = (typeof adminNavigation)[number];
