import {
  LayoutGrid,
  FolderKanban,
  Users,
  CheckCircle,
  BarChart3,
  Megaphone,
} from 'lucide-react';

export const projectLeaderNavigation = [
  {
    name: 'Dashboard',
    description: 'Overview of ongoing projects and quick stats.',
    icon: LayoutGrid,
    href: '/project-leader/dashboard',
  },
  {
    name: 'Projects',
    description: 'Create, update, and manage extension projects and activities.',
    icon: FolderKanban,
    href: '/project-leader/projects',
  },
  {
    name: 'Participants',
    description: 'View beneficiary rosters and manage communications.',
    icon: Users,
    href: '/project-leader/participants',
  },
  {
    name: 'Approval',
    description: 'Approve or reject new beneficiary registrations.',
    icon: CheckCircle,
    href: '/project-leader/approval',
  },
  {
    name: 'Analytics',
    description: 'Attendance, engagement, and satisfaction analytics.',
    icon: BarChart3,
    href: '/project-leader/analytics',
  },
  {
    name: 'Announcements',
    description: 'Create reminders, email blasts, and announcements.',
    icon: Megaphone,
    href: '/project-leader/announcements',
  },
] as const;

export type ProjectLeaderNavItem = (typeof projectLeaderNavigation)[number];
