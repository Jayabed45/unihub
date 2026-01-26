import { LayoutGrid, FolderKanban } from 'lucide-react';

export const participantNavigation = [
  {
    name: 'Feeds',
    description: 'Announcements and updates for your projects.',
    icon: LayoutGrid,
    href: '/participant/Feeds',
  },
  {
    name: 'Projects',
    description: 'Projects where you are a participant.',
    icon: FolderKanban,
    href: '/participant/projects',
  },
] as const;

export type ParticipantNavItem = (typeof participantNavigation)[number];
