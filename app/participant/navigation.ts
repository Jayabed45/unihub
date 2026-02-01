import { LayoutGrid, FolderKanban } from 'lucide-react';

export const participantNavigation = [
  {
    name: 'Feeds',
    description: 'Announcements and featured extension opportunities.',
    icon: LayoutGrid,
    href: '/participant/Feeds',
  },
  {
    name: 'Activities',
    description: 'Browse and manage the activities you can join under projects.',
    icon: FolderKanban,
    href: '/participant/activities',
  },
] as const;

export type ParticipantNavItem = (typeof participantNavigation)[number];
