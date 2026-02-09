import { LayoutGrid, FolderKanban, Users } from 'lucide-react';

export const adminNavigation = [
  {
    name: 'Dashboard',
    description: 'Platform health snapshot and quick actions.',
    icon: LayoutGrid,
    href: '/admin/dashboard',
  },
  {
    name: 'All projects',
    description: 'Review and manage registered projects.',
    icon: FolderKanban,
    href: '/admin/projects',
  },
  {
    name: 'Users',
    description: 'Oversee user accounts and roles.',
    icon: Users,
    href: '/admin/users',
  },
] as const;

export type AdminNavItem = (typeof adminNavigation)[number];
