/**
 * Next.js + Socket.io custom server
 *
 * Integrates Socket.io with Next.js for real-time events:
 * - session_start (admins)
 * - session_terminate (specific client)
 * - billing_update (admins)
 * - alert_create (admins)
 *
 * Connections require JWT in session_token cookie.
 * Role-based rooms: user:{userId} for clients, 'admin' for admins.
 */
import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT ?? '3000', 10);

const app = next({ dev, port });
const handler = app.getRequestHandler();

const JWT_SECRET = process.env.JWT_SECRET ?? 'fallback-secret-change-in-production';
const VALID_ROLES = ['admin', 'client'] as const;

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: { origin: true, credentials: true },
  });

  // Authenticated connection: require valid JWT from auth cookie
  const cookieName = process.env.NODE_ENV === 'production' ? '__Host-session_token' : 'session_token';
  io.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie ?? '';
    const cookies = parse(cookieHeader);
    const token = cookies[cookieName];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
      if (!VALID_ROLES.includes(decoded.role as (typeof VALID_ROLES)[number])) {
        return next(new Error('Invalid role'));
      }
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // Role-based room assignment
  io.on('connection', (socket) => {
    const { userId, role } = socket.data;

    socket.join(`user:${userId}`);
    if (role === 'admin') {
      socket.join('admin');
    }
  });

  // Expose for API routes (lib/socket.ts)
  (global as unknown as { io: Server }).io = io;

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> Socket.io at /api/socket (authenticated, role-based)`);
  });
});
