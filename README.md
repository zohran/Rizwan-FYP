# Intelligent Client-Server Session Management System

Full-stack session management with RBAC, real-time monitoring, billing, and alerts.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT in HTTP-only cookies
- **Real-time**: Socket.io (authenticated, role-based) + 5s polling fallback
- **Validation**: Zod, React Hook Form

## Prerequisites

- Node.js >= 20.9.0
- MongoDB

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   ```bash
   cp .env.local.example .env.local
   ```
   Set `MONGODB_URI` and `JWT_SECRET`.

3. **Seed database** (dev only)
   ```bash
   curl -X POST http://localhost:3000/api/seed
   ```
   Creates:
   - Admin: `admin` / `admin123`
   - Client: `client` / `client123`
   - Default billing rate: $1/min

4. **Run**
   ```bash
   npm run dev
   ```
   Opens http://localhost:3000. Uses custom server for Socket.io.

## Project Structure

```
app/
  (client)/          # Client routes
    login/
    page.tsx         # Client dashboard
  (admin)/           # Admin routes
    login/
    page.tsx         # Admin dashboard
    billing/
    alerts/
    logs/
  api/               # API routes
    auth/
    sessions/
    admin/
    billing/
    alerts/
    logs/
    seed/
lib/                 # Utilities
models/              # Mongoose schemas
middleware.ts        # RBAC, security headers
server.ts            # Custom server (Next + Socket.io)
```

## Features

- **RBAC**: Admin and client roles, route protection
- **Auth**: JWT, 15-min expiry, block after 3 failed attempts (15 min)
- **Sessions**: 30/60/90 min, webcam capture, countdown, auto-end
- **Admin**: Real-time dashboard, terminate sessions, billing, alerts, logs
- **Billing**: Configurable rate, earnings summary, date filter
- **Alerts**: Blocked logins, mark read
- **Logs**: Login/logout, billing, captured image, pagination
- **Socket.io**: Authenticated JWT, role-based rooms. Events:
  - `session_start` (admins), `session_terminate` (client), `billing_update` (admins), `alert_create` (admins)

## Production

```bash
npm run build
npm run start
```

**Note**: Custom server (Socket.io) does not deploy to Vercel. Use a Node host (Railway, Render, etc.) or switch to polling-only.
