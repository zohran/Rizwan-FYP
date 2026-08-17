# SessionMgmt — Project Context

Living context for this FYP. Read this file first in future sessions, then append what you change.

**Last updated:** 2026-08-17

---

## What this project is

Intelligent Client-Server Session Management System (FYP). Cyber-cafe / lab-style workstation:

- Clients log in, grant webcam, pick 30/60/90 min, run a timed billed session
- Admins monitor live sessions, terminate them, manage billing, alerts, and logs
- Real-time via Socket.io (JWT cookie, role rooms) with 5s polling fallback on the admin dashboard

**Not a real attack platform.** Network “violations” are simulated policy breaches for demo/FYP (torrent UI, VPN UI, port-scan UI, etc.). No exploits, payloads, or real scanning.

---

## Tech stack

| Layer | Choice |
|---|---|
| App | Next.js 16 App Router, React 19, TypeScript |
| UI | Ant Design 6, Tailwind 4, navy `#111c44` + teal `#4fd1c5` |
| API | Next.js Route Handlers under `app/api/` |
| DB | MongoDB + Mongoose 9 |
| Auth | JWT in HTTP-only cookie (`session_token` / `__Host-session_token` in prod), 15 min expiry |
| Realtime | Socket.io on custom server `server.ts` (`npm run dev` / `start` = `tsx server.ts`) |
| Validation | Zod |

Node `>= 20.9.0`. Seed: `POST /api/seed` → admin/`admin123`, client/`client123`, $1/min rate.

---

## Directory map

```
app/
  page.tsx                 Marketing home
  layout.tsx               AntdRegistry + ThemeProvider
  theme-provider.tsx       Ant Design tokens
  client/
    layout.tsx             Client wrapper
    login/page.tsx         Client login + webcam capture
    page.tsx               Redirect → /client/dashboard
    dashboard/page.tsx     Duration pick, timer, end session
    billing/page.tsx       Client billing + payment notifications
    network/page.tsx       Simulated network policy screens (NEW)
  admin/
    layout.tsx             Sider nav + global alert toasts (NEW)
    login/page.tsx         Admin login
    page.tsx               Redirect → /admin/dashboard
    dashboard/page.tsx     Live sessions + Terminate
    billing/page.tsx       Rates, earnings, payment notify
    alerts/page.tsx        Security alerts + terminate on network violations
    logs/page.tsx          Session history
  api/                     See API map below
components/
  session-timer.tsx
  client-session-guard.tsx Kicks client on session_terminate (NEW)
hooks/use-socket.ts        socket.io-client, path /api/socket, credentials
lib/                       auth, db, socket emit, alerts, billing, csrf, validation
models/                    User, Session, Billing, BillingRate, Alert, Log, PaymentNotification
server.ts                  HTTP + Socket.io, JWT handshake, rooms
middleware.ts              RBAC on pages (API matcher excluded), security headers
docs/PROJECT_CONTEXT.md    This file
```

---

## Auth & RBAC

- Cookie: `session_token` (dev) / `__Host-session_token` (prod). HttpOnly, SameSite=strict, 15 min.
- JWT payload: `{ userId, role }` where role is only `admin` | `client`.
- Page protection: `middleware.ts` (does **not** run on `/api/*`).
- API protection: `getAuth()` / `requireAdmin()` in `lib/get-auth.ts`.
- Failed admin API access → `unauthorized_access` alert.
- Login lockout: 3 failures → 15 min block (`lib/constants.ts`).
- Client login requires webcam; image stored as base64 on Session / Log.

Helpers: `lib/auth.ts`, `lib/csrf.ts` (origin check on some admin POSTs like terminate). Client POSTs (start/end session) currently skip CSRF.

---

## Data models (Mongo)

**User** — username, password (select:false), role, isBlocked, failedAttempts, blockUntil

**Session**
- userId, machineId, imageUrl (base64 data URL)
- startTime, endTime, selectedDuration (30/60/90), remainingTime (seconds at create)
- status: `active` | `ended` | `terminated`
- billingAmount
- **networkViolations** (number, default 0)
- **lastViolationAt**, **lastViolationRule**

Remaining time is **computed** from `endTime` on read; client also ticks locally.

**Alert**
- type, userId?, message, isRead
- **sessionId?**, **severity?**, **ruleId?** (for network violations)

Alert types (`lib/create-alert.ts` `ALERT_TYPES`):
- `blocked_login`
- `unauthorized_access`
- `suspicious_session` (second session attempt, or end < 2 min)
- **`network_violation`** (client simulated policy break)

**Billing / BillingRate / PaymentNotification / Log** — as before. Log `eventType`: `session_ended` | `session_terminated` | `session_expired`.

---

## Socket.io

Path: `/api/socket`. Handshake requires JWT cookie. Rooms: `user:{userId}`, plus `admin` if role is admin.

Events (`lib/socket.ts` `SOCKET_EVENTS`):

| Event | To | When |
|---|---|---|
| `session_start` | admins | Client starts session |
| `session_terminate` | that client | Admin terminates |
| `billing_update` | admins | Session billed/ended/terminated |
| `alert_create` | admins | Any createAlert() |
| `payment_notification` | that client | Admin sends pay notice |

Emit helpers: `emitToUser`, `emitToAdmins`. `global.io` set in `server.ts`.

`alert_create` payload includes `id`, `type`, `message`, `createdAt`, `isRead`, and for network violations also `sessionId`, `severity`, `ruleId`.

---

