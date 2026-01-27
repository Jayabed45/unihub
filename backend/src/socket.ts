import type http from 'http';
import { Server } from 'socket.io';

let io: Server | null = null;

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  console.log('Socket is running');

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};
