import { connectDB } from '@/lib/mongodb';
import { Alert } from '@/models';
import { emitToAdmins, SOCKET_EVENTS } from '@/lib/socket';
import type { Types } from 'mongoose';

export const ALERT_TYPES = {
  BLOCKED_LOGIN: 'blocked_login',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  SUSPICIOUS_SESSION: 'suspicious_session',
} as const;

/**
 * Create an alert in the database and emit to admins via Socket.io.
 * Use for: blocked login, unauthorized access, suspicious session activity.
 */
export async function createAlert(params: {
  type: string;
  message: string;
  userId?: Types.ObjectId | string;
}) {
  await connectDB();
  const alert = await Alert.create({
    type: params.type,
    message: params.message,
    userId: params.userId,
  });
  emitToAdmins(SOCKET_EVENTS.ALERT_CREATE, {
    id: alert._id,
    type: alert.type,
    message: alert.message,
    createdAt: alert.createdAt,
    isRead: false,
  });
  return alert;
}
