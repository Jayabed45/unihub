'use strict';

import type { Server, Socket } from 'socket.io';

let ioInstance: Server | null = null;

// Very simple in-memory presence tracking for connected users
const onlineUsers = new Set<string>();

export const initNotificationSocket = (io: Server) => {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    socket.on('notifications:subscribe', (payload: any) => {
      const role = typeof payload?.role === 'string' ? payload.role : undefined;
      const userId = typeof payload?.userId === 'string' ? payload.userId : undefined;

      if (userId) {
        socket.join(`user:${userId}`);
        socket.data.userId = userId;
        onlineUsers.add(userId);

        // Notify project leaders that this user is now online
        if (ioInstance) {
          ioInstance.to('role:leader').emit('presence:update', {
            userId,
            online: true,
          });
        }
      }

      if (role === 'Administrator') {
        socket.join('role:admin');
      }

      if (role === 'Participant') {
        socket.join('role:participant');
      }

      if (role === 'Project Leader') {
        socket.join('role:leader');
      }
    });

    socket.on('disconnect', () => {
      const userId = socket.data?.userId as string | undefined;
      if (!userId) {
        return;
      }

      if (onlineUsers.has(userId)) {
        onlineUsers.delete(userId);
        if (ioInstance) {
          ioInstance.to('role:leader').emit('presence:update', {
            userId,
            online: false,
          });
        }
      }
    });
  });
};

export const notifyAdminNewNotifications = () => {
  if (!ioInstance) return;
  ioInstance.to('role:admin').emit('notifications:refresh');
};

export const notifyUserNewNotifications = (userId: string | undefined | null) => {
  if (!ioInstance) return;
  if (!userId) return;
  ioInstance.to(`user:${userId}`).emit('notifications:refresh');
};

export const notifyParticipantsProjectsRefresh = () => {
  if (!ioInstance) return;
  ioInstance.to('role:participant').emit('notifications:refresh');
};

export const getPresenceForUserIds = (userIds: string[]): Record<string, boolean> => {
  const result: Record<string, boolean> = {};
  for (const id of userIds) {
    if (!id) continue;
    result[id] = onlineUsers.has(id);
  }
  return result;
};