## API map

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/api/auth/client-login` | public | Client login |
| POST | `/api/auth/admin-login` | public | Admin login |
| POST | `/api/auth/logout` | auth | Clear cookie |
| POST | `/api/auth/save-login-image` | client | Store webcam still |
| POST | `/api/sessions/start` | client | Start 30/60/90 session |
| GET | `/api/sessions/active` | client | Current session or null (auto-expires) |
| POST | `/api/sessions/end` | client | Client ends session |
| POST | `/api/sessions/terminate` | admin | Force-end + bill + emit terminate |
| GET | `/api/admin/sessions` | admin | Active sessions + live billing + violation counts |
| GET/PATCH | `/api/alerts` | admin | List / mark read |
| GET | `/api/logs` | admin | Paginated logs |
| GET/PUT | `/api/billing/*` | admin | List, summary, rate |
| GET | `/api/client/billing` | client | Own billing |
| GET/PATCH | `/api/client/notifications` | client | Payment notices |
| POST | `/api/admin/send-payment-notification` | admin | Notify client |
| GET | `/api/admin/users` | admin | User list for filters |
| POST | `/api/client/network-violation` | client | Report simulated policy break (NEW) |
| POST | `/api/seed` | dev | Seed users + rate |
| GET | `/api/health` | public | Health |

---

## UI conventions

- Navy `#111c44`, teal primary `#4fd1c5`, page bg `#f7f9fc`
- Client session screens are full-viewport navy; billing is light
- Admin: fixed 240px sider, content padding 32
- Fetch + `useSocket` for live updates; admin dashboard also polls every 5s
- Prefer `fetch` to `lib/api-client.ts` (axios helper exists but pages use fetch)

---

## Network policy feature (NEW)

**Intent:** Client opens workstation “Network Access” screens that simulate breaking lab/cafe network rules. Server records an alert. Admin is notified in real time and can terminate that session.

**Client** `/client/network` (active session required)
- Allowed destinations: no alert (Wikipedia, campus portal, news)
- Restricted simulations: P2P/torrent, VPN/proxy, blocked site, port scan, remote desktop, covert DNS
- Each restricted action POSTs `ruleId` to `/api/client/network-violation`
- Client is warned that admin was notified; session stays up until admin terminates or timer ends

**Server**
- Validates `ruleId` against `lib/network-rules.ts` (restricted only)
- Requires active session
- Dedupes same rule on same session for 15s
- Increments `Session.networkViolations`, sets lastViolation*
- `createAlert({ type: network_violation, sessionId, severity, ruleId })`

**Admin**
- Global toast in admin layout with **Terminate Session** when `sessionId` present
- Alerts page: type label + Terminate if session still active
- Dashboard: policy-violation tag + Terminate (existing)

Shared catalog: `lib/network-rules.ts` (imported by API and client UI).

---

## Conventions for future work

1. New alert types: add to `ALERT_TYPES`, admin `ALERT_TYPE_LABELS` / colors, and this file.
2. New socket events: add to `SOCKET_EVENTS` and `server.ts` comment.
3. Client kick-on-terminate lives in `components/client-session-guard.tsx` (all `/client/*` except login).
4. Do not add real network attacks, scanners, or exploit PoCs. Simulations only.
5. After any feature, append a dated note under **Change log** below.

---

## Change log

### 2026-08-17 — Initial context capture

Mapped the whole repo before network-policy work: RBAC, sessions, billing, alerts, logs, Socket.io rooms, existing terminate flow, client dashboard/billing, admin dashboard/alerts.

### 2026-08-17 — Network policy violation screens

Simulated lab-gateway screens on the client. Breaking a restricted rule creates a `network_violation` alert; admin is notified in real time and can terminate that session.

**Demo flow**
1. Client login → start a 30/60/90 session on `/client/dashboard`
2. Open **Network Access** (`/client/network`)
3. Allow-listed cards (campus portal, Wikipedia, news) do not alert
4. Restricted cards (torrent, VPN, blocked site, port scan, remote desktop, covert DNS) run a simulated screen then `POST /api/client/network-violation` with `ruleId`
5. Admin gets a toast anywhere in `/admin/*` with **Terminate Session**; Alerts page has the same button; Dashboard shows a magenta violation tag
6. Terminate uses existing `POST /api/sessions/terminate` → client guard logs out and sends them to `/client/login`

**Files added**
- `lib/network-rules.ts` — catalog of allowed vs restricted destinations
- `app/api/client/network-violation/route.ts` — client-only, active session required, 15s same-rule dedupe
- `app/client/network/page.tsx` — hub + simulation modals
- `components/client-session-guard.tsx` — `session_terminate` → logout + login
- `components/admin-alert-toasts.tsx` — global admin toast + terminate

**Files updated**
- `models/Alert.ts` — `sessionId`, `severity`, `ruleId`
- `models/Session.ts` — `networkViolations`, `lastViolationAt`, `lastViolationRule`
- `lib/create-alert.ts` — `NETWORK_VIOLATION` + extra payload fields
- `lib/validation.ts` — `networkViolationSchema`
- `app/api/admin/sessions/route.ts` — returns violation counts
- `app/client/layout.tsx` — wraps `ClientSessionGuard`
- `app/client/dashboard/page.tsx` — Network Access button; terminate handled by guard
- `app/admin/layout.tsx` — mounts `AdminAlertToasts`
- `app/admin/alerts/page.tsx` — new type, severity tag, Terminate Session
- `app/admin/dashboard/page.tsx` — Policy column, violation statistic, listens to `alert_create`

**Restart `npm run dev` after this change** so Mongoose picks up the new Session/Alert schema fields (models are cached on first load).

