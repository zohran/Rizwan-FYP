'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Button, notification } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { useSocket } from '@/hooks/use-socket';

type IncomingAlert = {
  id: string;
  type: string;
  message: string;
  sessionId?: string;
  severity?: string;
};

const TITLES: Record<string, string> = {
  blocked_login: 'Blocked Login',
  unauthorized_access: 'Unauthorized Access',
  suspicious_session: 'Suspicious Session',
  network_violation: 'Network Policy Violation',
};

export function AdminAlertToasts() {
  const pathname = usePathname();
  const socket = useSocket();
  const busy = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!socket || pathname === '/admin/login') return;

    const handler = (payload: IncomingAlert) => {
      const key = `alert-${payload.id}`;
      const sessionId = payload.sessionId ? String(payload.sessionId) : '';

      const terminate = async () => {
        if (!sessionId || busy.current.has(sessionId)) return;
        busy.current.add(sessionId);
        try {
          const res = await fetch('/api/sessions/terminate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            notification.destroy(key);
            notification.success({ message: 'Session terminated', placement: 'bottomRight' });
          } else {
            notification.error({
              message: 'Could not terminate session',
              description: data.error ?? 'Session may already have ended.',
              placement: 'bottomRight',
            });
          }
        } finally {
          busy.current.delete(sessionId);
        }
      };

      notification.warning({
        key,
        message: TITLES[payload.type] ?? payload.type,
        description: payload.message,
        icon: <WarningOutlined style={{ color: payload.severity === 'critical' ? '#e53e3e' : '#d69e2e' }} />,
        placement: 'bottomRight',
        duration: sessionId ? 12 : 8,
        btn: sessionId ? (
          <Button danger size="small" onClick={terminate}>
            Terminate Session
          </Button>
        ) : undefined,
      });
    };

    socket.on('alert_create', handler);
    return () => {
      socket.off('alert_create', handler);
    };
  }, [socket, pathname]);

  return null;
}
