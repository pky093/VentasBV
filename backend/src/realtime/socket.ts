import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { createUserClient } from '../lib/supabase.js';

let io: SocketServer;

export function initSocket(server: HttpServer) {
  io = new SocketServer(server, {
    cors: {
      origin: env.WEB_URL,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      
      const supabase = createUserClient(token);
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return next(new Error('Authentication error'));
      
      socket.data.user = data.user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug(`Client connected: ${socket.id}`);
    
    socket.on('join-tenant', (tenantId: string) => {
      socket.join(`tenant:${tenantId}`);
      logger.debug(`Client ${socket.id} joined tenant ${tenantId}`);
    });
    
    socket.on('leave-tenant', (tenantId: string) => {
      socket.leave(`tenant:${tenantId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function emitToTenant(tenantId: string, event: string, payload: any) {
  if (io) {
    io.to(`tenant:${tenantId}`).emit(event, payload);
  }
}
