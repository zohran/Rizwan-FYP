/**
 * Socket.io helpers for API routes.
 * Server initializes in server.ts and sets global.io.
 *
 * Role-based emission:
 * - emitToUser(userId) → clients in room user:{userId}
 * - emitToAdmins()     → admins in room 'admin'
 */
import { Server } from 'socket.io';

declare global {
  // eslint-disable-next-line no-var
  var io: Server | undefined;
}

export function getIO(): Server | undefined {
  return typeof global !== 'undefined' ? global.io : undefined;
}

/** Emit to a specific user (client sessions) */
export function emitToUser(userId: string, event: string, data: unknown) {
  const io = getIO();
  if (io) io.to(`user:${userId}`).emit(event, data);
}

/** Emit to all connected admins */
export function emitToAdmins(event: string, data: unknown) {
  const io = getIO();
  if (io) io.to('admin').emit(event, data);
}

export const SOCKET_EVENTS = {
  SESSION_START: 'session_start',
  SESSION_TERMINATE: 'session_terminate',
  BILLING_UPDATE: 'billing_update',
  ALERT_CREATE: 'alert_create',
} as const;
